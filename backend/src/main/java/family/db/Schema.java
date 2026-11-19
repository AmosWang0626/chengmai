package family.db;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/** 建表初始化：读取 classpath 下的 schema.sql 并逐条执行（均为 IF NOT EXISTS，幂等）。 */
public class Schema {
    public static void init(Database db) {
        try (InputStream in = Schema.class.getResourceAsStream("/schema.sql")) {
            if (in == null) throw new IllegalStateException("schema.sql 资源缺失");
            String sql = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            // 按分号切分逐条执行；schema 中不含存储过程等嵌套分号，简单切分即可
            for (String statement : sql.split(";")) {
                if (!statement.isBlank()) {
                    db.execute(statement);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("建表失败", e);
        }
    }
}