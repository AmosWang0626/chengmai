package family.service;

import family.model.FamilyMember;
import family.model.User;
import family.repository.GenerationCharRepository;
import family.repository.MemberRepository;
import family.util.Time;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** 成员服务：CRUD + 字辈自动填充 + 排行自动计算。入参用 Map 以保留“字段是否出现”的部分更新语义。 */
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

    public MemberService(MemberRepository members, GenerationCharRepository chars) {
        this.members = members;
        this.chars = chars;
    }

    public List<FamilyMember> list() {
        return members.findAllOrdered();
    }

    /** 创建成员：校验姓名与父节点，自动补字辈/排行后入库。 */
    public FamilyMember create(User actor, Map<String, Object> body) {
        Map<String, Object> data = pickFields(body);
        String name = str(data.get("name"));
        if (name == null || name.isBlank()) {
            throw new ApiException(400, "姓名不能为空");
        }
        String parentId = str(data.get("parent_id"));
        if (parentId != null && !members.existsById(parentId)) {
            throw new ApiException(400, "所选父节点不存在");
        }
        String id = UUID.randomUUID().toString();
        fillGenerationChar(data);
        fillRanks(data, id);
        members.insert(new FamilyMember(
                id, actor.id(), name, str(data.get("gender")),
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

    /** 部分更新：只处理请求体中出现的字段；始终刷新 updated_at。 */
    public FamilyMember update(String id, Map<String, Object> body) {
        members.findById(id).orElseThrow(() -> new ApiException(404, "成员不存在"));
        Map<String, Object> data = pickFields(body);
        Object name = data.get("name");
        if (data.containsKey("name") && name != null && String.valueOf(name).isBlank()) {
            throw new ApiException(400, "姓名不能为空");
        }
        if (id.equals(data.get("parent_id"))) {
            throw new ApiException(400, "不能将自己设为自己的父节点");
        }
        fillGenerationChar(data);
        fillRanks(data, id);
        data.put("updated_at", Time.isoNow());
        members.update(id, data);
        return members.findById(id).orElseThrow();
    }

    /** 删除成员；子女 parent_id 由外键自动置空。 */
    public void delete(String id) {
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

    /** 未显式指定字辈时，按世代查配置自动填充（gen 为 null/0 时跳过，避免空指针）。 */
    private void fillGenerationChar(Map<String, Object> data) {
        Integer gen = intOrNull(data.get("generation"));
        Object ch = data.get("generation_char");
        if (gen != null && gen != 0 && (ch == null || "".equals(ch))) {
            chars.findByGeneration(gen).ifPresent(c -> data.put("generation_char", c.charValue()));
        }
    }

    /** 排行缺省（未传或为 0）时按父节点+性别重算；与 Node 版 PUT 行为一致：以请求体为准。 */
    private void fillRanks(Map<String, Object> data, String id) {
        String parentId = str(data.get("parent_id"));
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