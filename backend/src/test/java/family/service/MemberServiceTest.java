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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 成员服务测试：字辈自动填充、排行计算、部分更新与校验（内存库隔离）。
 *
 * @author dorian
 * @date 2026-11-19
 */
class MemberServiceTest {
    private MemberService service;
    private User admin;

    @BeforeEach
    void setup() {
        Database db = Database.inMemory();
        Schema.init(db);
        // 建库 SQL 内置 admin/viewer，清掉以隔离测试
        db.execute("DELETE FROM users");
        UserRepository users = new UserRepository(db);
        admin = users.findById(users.insert(new User(null, "admin", "x", null, Role.ADMIN, null))).orElseThrow();
        MemberRepository members = new MemberRepository(db);
        GenerationCharRepository chars = new GenerationCharRepository(db);
        chars.insert(25, "问", false);
        chars.insert(26, "好", false);
        service = new MemberService(members, chars, db);
    }

    private Map<String, Object> body(Object... kv) {
        Map<String, Object> m = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    @Test
    @DisplayName("创建自动填充字辈与排行")
    void createAutoFillsGenerationCharAndRanks() {
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
    @DisplayName("显式排行不被覆盖")
    void explicitRanksAreNotOverridden() {
        FamilyMember m = service.create(admin, body("name", "子", "gender", "male", "generation", 26, "sibling_rank", 5, "family_rank", 9));
        assertEquals(5, m.siblingRank());
        assertEquals(9, m.familyRank());
    }

    @Test
    @DisplayName("空字符串转 null")
    void emptyStringNormalizedToNull() {
        FamilyMember m = service.create(admin, body("name", "子", "spouse_name", ""));
        assertNull(m.spouseName());
    }

    @Test
    @DisplayName("姓名为空拒绝")
    void blankNameRejected() {
        ApiException e = assertThrows(ApiException.class, () -> service.create(admin, body("name", "  ")));
        assertEquals(400, e.status());
    }

    @Test
    @DisplayName("父节点不存在拒绝")
    void nonexistentParentRejected() {
        ApiException e = assertThrows(ApiException.class,
                () -> service.create(admin, body("name", "子", "parent_id", "no-such-id")));
        assertEquals(400, e.status());
    }

    @Test
    @DisplayName("不能自设父节点")
    void cannotSetSelfAsParent() {
        FamilyMember m = service.create(admin, body("name", "子"));
        ApiException e = assertThrows(ApiException.class, () -> service.update(m.id(), body("parent_id", m.id())));
        assertEquals(400, e.status());
    }

    @Test
    @DisplayName("更新时父节点不存在 400")
    void updateWithNonexistentParentReturns400() {
        FamilyMember m = service.create(admin, body("name", "子"));
        assertEquals(400, assertThrows(ApiException.class, () -> service.update(m.id(), body("parent_id", 999999))).status());
    }

    @Test
    @DisplayName("更新不存在的成员 404")
    void updateNonexistentMemberReturns404() {
        ApiException e = assertThrows(ApiException.class, () -> service.update(999999L, body("name", "x")));
        assertEquals(404, e.status());
    }

    @Test
    @DisplayName("更新时未传排行则重新计算")
    void ranksRecalculatedWhenOmittedOnUpdate() {
        FamilyMember parent = service.create(admin, body("name", "父", "generation", 25));
        FamilyMember m = service.create(admin, body("name", "子", "gender", "male", "generation", 26, "parent_id", parent.id(), "sibling_rank", 7));
        FamilyMember updated = service.update(m.id(), body("name", "子改名", "parent_id", parent.id(), "gender", "male"));
        assertEquals(1, updated.siblingRank(), "与旧版行为一致：PUT 未传排行时按父节点+性别重算");
        assertEquals("子改名", updated.name());
        assertNotNull(updated.updatedAt());
    }

    @Test
    @DisplayName("仅改姓名时保留原有排行")
    void nameOnlyUpdatePreservesRanks() {
        FamilyMember parent = service.create(admin, body("name", "父", "generation", 25));
        FamilyMember child = service.create(admin, body("name", "子", "gender", "male", "generation", 26,
                "parent_id", parent.id(), "sibling_rank", 7, "family_rank", 9));
        FamilyMember updated = service.update(child.id(), body("name", "子改名"));
        assertEquals(7, updated.siblingRank());
        assertEquals(9, updated.familyRank());
        assertEquals(parent.id(), updated.parentId());
    }

    @Test
    @DisplayName("禁止把后代设为父节点")
    void descendantCannotBecomeParent() {
        FamilyMember root = service.create(admin, body("name", "根"));
        FamilyMember child = service.create(admin, body("name", "子", "parent_id", root.id()));
        FamilyMember grandchild = service.create(admin, body("name", "孙", "parent_id", child.id()));
        ApiException e = assertThrows(ApiException.class, () -> service.update(root.id(), body("parent_id", grandchild.id())));
        assertEquals(400, e.status());
    }

    @Test
    @DisplayName("非法字段值返回 400")
    void invalidFieldValuesReturn400() {
        assertEquals(400, assertThrows(ApiException.class, () -> service.create(admin, body("name", "x", "gender", "unknown"))).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.create(admin, body("name", "x", "generation", 0))).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.create(admin, body("name", "x", "birth_date", "2020-99-99"))).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.create(admin, body("name", null))).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.create(admin, body("name", "x", "generation", 1.5))).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.create(admin, body("name", "x", "generation", Long.MAX_VALUE))).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.create(admin, body("name", "x", "parent_id", Long.MAX_VALUE))).status());
    }

    @Test
    @DisplayName("批量创建任一条失败则整批回滚")
    void batchCreateRollsBackOnFailure() {
        ApiException e = assertThrows(ApiException.class, () -> service.createBatch(admin, List.of(
                body("name", "甲"), body("name", " "))));
        assertEquals(400, e.status());
        assertTrue(service.list().isEmpty());
    }

    @Test
    @DisplayName("批量创建全部成功")
    void batchCreateCommitsAll() {
        List<FamilyMember> created = service.createBatch(admin, List.of(
                body("name", "甲", "generation", 25),
                body("name", "乙", "generation", 26)));
        assertEquals(2, created.size());
        assertEquals(2, service.list().size());
    }

    @Test
    @DisplayName("删除后子女归属置空")
    void childrenParentClearedAfterDeletion() {
        FamilyMember parent = service.create(admin, body("name", "父", "generation", 25));
        FamilyMember child = service.create(admin, body("name", "子", "generation", 26, "parent_id", parent.id()));
        service.delete(parent.id());
        assertNull(service.list().stream().filter(m -> m.id().equals(child.id())).findFirst().orElseThrow().parentId());
    }
}