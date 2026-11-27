package family.repository;

import family.db.Database;
import family.db.RowMapper;
import family.model.FamilyMember;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * 家族成员表 DAO：只负责 SQL，不含业务校验。
 *
 * @author dorian
 * @date 2026-11-19
 */
public class MemberRepository {
    private static final RowMapper<FamilyMember> MAPPER = rs -> new FamilyMember(
            rs.getLong("id"),
            RowMapper.longOrNull(rs, "user_id"),
            rs.getString("name"),
            rs.getString("gender"),
            rs.getString("birth_date"),
            rs.getString("death_date"),
            rs.getString("phone"),
            rs.getString("email"),
            rs.getString("address"),
            rs.getString("occupation"),
            rs.getString("education"),
            rs.getString("bio"),
            rs.getString("avatar_url"),
            RowMapper.longOrNull(rs, "parent_id"),
            (Integer) rs.getObject("generation"),
            rs.getString("generation_char"),
            (Integer) rs.getObject("sibling_rank"),
            (Integer) rs.getObject("family_rank"),
            rs.getString("spouse_name"),
            rs.getString("spouse_origin"),
            rs.getString("spouse_birth_date"),
            rs.getString("spouse_death_date"),
            rs.getString("notes"),
            rs.getString("created_at"),
            rs.getString("updated_at"));

    /** 允许更新的列白名单：动态拼 SET 子句前校验，防止注入任意列名。 */
    private static final Set<String> UPDATABLE = Set.of(
            "name", "gender", "birth_date", "death_date", "phone", "email", "address",
            "occupation", "education", "bio", "avatar_url", "parent_id", "generation",
            "generation_char", "sibling_rank", "family_rank", "spouse_name", "spouse_origin",
            "spouse_birth_date", "spouse_death_date", "notes", "updated_at");

    private final Database db;

    public MemberRepository(Database db) {
        this.db = db;
    }

    /** 全量成员，按世代 → 出生日期 → 录入时间排序（前端家族树依赖此顺序）。 */
    public List<FamilyMember> findAllOrdered() {
        return db.query("SELECT * FROM family_members ORDER BY generation ASC, birth_date ASC, created_at ASC", MAPPER);
    }

    public Optional<FamilyMember> findById(long id) {
        return db.queryOne("SELECT * FROM family_members WHERE id = ?", MAPPER, id);
    }

    /** 同一父节点下的兄弟姐妹，按家庭排序返回；parentId 为 null 时查询根节点。 */
    public List<FamilyMember> findByParentOrdered(Long parentId) {
        return db.query("SELECT * FROM family_members WHERE parent_id IS ? ORDER BY family_rank ASC, id ASC", MAPPER, parentId);
    }

    public boolean existsById(long id) {
        return db.queryOne("SELECT id FROM family_members WHERE id = ?", rs -> rs.getLong("id"), id).isPresent();
    }

    /** ancestorId 是否为 descendantId 的祖先；递归 CTE 同时兼容已有异常数据。 */
    public boolean isAncestor(long ancestorId, long descendantId) {
        return db.queryOne("""
                WITH RECURSIVE ancestors(id) AS (
                  SELECT parent_id FROM family_members WHERE id = ?
                  UNION
                  SELECT m.parent_id FROM family_members m JOIN ancestors a ON m.id = a.id
                )
                SELECT 1 FROM ancestors WHERE id = ?
                """, rs -> rs.getInt(1), descendantId, ancestorId).isPresent();
    }

    /** 插入成员并返回自增 id；generation 缺省按 1 处理（COALESCE），时间戳走数据库默认值。 */
    public long insert(FamilyMember m) {
        return db.insert("INSERT INTO family_members (user_id, name, gender, birth_date, death_date, phone, email, address," +
                        " occupation, education, bio, avatar_url, parent_id, generation, generation_char, sibling_rank, family_rank," +
                        " spouse_name, spouse_origin, spouse_birth_date, spouse_death_date, notes)" +
                        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 1), ?, ?, ?, ?, ?, ?, ?, ?)",
                m.userId(), m.name(), m.gender(), m.birthDate(), m.deathDate(), m.phone(), m.email(), m.address(),
                m.occupation(), m.education(), m.bio(), m.avatarUrl(), m.parentId(), m.generation(), m.generationChar(),
                m.siblingRank(), m.familyRank(), m.spouseName(), m.spouseOrigin(), m.spouseBirthDate(), m.spouseDeathDate(), m.notes());
    }

    /** 按传入字段动态更新（部分更新语义）；字段名必须在白名单内，否则抛异常。 */
    public void update(long id, Map<String, Object> fields) {
        List<String> sets = new ArrayList<>();
        List<Object> values = new ArrayList<>();
        for (Map.Entry<String, Object> e : fields.entrySet()) {
            if (!UPDATABLE.contains(e.getKey())) {
                throw new IllegalArgumentException("非法更新字段: " + e.getKey());
            }
            sets.add(e.getKey() + " = ?");
            values.add(e.getValue());
        }
        if (sets.isEmpty()) return;
        values.add(id);
        db.update("UPDATE family_members SET " + String.join(", ", sets) + " WHERE id = ?", values.toArray());
    }

    /** 删除成员；子女的 parent_id 由外键 ON DELETE SET NULL 自动置空。 */
    public void delete(long id) {
        db.update("DELETE FROM family_members WHERE id = ?", id);
    }

    /** 下一个同辈排行：同一父亲、同性别中的 MAX+1；IS ? 写法兼容 parentId 为 null。 */
    public int maxSiblingRank(Long parentId, String gender, long excludeId) {
        return db.queryOne(
                "SELECT COALESCE(MAX(sibling_rank), 0) + 1 AS r FROM family_members WHERE parent_id IS ? AND gender IS ? AND id != ?",
                rs -> rs.getInt("r"), parentId, gender, excludeId).orElse(1);
    }

    /** 下一个家庭排序：同一父亲下全部子女中的 MAX+1（不分性别）。 */
    public int maxFamilyRank(Long parentId, long excludeId) {
        return db.queryOne(
                "SELECT COALESCE(MAX(family_rank), 0) + 1 AS r FROM family_members WHERE parent_id IS ? AND id != ?",
                rs -> rs.getInt("r"), parentId, excludeId).orElse(1);
    }
}