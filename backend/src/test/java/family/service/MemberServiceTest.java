package family.service;

import family.db.Database;
import family.db.Schema;
import family.model.FamilyMember;
import family.model.Role;
import family.model.User;
import family.repository.GenerationCharRepository;
import family.repository.MemberRepository;
import family.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** 成员服务测试：字辈自动填充、排行计算、部分更新与校验（内存库隔离）。 */
class MemberServiceTest {
    private MemberService service;
    private final User admin = new User("u1", "admin", "x", null, Role.ADMIN, null);

    @BeforeEach
    void setup() {
        Database db = Database.inMemory();
        Schema.init(db);
        new UserRepository(db).insert(admin);
        MemberRepository members = new MemberRepository(db);
        GenerationCharRepository chars = new GenerationCharRepository(db);
        chars.insert(25, "问", false);
        chars.insert(26, "好", false);
        service = new MemberService(members, chars);
    }

    private Map<String, Object> body(Object... kv) {
        Map<String, Object> m = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    @Test
    void 创建自动填充字辈与排行() {
        FamilyMember parent = service.create(admin, body("name", "父", "gender", "male", "generation", 25));
        assertEquals("问", parent.generationChar());

        FamilyMember son1 = service.create(admin, body("name", "子1", "gender", "male", "generation", 26, "parent_id", parent.id()));
        assertEquals("好", son1.generationChar());
        assertEquals(1, son1.siblingRank());
        assertEquals(1, son1.familyRank());

        FamilyMember son2 = service.create(admin, body("name", "子2", "gender", "male", "generation", 26, "parent_id", parent.id()));
        assertEquals(2, son2.siblingRank());
        assertEquals(2, son2.familyRank());

        FamilyMember daughter = service.create(admin, body("name", "女1", "gender", "female", "generation", 26, "parent_id", parent.id()));
        assertEquals(1, daughter.siblingRank(), "同性别排行独立计算");
        assertEquals(3, daughter.familyRank(), "家庭排序按全部子女");
    }

    @Test
    void 显式排行不被覆盖() {
        FamilyMember m = service.create(admin, body("name", "子", "gender", "male", "generation", 26, "sibling_rank", 5, "family_rank", 9));
        assertEquals(5, m.siblingRank());
        assertEquals(9, m.familyRank());
    }

    @Test
    void 空字符串转null() {
        FamilyMember m = service.create(admin, body("name", "子", "spouse_name", ""));
        assertNull(m.spouseName());
    }

    @Test
    void 姓名为空拒绝() {
        ApiException e = assertThrows(ApiException.class, () -> service.create(admin, body("name", "  ")));
        assertEquals(400, e.status());
    }

    @Test
    void 父节点不存在拒绝() {
        ApiException e = assertThrows(ApiException.class,
                () -> service.create(admin, body("name", "子", "parent_id", "no-such-id")));
        assertEquals(400, e.status());
    }

    @Test
    void 不能自设父节点() {
        FamilyMember m = service.create(admin, body("name", "子"));
        ApiException e = assertThrows(ApiException.class, () -> service.update(m.id(), body("parent_id", m.id())));
        assertEquals(400, e.status());
    }

    @Test
    void 更新不存在的成员404() {
        ApiException e = assertThrows(ApiException.class, () -> service.update("nope", body("name", "x")));
        assertEquals(404, e.status());
    }

    @Test
    void 更新时未传排行则重新计算() {
        FamilyMember parent = service.create(admin, body("name", "父", "generation", 25));
        FamilyMember m = service.create(admin, body("name", "子", "gender", "male", "generation", 26, "parent_id", parent.id(), "sibling_rank", 7));
        FamilyMember updated = service.update(m.id(), body("name", "子改名", "parent_id", parent.id(), "gender", "male"));
        assertEquals(1, updated.siblingRank(), "与旧版行为一致：PUT 未传排行时按父节点+性别重算");
        assertEquals("子改名", updated.name());
        assertNotNull(updated.updatedAt());
    }

    @Test
    void 删除后子女归属置空() {
        FamilyMember parent = service.create(admin, body("name", "父", "generation", 25));
        FamilyMember child = service.create(admin, body("name", "子", "generation", 26, "parent_id", parent.id()));
        service.delete(parent.id());
        assertNull(service.list().stream().filter(m -> m.id().equals(child.id())).findFirst().orElseThrow().parentId());
    }
}