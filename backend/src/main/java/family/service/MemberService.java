package family.service;

import family.db.Database;
import family.model.FamilyMember;
import family.model.User;
import family.repository.GenerationCharRepository;
import family.repository.MemberRepository;
import family.util.Time;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 成员服务：CRUD + 字辈自动填充 + 排行自动计算。入参用 Map 以保留“字段是否出现”的部分更新语义。
 *
 * @author dorian
 * @date 2026-11-19
 */
public class MemberService {
    /** 允许从请求体拾取的字段（与前端表单一致）。 */
    private static final List<String> FIELDS = List.of(
            "name", "gender", "birth_date", "death_date", "phone", "email", "address",
            "occupation", "education", "bio", "avatar_url", "parent_id", "generation",
            "generation_char", "sibling_rank", "family_rank", "spouse_name", "spouse_origin",
            "spouse_birth_date", "spouse_death_date", "notes");

    /** 这些字段传空串时按 null 入库（清空语义）。 */
    private static final Set<String> NULLABLE = Set.of(
            "gender", "birth_date", "death_date", "phone", "email", "address", "occupation",
            "education", "bio", "avatar_url", "parent_id", "generation_char", "spouse_name",
            "spouse_origin", "spouse_birth_date", "spouse_death_date", "notes");

    private final MemberRepository members;
    private final GenerationCharRepository chars;
    private final Database db;

    public MemberService(MemberRepository members, GenerationCharRepository chars, Database db) {
        this.members = members;
        this.chars = chars;
        this.db = db;
    }

    public List<FamilyMember> list() {
        return members.findAllOrdered();
    }

    /** 创建成员：校验姓名与父节点，自动补字辈/排行后入库。 */
    public FamilyMember create(User actor, Map<String, Object> body) {
        Map<String, Object> data = pickFields(body);
        validate(data, true);
        Long parentId = parentIdOrNull(data.get("parent_id"));
        if (parentId != null && !members.existsById(parentId)) {
            throw new ApiException(400, "所选父节点不存在");
        }
        data.put("parent_id", parentId);
        fillGenerationChar(data);
        fillRanks(data, 0L);
        long id = members.insert(new FamilyMember(
                null, actor.id(), str(data.get("name")), str(data.get("gender")),
                str(data.get("birth_date")), str(data.get("death_date")),
                str(data.get("phone")), str(data.get("email")), str(data.get("address")),
                str(data.get("occupation")), str(data.get("education")), str(data.get("bio")),
                str(data.get("avatar_url")), parentId,
                intOrNull(data.get("generation")), str(data.get("generation_char")),
                intOrNull(data.get("sibling_rank")), intOrNull(data.get("family_rank")),
                str(data.get("spouse_name")), str(data.get("spouse_origin")),
                str(data.get("spouse_birth_date")), str(data.get("spouse_death_date")),
                str(data.get("notes")), null, null));
        return members.findById(id).orElseThrow();
    }

    /** 批量创建：任一条失败则整批回滚，避免前端逐条提交留下部分数据。 */
    public List<FamilyMember> createBatch(User actor, List<Map<String, Object>> bodies) {
        if (bodies == null || bodies.isEmpty()) {
            throw new ApiException(400, "请至少添加一名成员");
        }
        if (bodies.size() > 500) {
            throw new ApiException(400, "单次最多添加 500 名成员");
        }
        return db.inTransaction(() -> bodies.stream().map(body -> create(actor, body)).toList());
    }

    /** 部分更新：只处理请求体中出现的字段；始终刷新 updated_at。 */
    public FamilyMember update(long id, Map<String, Object> body) {
        return db.inTransaction(() -> updateInternal(id, body));
    }

    private FamilyMember updateInternal(long id, Map<String, Object> body) {
        FamilyMember existing = members.findById(id).orElseThrow(() -> new ApiException(404, "成员不存在"));
        Map<String, Object> data = pickFields(body);
        validate(data, false);
        if (data.containsKey("parent_id")) {
            Long parentId = parentIdOrNull(data.get("parent_id"));
            if (parentId != null && parentId == id) {
                throw new ApiException(400, "不能将自己设为自己的父节点");
            }
            if (parentId != null && !members.existsById(parentId)) {
                throw new ApiException(400, "所选父节点不存在");
            }
            if (parentId != null && members.isAncestor(id, parentId)) {
                throw new ApiException(400, "不能将后代设为父节点");
            }
            data.put("parent_id", parentId);
        }

        Map<String, Object> effective = new LinkedHashMap<>();
        effective.put("generation", data.getOrDefault("generation", existing.generation()));
        effective.put("generation_char", data.getOrDefault("generation_char", existing.generationChar()));
        effective.put("parent_id", data.getOrDefault("parent_id", existing.parentId()));
        effective.put("gender", data.getOrDefault("gender", existing.gender()));
        effective.put("sibling_rank", data.getOrDefault("sibling_rank", existing.siblingRank()));
        effective.put("family_rank", data.getOrDefault("family_rank", existing.familyRank()));

        boolean generationChanged = data.containsKey("generation")
                && !java.util.Objects.equals(data.get("generation"), existing.generation());
        if (generationChanged && !data.containsKey("generation_char")) {
            effective.put("generation_char", null);
        }
        fillGenerationChar(effective);
        if (generationChanged || data.containsKey("generation_char")) {
            data.put("generation_char", effective.get("generation_char"));
        }

        boolean hierarchyChanged = data.containsKey("parent_id") || data.containsKey("gender");
        if (hierarchyChanged && !data.containsKey("sibling_rank")) {
            effective.put("sibling_rank", null);
        }
        if (data.containsKey("parent_id") && !data.containsKey("family_rank")) {
            effective.put("family_rank", null);
        }
        fillRanks(effective, id);
        if (hierarchyChanged || data.containsKey("sibling_rank")) {
            data.put("sibling_rank", effective.get("sibling_rank"));
        }
        if (data.containsKey("parent_id") || data.containsKey("family_rank")) {
            data.put("family_rank", effective.get("family_rank"));
        }

        data.put("updated_at", Time.isoNow());
        members.update(id, data);
        return members.findById(id).orElseThrow();
    }

    /** 删除成员；子女 parent_id 由外键自动置空。 */
    public void delete(long id) {
        if (!members.existsById(id)) {
            throw new ApiException(404, "成员不存在");
        }
        members.delete(id);
    }

    /** 按白名单拾取字段；containsKey 判断保留“未传”与“传 null”的区别。 */
    private static Map<String, Object> pickFields(Map<String, Object> body) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (String f : FIELDS) {
            if (body.containsKey(f)) {
                Object v = body.get(f);
                out.put(f, NULLABLE.contains(f) && "".equals(v) ? null : v);
            }
        }
        return out;
    }

    private static void validate(Map<String, Object> data, boolean create) {
        if (create || data.containsKey("name")) {
            String name = str(data.get("name"));
            if (name == null || name.isBlank()) {
                throw new ApiException(400, "姓名不能为空");
            }
            data.put("name", name.trim());
        }
        if (data.containsKey("gender")) {
            String gender = str(data.get("gender"));
            if (gender != null && !Set.of("male", "female", "other").contains(gender)) {
                throw new ApiException(400, "性别取值无效");
            }
        }
        if (data.containsKey("generation")) {
            Integer generation = strictInt(data.get("generation"), "世代");
            if (generation == null || generation < 1) {
                throw new ApiException(400, "世代必须为正整数");
            }
            data.put("generation", generation);
        }
        for (String field : List.of("sibling_rank", "family_rank")) {
            if (!data.containsKey(field)) continue;
            Integer rank = strictInt(data.get(field), "排行");
            if (rank != null && rank < 0) {
                throw new ApiException(400, "排行不能为负数");
            }
            data.put(field, rank);
        }
        for (String field : List.of("birth_date", "death_date", "spouse_birth_date", "spouse_death_date")) {
            if (!data.containsKey(field) || data.get(field) == null) continue;
            String value = str(data.get(field)).trim();
            try {
                java.time.LocalDate.parse(value);
            } catch (Exception e) {
                throw new ApiException(400, "日期格式应为 YYYY-MM-DD");
            }
            data.put(field, value);
        }
    }

    private static Integer strictInt(Object value, String label) {
        if (value == null) return null;
        try {
            if (value instanceof Number n) {
                return new BigDecimal(n.toString()).intValueExact();
            }
            return Integer.parseInt(String.valueOf(value).trim());
        } catch (NumberFormatException | ArithmeticException e) {
            throw new ApiException(400, label + "必须为整数");
        }
    }

    /** 未显式指定字辈时，按世代查配置自动填充（gen 为 null/0 时跳过，避免空指针）。 */
    private void fillGenerationChar(Map<String, Object> data) {
        Integer gen = intOrNull(data.get("generation"));
        Object ch = data.get("generation_char");
        if (gen != null && gen != 0 && (ch == null || "".equals(ch))) {
            chars.findByGeneration(gen).ifPresent(c -> data.put("generation_char", c.charValue()));
        }
    }

    /** 排行缺省（未传或为 0）时按父节点+性别重算；与 Node 版 PUT 行为一致：以请求体为准。 */
    private void fillRanks(Map<String, Object> data, long id) {
        Long parentId = (Long) data.get("parent_id");
        if (missingRank(data.get("sibling_rank"))) {
            data.put("sibling_rank", members.maxSiblingRank(parentId, str(data.get("gender")), id));
        }
        if (missingRank(data.get("family_rank"))) {
            data.put("family_rank", members.maxFamilyRank(parentId, id));
        }
    }

    /** null 或 0 视为“未指定排行”。 */
    private static boolean missingRank(Object v) {
        return v == null || (v instanceof Number n && n.intValue() == 0);
    }

    /** JS 风格真值判断（兼容前端可能传来的字符串/数字布尔）。 */
    private static boolean truthy(Object o) {
        if (o == null) return false;
        if (o instanceof Boolean b) return b;
        if (o instanceof Number n) return n.doubleValue() != 0;
        String s = String.valueOf(o);
        return !s.isEmpty() && !"false".equals(s) && !"0".equals(s);
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    /** parent_id 兼容数字与数字字符串（前端 select 传字符串）；空值按清空，非法格式 400。 */
    private static Long parentIdOrNull(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) {
            try {
                return new BigDecimal(n.toString()).longValueExact();
            } catch (ArithmeticException e) {
                throw new ApiException(400, "所选父节点不存在");
            }
        }
        String s = String.valueOf(v).trim();
        if (s.isEmpty()) return null;
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            throw new ApiException(400, "所选父节点不存在");
        }
    }

    /** 宽容转整数：数字或数字字符串均可，非法返回 null。 */
    private static Integer intOrNull(Object o) {
        if (o instanceof Number n) return n.intValue();
        if (o instanceof String s) {
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}