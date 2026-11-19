package family.db;

import java.sql.ResultSet;
import java.sql.SQLException;

/** 结果集行映射函数：把一行 ResultSet 转成领域对象。 */
@FunctionalInterface
public interface RowMapper<T> {
    T map(ResultSet rs) throws SQLException;
}