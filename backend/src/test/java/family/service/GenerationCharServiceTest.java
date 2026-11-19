package family.service;

import family.db.Database;
import family.db.Schema;
import family.model.GenerationChar;
import family.repository.GenerationCharRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** 字辈服务测试：世代唯一性、部分更新、非法输入。 */
class GenerationCharServiceTest {
    private GenerationCharService service;

    @BeforeEach
    void setup() {
        Database db = Database.inMemory();
        Schema.init(db);
        service = new GenerationCharService(new GenerationCharRepository(db));
    }

    @Test
    void 创建与重复世代409() {
        GenerationChar c = service.create(27, "中", false);
        assertEquals("中", c.charValue());
        assertFalse(c.hidden());
        ApiException e = assertThrows(ApiException.class, () -> service.create(27, "重", false));
        assertEquals(409, e.status());
    }

    @Test
    void 非法世代400() {
        assertEquals(400, assertThrows(ApiException.class, () -> service.create(0, "x", false)).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.create("abc", "x", false)).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.create(27, " ", false)).status());
    }

    @Test
    void 字符串数字可接受() {
        assertEquals(28, service.create("28", "华", false).generation());
    }

    @Test
    void 部分更新保留未传字段() {
        GenerationChar c = service.create(27, "中", false);
        GenerationChar updated = service.update(c.id(), Map.of("hidden", true));
        assertTrue(updated.hidden());
        assertEquals("中", updated.charValue());
        assertEquals(27, updated.generation());
    }

    @Test
    void 更新撞其他世代409() {
        GenerationChar a = service.create(27, "中", false);
        service.create(28, "华", false);
        assertEquals(409, assertThrows(ApiException.class, () -> service.update(a.id(), Map.of("generation", 28))).status());
    }

    @Test
    void 删除与404() {
        GenerationChar c = service.create(27, "中", false);
        service.delete(c.id());
        assertTrue(service.list().isEmpty());
        assertEquals(404, assertThrows(ApiException.class, () -> service.delete(c.id())).status());
    }
}