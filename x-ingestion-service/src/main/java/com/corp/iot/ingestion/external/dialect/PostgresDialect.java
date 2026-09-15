package com.corp.iot.ingestion.external.dialect;

import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import com.corp.iot.ingestion.external.dto.ExternalSourceCredential;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.regex.Pattern;

@Component
public class PostgresDialect implements ExternalDbDialect {

    public static final String TYPE = "POSTGRESQL";

    private static final Pattern TRAILING_LIMIT = Pattern.compile(
            "\\s+LIMIT\\s+\\d+(\\s+OFFSET\\s+\\d+)?\\s*$", Pattern.CASE_INSENSITIVE);

    @Override
    public String type() {
        return TYPE;
    }

    // readOnlyMode=always là thứ thực sự cưỡng chế chỉ-đọc: driver gửi
    // SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY ngay khi mở kết nối.
    // KHÔNG bỏ tham số này — với mặc định (readOnlyMode=transaction) thì setReadOnly(true)
    // chỉ có tác dụng khi autocommit tắt, tức là no-op ở đây, và một câu
    // "WITH x AS (DELETE ... RETURNING ...) SELECT * FROM x" sẽ xoá thật dữ liệu khách hàng.
    @Override
    public String jdbcUrl(ExternalSourceConnectionConfig config) {
        String sslMode = config.sslMode() != null ? config.sslMode() : "disable";
        return "jdbc:postgresql://%s:%d/%s?sslmode=%s&readOnlyMode=always"
                .formatted(config.host(), config.port(), config.database(), sslMode);
    }

    @Override
    public Connection open(ExternalSourceConnectionConfig config, ExternalSourceCredential credential)
            throws SQLException {
        Connection connection = DriverManager.getConnection(jdbcUrl(config), credential.username(), credential.password());
        connection.setReadOnly(true);
        return connection;
    }

    @Override
    public String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    // LIMIT nằm trong bảng con của chính người dùng (kết thúc bằng dấu đóng ngoặc) thuộc về bảng
    // con đó, không phải câu ngoài — vì vậy chỉ neo vào cuối câu, không quét toàn bộ.
    @Override
    public String toInnerSql(String sql) {
        String withoutComments = SqlText.stripComments(sql).trim();
        String withoutSemicolon = SqlText.stripTrailingSemicolon(withoutComments);
        return TRAILING_LIMIT.matcher(withoutSemicolon).replaceAll("").trim();
    }

    @Override
    public String wrapDerived(String innerSql, String selectList, String tail) {
        return "SELECT " + selectList + " FROM (" + innerSql + ") t" + (tail.isBlank() ? "" : " " + tail);
    }
}
