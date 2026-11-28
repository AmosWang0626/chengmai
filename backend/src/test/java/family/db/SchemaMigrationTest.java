package family.db;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 数据库迁移测试：旧库初始化时补齐生日历法字段，且重复初始化幂等。
 *
 * @author dorian
 * @date 2026-11-28
 */
class SchemaMigrationTest {
    @Test
    @DisplayName("旧成员表自动补齐生日历法字段")
    void addsBirthCalendarColumnsToLegacyTable() {
        Database db = Database.inMemory();
        db.execute("CREATE TABLE family_members (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, birth_date TEXT, spouse_birth_date TEXT, parent_id INTEGER, generation INTEGER)");

        Schema.init(db);
        Schema.init(db);

        List<String> columns = db.query("PRAGMA table_info(family_members)", rs -> rs.getString("name"));
        assertTrue(columns.contains("birth_calendar"));
        assertTrue(columns.contains("birth_lunar_leap"));
        assertTrue(columns.contains("spouse_birth_calendar"));
        assertTrue(columns.contains("spouse_lunar_leap"));
    }
}
