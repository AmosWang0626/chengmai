package family.service;

import family.model.GenerationChar;
import family.repository.GenerationCharRepository;

import java.util.List;
import java.util.Map;

/** 字辈配置服务：每世代唯一，支持部分更新。 */
public class GenerationCharService {
    private final GenerationCharRepository chars;

    public GenerationCharService(GenerationCharRepository chars) {
        this.chars = chars;
    }

    public List<GenerationChar> list() {
        return chars.findAllOrdered();
    }

    /** 新增字辈：世代须为正整数且未被占用，字符去空白后入库。 */
    public GenerationChar create(Object generation, String charValue, Object hidden) {
        Integer gen = toInt(generation);
        if (gen == null || gen < 1 || charValue == null || charValue.isBlank()) {
            throw new ApiException(400, "世代必须为正整数，字辈字符不能为空");
        }
        if (chars.findByGeneration(gen).isPresent()) {
            throw new ApiException(409, "第" + gen + "世已存在字辈配置");
        }
        int id = chars.insert(gen, charValue.trim(), truthy(hidden));
        return chars.findById(id).orElseThrow();
    }

    /** 部分更新：未传字段沿用原值；世代冲突检查排除自身。 */
    public GenerationChar update(int id, Map<String, Object> body) {
        GenerationChar existing = chars.findById(id)
                .orElseThrow(() -> new ApiException(404, "字辈配置不存在"));
        Integer gen = body.containsKey("generation") ? toInt(body.get("generation")) : existing.generation();
        if (gen == null || gen < 1) {
            throw new ApiException(400, "世代必须为正整数");
        }
        if (chars.generationTakenByOther(gen, id)) {
            throw new ApiException(409, "第" + gen + "世已存在字辈配置");
        }
        String ch = body.containsKey("char") ? String.valueOf(body.get("char")).trim() : existing.charValue();
        boolean hidden = body.containsKey("hidden") ? truthy(body.get("hidden")) : existing.hidden();
        chars.update(id, gen, ch, hidden);
        return chars.findById(id).orElseThrow();
    }

    public void delete(int id) {
        if (chars.findById(id).isEmpty()) {
            throw new ApiException(404, "字辈配置不存在");
        }
        chars.delete(id);
    }

    /** 宽容转整数：拒绝小数（如 2.5），数字字符串可接受。 */
    private static Integer toInt(Object o) {
        if (o instanceof Number n) {
            double d = n.doubleValue();
            return d == Math.floor(d) ? n.intValue() : null;
        }
        if (o instanceof String s) {
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    /** JS 风格真值判断（兼容前端可能传来的字符串/数字布尔）。 */
    private static boolean truthy(Object o) {
        if (o == null) return false;
        if (o instanceof Boolean b) return b;
        if (o instanceof Number n) return n.doubleValue() != 0;
        String s = String.valueOf(o);
        return !s.isEmpty() && !"false".equals(s) && !"0".equals(s);
    }
}