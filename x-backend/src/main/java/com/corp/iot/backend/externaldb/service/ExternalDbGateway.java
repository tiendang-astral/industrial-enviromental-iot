package com.corp.iot.backend.externaldb.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.PreviewColumn;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.PreviewResponse;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.SchemaColumn;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.SchemaTable;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.TestConnectionResponse;
import com.corp.iot.backend.externalsource.dto.ExternalSourceConnectionConfig;
import com.corp.iot.backend.externalsource.dto.ExternalSourceCredential;
import com.corp.iot.backend.externalsourcejob.util.SqlQueryValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Kết nối database ngoài bằng JDBC thuần cho 3 việc đồng bộ theo request: thử kết nối, đọc cấu
// trúc bảng, chạy thử truy vấn. x-ingestion-service có lớp tương đương cho luồng chạy nền —
// chấp nhận trùng, mỗi service độc lập hoàn toàn (CONVENTIONS.md § Backend).
//
// Mọi kết nối đều đặt READ ONLY: driver Postgres gửi default_transaction_read_only nên chính
// máy chủ bên kia từ chối mọi lệnh ghi, không phụ thuộc việc rà chuỗi SQL.
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalDbGateway {

    private static final Instant PREVIEW_CURSOR = Instant.EPOCH;

    private final SqlQueryValidator sqlQueryValidator;

    @Value("${app.external.query-timeout-seconds}")
    private int queryTimeoutSeconds;

    @Value("${app.external.preview-max-rows}")
    private int previewMaxRows;

    public TestConnectionResponse test(ExternalSourceConnectionConfig config, ExternalSourceCredential credential) {
        long start = System.nanoTime();
        try (Connection connection = open(config, credential)) {
            int latencyMs = (int) ((System.nanoTime() - start) / 1_000_000);
            String version = connection.getMetaData().getDatabaseProductVersion();
            return new TestConnectionResponse(true, version, latencyMs, countTables(connection),
                    hasWriteAccess(connection), null, null);
        } catch (SQLException e) {
            return new TestConnectionResponse(false, null, null, null, false,
                    e.getSQLState(), explain(e));
        }
    }

    public List<SchemaTable> listSchema(ExternalSourceConnectionConfig config, ExternalSourceCredential credential) {
        String sql = """
                SELECT c.table_schema,
                       c.table_name,
                       c.column_name,
                       c.data_type,
                       cls.reltuples::bigint AS estimated_rows
                FROM   information_schema.columns c
                JOIN   pg_class cls ON cls.relname = c.table_name
                JOIN   pg_namespace ns ON ns.oid = cls.relnamespace AND ns.nspname = c.table_schema
                WHERE  c.table_schema NOT IN ('pg_catalog', 'information_schema')
                  AND  cls.relkind IN ('r', 'v', 'm', 'p')
                ORDER  BY c.table_schema, c.table_name, c.ordinal_position
                """;
        Map<String, SchemaTableBuilder> tables = new LinkedHashMap<>();
        try (Connection connection = open(config, credential);
             Statement statement = connection.createStatement()) {
            statement.setQueryTimeout(queryTimeoutSeconds);
            try (ResultSet rs = statement.executeQuery(sql)) {
                while (rs.next()) {
                    String schema = rs.getString("table_schema");
                    String name = rs.getString("table_name");
                    String dataType = rs.getString("data_type");
                    tables.computeIfAbsent(schema + "." + name,
                                    key -> new SchemaTableBuilder(schema, name, rs2Long(rs)))
                            .columns.add(new SchemaColumn(rs.getString("column_name"), dataType,
                                    isTimestampType(dataType), isNumericType(dataType)));
                }
            }
        } catch (SQLException e) {
            throw connectionFailure(e);
        }
        return tables.values().stream()
                .map(t -> new SchemaTable(t.schema, t.name, t.estimatedRows, t.columns))
                .toList();
    }

    public PreviewResponse preview(ExternalSourceConnectionConfig config, ExternalSourceCredential credential,
                                   String sql, String timestampColumn) {
        SqlQueryValidator.PreparedSql prepared = sqlQueryValidator.toPreparedSql(sql);
        long start = System.nanoTime();

        try (Connection connection = open(config, credential);
             PreparedStatement statement = connection.prepareStatement(prepared.sql())) {
            statement.setQueryTimeout(queryTimeoutSeconds);
            statement.setMaxRows(previewMaxRows);
            // Chạy thử luôn bind cursor = epoch: đúng bằng những dòng đầu tiên job sẽ đọc về.
            for (int i = 1; i <= prepared.cursorParamCount(); i++) {
                statement.setTimestamp(i, Timestamp.from(PREVIEW_CURSOR));
            }

            try (ResultSet rs = statement.executeQuery()) {
                List<PreviewColumn> columns = readColumns(rs.getMetaData());
                List<List<Object>> rows = new ArrayList<>();
                while (rs.next()) {
                    List<Object> row = new ArrayList<>(columns.size());
                    for (int i = 1; i <= columns.size(); i++) {
                        row.add(normalize(rs.getObject(i)));
                    }
                    rows.add(row);
                }
                long elapsedMs = (System.nanoTime() - start) / 1_000_000;
                requireTimestampColumn(columns, timestampColumn);
                return new PreviewResponse(columns, rows, rows.size(), elapsedMs);
            }
        } catch (SQLException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "QUERY_FAILED", explain(e));
        }
    }

    private void requireTimestampColumn(List<PreviewColumn> columns, String timestampColumn) {
        boolean present = columns.stream().anyMatch(c -> c.name().equalsIgnoreCase(timestampColumn));
        if (!present) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "TIMESTAMP_COLUMN_MISSING",
                    "Kết quả không có cột thời gian \"" + timestampColumn + "\"");
        }
    }

    private Connection open(ExternalSourceConnectionConfig config, ExternalSourceCredential credential)
            throws SQLException {
        Connection connection = DriverManager.getConnection(jdbcUrl(config), credential.username(), credential.password());
        connection.setReadOnly(true);
        return connection;
    }

    // readOnlyMode=always là thứ thực sự cưỡng chế chỉ-đọc: driver gửi
    // SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY ngay khi mở kết nối.
    // KHÔNG bỏ tham số này — với mặc định (readOnlyMode=transaction) thì setReadOnly(true)
    // chỉ có tác dụng khi autocommit tắt, tức là no-op ở đây, và một câu
    // "WITH x AS (DELETE ... RETURNING ...) SELECT * FROM x" sẽ xoá thật dữ liệu khách hàng.
    private String jdbcUrl(ExternalSourceConnectionConfig config) {
        String sslMode = config.sslMode() != null ? config.sslMode() : "disable";
        return "jdbc:postgresql://%s:%d/%s?sslmode=%s&readOnlyMode=always"
                .formatted(config.host(), config.port(), config.database(), sslMode);
    }

    private Integer countTables(Connection connection) {
        String sql = """
                SELECT count(*)
                FROM   information_schema.tables
                WHERE  table_schema NOT IN ('pg_catalog', 'information_schema')
                """;
        try (Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery(sql)) {
            return rs.next() ? rs.getInt(1) : 0;
        } catch (SQLException e) {
            return null;
        }
    }

    // Cảnh báo mềm ở form kết nối: tài khoản chỉ đọc là lớp bảo vệ thứ hai sau phiên READ ONLY.
    //
    // Phải hỏi quyền Ở CẤP BẢNG, không phải has_database_privilege(..., 'CREATE') — quyền CREATE
    // chỉ nói "tạo được schema mới", nên một tài khoản có đủ INSERT/UPDATE/DELETE trên mọi bảng
    // vẫn trả về false và bị báo nhầm là chỉ-đọc (đã kiểm chứng bằng role thật trên mock DB).
    // has_table_privilege tính cả quyền thừa kế qua role, khác information_schema.table_privileges.
    private boolean hasWriteAccess(Connection connection) {
        String sql = """
                SELECT EXISTS (
                    SELECT 1
                    FROM   pg_class c
                    JOIN   pg_namespace n ON n.oid = c.relnamespace
                    WHERE  c.relkind IN ('r', 'p')
                      AND  n.nspname NOT IN ('pg_catalog', 'information_schema')
                      AND  has_table_privilege(current_user, c.oid, 'INSERT,UPDATE,DELETE')
                )
                """;
        try (Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery(sql)) {
            return rs.next() && rs.getBoolean(1);
        } catch (SQLException e) {
            return false;
        }
    }

    private List<PreviewColumn> readColumns(ResultSetMetaData metaData) throws SQLException {
        List<PreviewColumn> columns = new ArrayList<>();
        for (int i = 1; i <= metaData.getColumnCount(); i++) {
            columns.add(new PreviewColumn(
                    metaData.getColumnLabel(i),
                    metaData.getColumnTypeName(i),
                    isNumericSqlType(metaData.getColumnType(i))));
        }
        return columns;
    }

    private Object normalize(Object value) {
        if (value instanceof Timestamp ts) {
            return ts.toInstant();
        }
        if (value instanceof OffsetDateTime odt) {
            return odt.toInstant();
        }
        if (value == null || value instanceof Number || value instanceof Boolean || value instanceof String
                || value instanceof Instant) {
            return value;
        }
        return value.toString();
    }

    private BusinessException connectionFailure(SQLException e) {
        return new BusinessException(HttpStatus.BAD_REQUEST, "CONNECTION_FAILED", explain(e));
    }

    // Thông báo nói rõ hỏng ở đâu thay vì "kết nối thất bại" — SQLState của Postgres đủ phân biệt.
    private String explain(SQLException e) {
        String state = e.getSQLState();
        if (state == null) {
            return e.getMessage();
        }
        return switch (state) {
            case "28P01" -> "Sai mật khẩu cho tài khoản này";
            case "28000" -> "Tài khoản không có quyền đăng nhập vào database này";
            case "3D000" -> "Database không tồn tại trên máy chủ";
            case "08001", "08006" -> "Không kết nối được tới máy chủ — kiểm tra host, cổng và tường lửa";
            case "57014" -> "Truy vấn chạy quá lâu và đã bị dừng (giới hạn " + queryTimeoutSeconds + " giây)";
            default -> e.getMessage();
        };
    }

    private Long rs2Long(ResultSet rs) {
        try {
            long value = rs.getLong("estimated_rows");
            return value < 0 ? null : value;
        } catch (SQLException e) {
            return null;
        }
    }

    private boolean isTimestampType(String dataType) {
        return dataType != null && dataType.startsWith("timestamp");
    }

    private boolean isNumericType(String dataType) {
        return dataType != null && switch (dataType) {
            case "smallint", "integer", "bigint", "numeric", "real", "double precision" -> true;
            default -> false;
        };
    }

    private boolean isNumericSqlType(int sqlType) {
        return switch (sqlType) {
            case Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT,
                 Types.FLOAT, Types.REAL, Types.DOUBLE, Types.NUMERIC, Types.DECIMAL -> true;
            default -> false;
        };
    }

    private static final class SchemaTableBuilder {
        private final String schema;
        private final String name;
        private final Long estimatedRows;
        private final List<SchemaColumn> columns = new ArrayList<>();

        private SchemaTableBuilder(String schema, String name, Long estimatedRows) {
            this.schema = schema;
            this.name = name;
            this.estimatedRows = estimatedRows;
        }
    }
}
