package family.util;

import family.service.ApiException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * JSON 请求解析测试：语法错误与根类型错误均返回 400。
 *
 * @author dorian
 * @date 2026-11-28
 */
class JsonTest {
    @Test
    @DisplayName("toMap 拒绝错误 JSON")
    void toMapRejectsMalformedJson() {
        assertAll(
                () -> assertBadRequest(() -> Json.toMap("{\"name\":"), "残缺对象"),
                () -> assertBadRequest(() -> Json.toMap("{name:\"test\"}"), "未加引号的键"),
                () -> assertBadRequest(() -> Json.toMap("{\"name\":\"test\"} {\"name\":\"other\"}"), "连续 JSON")
        );
    }

    @Test
    @DisplayName("toMap 拒绝非对象类型")
    void toMapRejectsWrongTypes() {
        assertAll(
                () -> assertBadRequest(() -> Json.toMap("[]"), "数组"),
                () -> assertBadRequest(() -> Json.toMap("\"text\""), "字符串"),
                () -> assertBadRequest(() -> Json.toMap("1"), "数字"),
                () -> assertBadRequest(() -> Json.toMap("true"), "布尔值"),
                () -> assertBadRequest(() -> Json.toMap("null"), "null")
        );
    }

    @Test
    @DisplayName("toMapList 拒绝错误 JSON")
    void toMapListRejectsMalformedJson() {
        assertAll(
                () -> assertBadRequest(() -> Json.toMapList("[{\"name\":"), "残缺数组"),
                () -> assertBadRequest(() -> Json.toMapList("[{name:\"test\"}]"), "未加引号的键"),
                () -> assertBadRequest(() -> Json.toMapList("[] []"), "连续 JSON")
        );
    }

    @Test
    @DisplayName("toMapList 拒绝非数组及非对象元素")
    void toMapListRejectsWrongTypes() {
        assertAll(
                () -> assertBadRequest(() -> Json.toMapList("{}"), "对象"),
                () -> assertBadRequest(() -> Json.toMapList("\"text\""), "字符串"),
                () -> assertBadRequest(() -> Json.toMapList("1"), "数字"),
                () -> assertBadRequest(() -> Json.toMapList("true"), "布尔值"),
                () -> assertBadRequest(() -> Json.toMapList("null"), "null"),
                () -> assertBadRequest(() -> Json.toMapList("[null]"), "null 元素"),
                () -> assertBadRequest(() -> Json.toMapList("[1]"), "数字元素"),
                () -> assertBadRequest(() -> Json.toMapList("[\"text\"]"), "字符串元素"),
                () -> assertBadRequest(() -> Json.toMapList("[[]]"), "数组元素")
        );
    }

    private static void assertBadRequest(Executable parser, String description) {
        ApiException error = assertThrows(ApiException.class, parser, description);
        assertEquals(400, error.status(), description);
    }
}
