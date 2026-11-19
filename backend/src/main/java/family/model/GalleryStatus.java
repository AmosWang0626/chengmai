package family.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;

/** 相册图片审核状态：JSON 中以小写传输（pending/approved/rejected/hidden）。 */
public enum GalleryStatus {
    PENDING, APPROVED, REJECTED, HIDDEN;

    /** 序列化输出值（小写）。 */
    @JsonValue
    public String wire() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** 反序列化入口（大小写不敏感），非法值抛 IllegalArgumentException。 */
    @JsonCreator
    public static GalleryStatus fromWire(String s) {
        return valueOf(s.toUpperCase(Locale.ROOT));
    }

    /** 宽容解析：null 或非法值返回 null，由调用方决定报错文案。 */
    public static GalleryStatus parseOrNull(String s) {
        if (s == null) return null;
        try {
            return fromWire(s);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}