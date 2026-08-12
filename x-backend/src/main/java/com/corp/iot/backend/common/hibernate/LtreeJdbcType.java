package com.corp.iot.backend.common.hibernate;

import org.hibernate.type.SqlTypes;
import org.hibernate.type.descriptor.ValueBinder;
import org.hibernate.type.descriptor.ValueExtractor;
import org.hibernate.type.descriptor.WrapperOptions;
import org.hibernate.type.descriptor.java.JavaType;
import org.hibernate.type.descriptor.jdbc.JdbcType;
import org.postgresql.util.PGobject;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Mapping cho cột Postgres {@code ltree} (không có type sẵn trong Hibernate).
 * Bind qua {@link PGobject} (type="ltree") thay vì String/Types.OTHER thuần —
 * pgjdbc gửi Types.OTHER dạng binary/bytea mặc định, gây lỗi "column is of type
 * ltree but expression is of type bytea"; PGobject khai báo rõ type nên luôn
 * gửi dạng text, driver/Postgres parse đúng.
 */
public class LtreeJdbcType implements JdbcType {

    public static final LtreeJdbcType INSTANCE = new LtreeJdbcType();

    @Override
    public int getJdbcTypeCode() {
        return SqlTypes.OTHER;
    }

    @Override
    public <X> ValueBinder<X> getBinder(JavaType<X> javaType) {
        return new ValueBinder<>() {
            @Override
            public void bind(PreparedStatement st, X value, int index, WrapperOptions options) throws SQLException {
                st.setObject(index, toPgObject(value));
            }

            @Override
            public void bind(CallableStatement st, X value, String name, WrapperOptions options) throws SQLException {
                st.setObject(name, toPgObject(value));
            }

            private PGobject toPgObject(X value) throws SQLException {
                PGobject pgObject = new PGobject();
                pgObject.setType("ltree");
                pgObject.setValue(value == null ? null : value.toString());
                return pgObject;
            }
        };
    }

    @Override
    public <X> ValueExtractor<X> getExtractor(JavaType<X> javaType) {
        return new ValueExtractor<>() {
            @Override
            public X extract(ResultSet rs, int paramIndex, WrapperOptions options) throws SQLException {
                return javaType.wrap(rs.getString(paramIndex), options);
            }

            @Override
            public X extract(CallableStatement statement, int paramIndex, WrapperOptions options) throws SQLException {
                return javaType.wrap(statement.getString(paramIndex), options);
            }

            @Override
            public X extract(CallableStatement statement, String paramName, WrapperOptions options) throws SQLException {
                return javaType.wrap(statement.getString(paramName), options);
            }
        };
    }
}
