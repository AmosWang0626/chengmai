package family.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import family.service.ApiException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** JSON 工具：请求解析严格校验结构，标签解析失败时降级为空列表。 */
public class Json {
    public static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);

    /** 请求体 → 有序 Map；空串返回空 Map，非法 JSON 返回 400。 */
    public static Map<String, Object> toMap(String raw) {
        if (raw == null || raw.isBlank()) return new LinkedHashMap<>();
        try {
            JsonNode root = MAPPER.readTree(raw);
            if (root == null || !root.isObject()) {
                throw new ApiException(400, "请求 JSON 格式不正确");
            }
            return MAPPER.convertValue(root, new TypeReference<LinkedHashMap<String, Object>>() {
            });
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(400, "请求 JSON 格式不正确");
        }
    }

    /** 批量请求体 → Map 列表；非数组或数组元素非对象时返回 400。 */
    public static List<Map<String, Object>> toMapList(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        try {
            JsonNode root = MAPPER.readTree(raw);
            if (root == null || !root.isArray()) {
                throw new ApiException(400, "请求 JSON 格式不正确");
            }
            for (JsonNode item : root) {
                if (!item.isObject()) throw new ApiException(400, "请求 JSON 格式不正确");
            }
            return MAPPER.convertValue(root, new TypeReference<List<Map<String, Object>>>() {
            });
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(400, "请求 JSON 格式不正确");
        }
    }

    /** JSON 数组字符串 → List；非法输入返回空列表（用于 tags 字段）。 */
    public static List<String> toStringList(String raw) {
        try {
            JsonNode root = MAPPER.readTree(raw);
            if (root == null || !root.isArray()) return List.of();
            List<String> values = new ArrayList<>();
            for (JsonNode item : root) {
                if (!item.isTextual()) return List.of();
                values.add(item.textValue());
            }
            return values;
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