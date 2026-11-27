package family.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

/**
 * 用户角色：JSON 中以小写传输（admin/editor/viewer），与前端约定一致。
 *
 * @author dorian
 * @date 2026-11-19
 */
public enum Role {
    ADMIN, EDITOR, VIEWER;

    /** 序列化输出值（小写）。 */
    @JsonValue
    public String wire() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** 反序列化入口（大小写不敏感），非法值抛 IllegalArgumentException。 */
    @JsonCreator
    public static Role fromWire(String s) {
        return valueOf(s.toUpperCase(Locale.ROOT));
    }

    /** 宽容解析：null 或非法值返回 null，由调用方决定报错文案。 */
    public static Role parseOrNull(String s) {
        if (s == null) return null;
        try {
            return fromWire(s);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}