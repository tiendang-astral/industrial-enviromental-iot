package com.corp.iot.ingestion.external.dialect;

import com.corp.iot.ingestion.external.dto.ExternalSourceConnectionConfig;
import com.corp.iot.ingestion.external.dto.ExternalSourceCredential;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.regex.Pattern;

// MySQL và MariaDB dùng chung dialect này.
@Component
public class MySqlDialect implements ExternalDbDialect {

    public static final String TYPE = "MYSQL";

    // Ngoài hai dạng như Postgres, MySQL còn "LIMIT offset, count".
    private static final Pattern TRAILING_LIMIT = Pattern.compile(
            "\\s+LIMIT\\s+\\d+(\\s*,\\s*\\d+|\\s+OFFSET\\s+\\d+)?\\s*$", Pattern.CASE_INSENSITIVE);

    @Override
    public String type() {
        return TYPE;
    }

    // Driver MariaDB (LGPL) kết nối được cả MySQL lẫn MariaDB; driver chính hãng của MySQL là GPL.
    // allowPublicKeyRetrieval: MySQL 8 đăng nhập bằng caching_sha2_password, không mã hoá thì phải lấy khoá công khai của máy chủ.
    @Override
    public String jdbcUrl(ExternalSourceConnectionConfig config) {
        String sslMode = config.sslMode() == null || "disable".equals(config.sslMode()) ? "disable" : "trust";
        return "jdbc:mariadb://%s:%d/%s?sslMode=%s&allowPublicKeyRetrieval=true&connectTimeout=10000"
                .formatted(config.host(), config.port(), config.database(), sslMode);
    }

    // Phiên READ ONLY: máy chủ từ chối ghi mọi bảng thật và mọi DDL (lỗi 1792) — cùng mức với readOnlyMode của Postgres.
    @Override
    public Connection open(ExternalSourceConnectionConfig config, ExternalSourceCredential credential)
            throws SQLException {
        Connection connection = DriverManager.getConnection(jdbcUrl(config), credential.username(), credential.password());
        try (Statement statement = connection.createStatement()) {
            statement.execute("SET SESSION TRANSACTION READ ONLY");
        } catch (SQLException e) {
            connection.close();
            throw e;
        }
        return connection;
    }

    @Override
    public String quoteIdentifier(String identifier) {
        return "`" + identifier.replace("`", "``") + "`";
    }

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

    // DATETIME không có múi giờ — hiểu theo múi giờ JVM, cùng cách driver đổi sang Timestamp.
    @Override
    public Instant toInstant(Object value) {
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.atZone(ZoneId.systemDefault()).toInstant();
        }
        return ExternalDbDialect.super.toInstant(value);
    }
}
