package family.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** JSON 工具：全局共享 ObjectMapper，解析失败一律宽容降级（与 Node 版行为一致）。 */
public class Json {
    public static final ObjectMapper MAPPER = new ObjectMapper();

    /** 请求体 → 有序 Map；空串或非法 JSON 返回空 Map（保持插入顺序，便于动态拼 SQL）。 */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> toMap(String raw) {
        try {
            if (raw == null || raw.isBlank()) return new LinkedHashMap<>();
            return MAPPER.readValue(raw, LinkedHashMap.class);
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    /** JSON 数组字符串 → List；非法输入返回空列表（用于 tags 字段）。 */
    public static List<String> toStringList(String raw) {
        try {
            return MAPPER.readValue(raw, new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            return List.of();
        }
    }

    /** 对象 → JSON 字符串。 */
    public static String write(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}