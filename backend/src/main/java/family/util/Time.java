package family.util;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/** 时间工具：统一生成与 Node 版 new Date().toISOString() 一致的毫秒级 UTC 字符串。 */
public class Time {
    private static final DateTimeFormatter ISO_MILLIS =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

    /** 当前 UTC 时间，形如 2026-11-15T08:30:00.000Z。 */
    public static String isoNow() {
        return ISO_MILLIS.format(Instant.now());
    }
}