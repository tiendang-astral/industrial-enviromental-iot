package com.corp.iot.backend.externaldb.service;

import com.corp.iot.backend.common.exception.BusinessException;
import com.corp.iot.backend.externaldb.dialect.ExternalDbDialect;
import com.corp.iot.backend.externaldb.dialect.ExternalDbDialects;
import com.corp.iot.backend.externaldb.dto.ExternalDbDtos.BackfillEstimateResponse;
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
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Kết nối database ngoài bằng JDBC thuần cho 3 việc đồng bộ theo request: thử kết nối, đọc cấu
// trúc bảng, chạy thử truy vấn. x-ingestion-service có lớp tương đương cho luồng chạy nền —
// chấp nhận trùng, mỗi service độc lập hoàn toàn (CONVENTIONS.md § Backend).
//
// File này không chứa cú pháp riêng của loại database nào: chuỗi kết nối, cách khoá chỉ-đọc, SQL
// đọc cấu trúc bảng và mã lỗi đều nằm trong ExternalDbDialect.
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalDbGateway {

    private static final Instant PREVIEW_CURSOR = Instant.EPOCH;

    private final SqlQueryValidator sqlQueryValidator;
    private final ExternalDbDialects dialects;

    @Value("${app.external.query-timeout-seconds}")
    private int queryTimeoutSeconds;

    @Value("${app.external.preview-max-rows}")
    private int previewMaxRows;

    @Value("${app.external.sample-max-rows}")
    private int sampleMaxRows;

    public TestConnectionResponse test(String connectionType, ExternalSourceConnectionConfig config,
                                       ExternalSourceCredential credential) {
        ExternalDbDialect dialect = dialects.of(connectionType);
        long start = System.nanoTime();
        try (Connection connection = dialect.open(config, credential)) {
            int latencyMs = (int) ((System.nanoTime() - start) / 1_000_000);
            String version = connection.getMetaData().getDatabaseProductVersion();
            return new TestConnectionResponse(true, version, latencyMs, countTables(dialect, connection),
                    hasWriteAccess(dialect, connection), null, null);
        } catch (SQLException e) {
            return new TestConnectionResponse(false, null, null, null, false,
                    e.getSQLState(), dialect.explain(e, queryTimeoutSeconds));
        }
    }

    public List<SchemaTable> listSchema(String connectionType, ExternalSourceConnectionConfig config,
                                        ExternalSourceCredential credential) {
        ExternalDbDialect dialect = dialects.of(connectionType);
        Map<String, SchemaTableBuilder> tables = new LinkedHashMap<>();
        try (Connection connection = dialect.open(config, credential);
             Statement statement = connection.createStatement()) {
            statement.setQueryTimeout(queryTimeoutSeconds);
            try (ResultSet rs = statement.executeQuery(dialect.schemaSql())) {
                while (rs.next()) {
                    String schema = rs.getString("table_schema");
                    String name = rs.getString("table_name");
                    String dataType = rs.getString("data_type");
                    tables.computeIfAbsent(schema + "." + name,
                                    key -> new SchemaTableBuilder(schema, name, rs2Long(rs)))
                            .columns.add(new SchemaColumn(rs.getString("column_name"), dataType,
                                    dialect.isTimestampType(dataType), dialect.isNumericType(dataType)));
                }
            }
        } catch (SQLException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "CONNECTION_FAILED", dialect.explain(e, queryTimeoutSeconds));
        }
        return tables.values().stream()
                .map(t -> new SchemaTable(t.schema, t.name, t.estimatedRows, t.columns))
                .toList();
    }

    public PreviewResponse preview(String connectionType, ExternalSourceConnectionConfig config,
                                   ExternalSourceCredential credential, String sql, String timestampColumn) {
        ExternalDbDialect dialect = dialects.of(connectionType);
        SqlQueryValidator.PreparedSql prepared = sqlQueryValidator.toPreparedSql(sql);
        long start = System.nanoTime();

        try (Connection connection = dialect.open(config, credential);
             PreparedStatement statement = connection.prepareStatement(prepared.sql())) {
            statement.setQueryTimeout(queryTimeoutSeconds);
            statement.setMaxRows(previewMaxRows);
            // Chạy thử luôn bind cursor = epoch: đúng bằng những dòng đầu tiên job sẽ đọc về.
            bindCursor(statement, prepared.cursorParamCount(), PREVIEW_CURSOR);

            try (ResultSet rs = statement.executeQuery()) {
                List<PreviewColumn> columns = readColumns(rs.getMetaData());
                List<List<Object>> rows = readRows(dialect, rs, columns.size());
                long elapsedMs = elapsedMs(start);
                requireTimestampColumn(columns, timestampColumn);
                return new PreviewResponse(columns, rows, rows.size(), elapsedMs);
            }
        } catch (SQLException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "QUERY_FAILED", dialect.explain(e, queryTimeoutSeconds));
        }
    }

    // Mẫu dữ liệu MỚI NHẤT của một job đã lưu. Khác preview ở chỗ preview bind cursor = epoch và
    // trả về những dòng ĐẦU TIÊN job sẽ đọc — đúng cho lúc soạn câu, sai cho lúc quan sát job đang
    // chạy. Ở đây bọc câu người dùng thành bảng con rồi ORDER BY cột thời gian giảm dần.
    public PreviewResponse sample(String connectionType, ExternalSourceConnectionConfig config,
                                  ExternalSourceCredential credential, String sql, String timestampColumn, int limit) {
        ExternalDbDialect dialect = dialects.of(connectionType);
        long start = System.nanoTime();
        SqlQueryValidator.PreparedSql inner = sqlQueryValidator.toPreparedSql(dialect.toInnerSql(sql));

        try (Connection connection = dialect.open(config, credential)) {
            String column = dialect.quoteIdentifier(resolveColumnLabel(connection, inner.sql(), timestampColumn));
            String sampleSql = dialect.wrapDerived(inner.sql(), "*", "ORDER BY t." + column + " DESC");

            try (PreparedStatement statement = connection.prepareStatement(sampleSql)) {
                statement.setQueryTimeout(queryTimeoutSeconds);
                statement.setMaxRows(Math.min(limit, sampleMaxRows));
                bindCursor(statement, inner.cursorParamCount(), PREVIEW_CURSOR);

                try (ResultSet rs = statement.executeQuery()) {
                    List<PreviewColumn> columns = readColumns(rs.getMetaData());
                    List<List<Object>> rows = readRows(dialect, rs, columns.size());
                    return new PreviewResponse(columns, rows, rows.size(), elapsedMs(start));
                }
            }
        } catch (SQLException e) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "QUERY_FAILED", dialect.explain(e, queryTimeoutSeconds));
        }
    }

    // Ước lượng khối lượng backfill: đếm dòng trong khoảng (targetFrom, coveredFrom) bằng chính
    // câu SQL của job, bọc thành bảng con. Đếm quá lâu thì trả rowCount null thay vì để người
    // dùng chờ — con số là để họ quyết định, không phải điều kiện để chạy.
    public BackfillEstimateResponse estimate(String connectionType, ExternalSourceConnectionConfig config,
                                             ExternalSourceCredential credential, String sql, String timestampColumn,
                                             Instant targetFrom, Instant coveredFrom) {
        ExternalDbDialect dialect = dialects.of(connectionType);
        long start = System.nanoTime();
        SqlQueryValidator.PreparedSql inner = sqlQueryValidator.toPreparedSql(dialect.toInnerSql(sql));

        try (Connection connection = dialect.open(config, credential)) {
            String column = dialect.quoteIdentifier(resolveColumnLabel(connection, inner.sql(), timestampColumn));
            String countSql = dialect.wrapDerived(inner.sql(), "count(*)", "WHERE t." + column + " < ?");

            try (PreparedStatement statement = connection.prepareStatement(countSql)) {
                statement.setQueryTimeout(queryTimeoutSeconds);
                int index = bindCursor(statement, inner.cursorParamCount(), targetFrom);
                statement.setTimestamp(index, Timestamp.from(coveredFrom));

                try (ResultSet rs = statement.executeQuery()) {
                    Long rowCount = rs.next() ? rs.getLong(1) : null;
                    return new BackfillEstimateResponse(rowCount, targetFrom, coveredFrom, elapsedMs(start));
                }
            }
        } catch (SQLException e) {
            // Hết thời gian = câu đếm quá nặng, không phải câu hỏng.
            if (dialect.isTimeout(e)) {
                return new BackfillEstimateResponse(null, targetFrom, coveredFrom, elapsedMs(start));
            }
            throw new BusinessException(HttpStatus.BAD_REQUEST, "QUERY_FAILED", dialect.explain(e, queryTimeoutSeconds));
        }
    }

    // Tên cột phải khớp CHÍNH XÁC khi nhúng vào SQL (khác rs.getObject vốn so khớp không phân
    // biệt hoa thường). Describe câu bảng con lấy nhãn thật mà không đọc dòng nào.
    private String resolveColumnLabel(Connection connection, String innerSql, String timestampColumn)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(innerSql)) {
            ResultSetMetaData metaData = statement.getMetaData();
            if (metaData != null) {
                for (int i = 1; i <= metaData.getColumnCount(); i++) {
                    String label = metaData.getColumnLabel(i);
                    if (label.equalsIgnoreCase(timestampColumn)) {
                        return label;
                    }
                }
            }
        }
        throw new BusinessException(HttpStatus.BAD_REQUEST, "TIMESTAMP_COLUMN_MISSING",
                "Kết quả không có cột thời gian \"" + timestampColumn + "\"");
    }

    private int bindCursor(PreparedStatement statement, int cursorParamCount, Instant value) throws SQLException {
        int index = 1;
        for (; index <= cursorParamCount; index++) {
            statement.setTimestamp(index, Timestamp.from(value));
        }
        return index;
    }

    private long elapsedMs(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000;
    }

    private void requireTimestampColumn(List<PreviewColumn> columns, String timestampColumn) {
        // Chưa chọn cột thì không có gì để kiểm — lần chạy thử đầu tiên tồn tại chính là để
        // người dùng biết có những cột nào mà chọn.
        if (timestampColumn == null || timestampColumn.isBlank()) return;
        boolean present = columns.stream().anyMatch(c -> c.name().equalsIgnoreCase(timestampColumn));
        if (!present) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "TIMESTAMP_COLUMN_MISSING",
                    "Kết quả không có cột thời gian \"" + timestampColumn + "\"");
        }
    }

    private Integer countTables(ExternalDbDialect dialect, Connection connection) {
        try (Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery(dialect.countTablesSql())) {
            return rs.next() ? rs.getInt(1) : 0;
        } catch (SQLException e) {
            return null;
        }
    }

    // Cảnh báo mềm ở form kết nối: tài khoản chỉ đọc là lớp bảo vệ thứ hai sau phiên chỉ-đọc.
    private boolean hasWriteAccess(ExternalDbDialect dialect, Connection connection) {
        try (Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery(dialect.writeAccessSql())) {
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

    private List<List<Object>> readRows(ExternalDbDialect dialect, ResultSet rs, int columnCount) throws SQLException {
        List<List<Object>> rows = new ArrayList<>();
        while (rs.next()) {
            List<Object> row = new ArrayList<>(columnCount);
            for (int i = 1; i <= columnCount; i++) {
                row.add(normalize(dialect, rs.getObject(i)));
            }
            rows.add(row);
        }
        return rows;
    }

    private Object normalize(ExternalDbDialect dialect, Object value) {
        Instant instant = dialect.toInstant(value);
        if (instant != null) {
            return instant;
        }
        if (value == null || value instanceof Number || value instanceof Boolean || value instanceof String) {
            return value;
        }
        return value.toString();
    }

    // NULL (SQL Server: view không có partition) khác 0 dòng — không được hiện thành "0".
    private Long rs2Long(ResultSet rs) {
        try {
            long value = rs.getLong("estimated_rows");
            return rs.wasNull() || value < 0 ? null : value;
        } catch (SQLException e) {
            return null;
        }
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
