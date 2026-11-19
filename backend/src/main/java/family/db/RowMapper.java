package family.db;

import java.sql.ResultSet;
import java.sql.SQLException;

/** 结果集行映射函数：把一行 ResultSet 转成领域对象。 */
@FunctionalInterface
public interface RowMapper<T> {
    T map(ResultSet rs) throws SQLException;

    /** 可空 INTEGER 列 → Long；NULL 返回 null（getObject 的 Integer 不能直接强转 Long）。 */
    static Long longOrNull(ResultSet rs, String column) throws SQLException {
        long v = rs.getLong(column);
        return rs.wasNull() ? null : v;
    }
}