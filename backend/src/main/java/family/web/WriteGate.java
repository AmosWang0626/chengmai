package family.web;

import family.service.ApiException;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;
import io.javalin.http.HandlerType;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * 写入门禁处理器：为写请求登记标记，并在备份期间拒绝写入。
 *
 * @author dorian
 * @date 2026-11-28
 */
public class WriteGate {
    private static final String MARKER = "writerMarker";
    private final Path dataDir;

    public WriteGate(Path dataDir) {
        this.dataDir = dataDir.toAbsolutePath().normalize();
        clearDeadWriterMarkers();
    }

    /** 启动时清理已退出进程遗留的写入标记，避免在线备份无限等待。 */
    private void clearDeadWriterMarkers() {
        Path writers = this.dataDir.resolve(".writers");
        if (!Files.isDirectory(writers)) return;
        try (var entries = Files.list(writers)) {
            entries.filter(path -> path.getFileName().toString().endsWith(".marker")).forEach(path -> {
                try {
                    String pid = Files.readString(path).trim();
                    boolean alive = ProcessHandle.of(Long.parseLong(pid)).isPresent();
                    if (!alive) Files.deleteIfExists(path);
                } catch (Exception e) {
                    try {
                        Files.deleteIfExists(path);
                    } catch (Exception ignored) {
                    }
                }
            });
        } catch (Exception e) {
            throw new RuntimeException("清理写入标记失败", e);
        }
    }

    public void register(RoutesConfig routes) {
        routes.before("/api/*", ctx -> {
            if (!isWrite(ctx)) return;
            Path writers = dataDir.resolve(".writers");
            Path lock = dataDir.resolve(".backup-lock");
            try {
                Files.createDirectories(writers);
                if (Files.exists(lock)) throw new ApiException(503, "正在备份，请稍后重试");
                Path marker = writers.resolve(ProcessHandle.current().pid() + "-" + UUID.randomUUID() + ".marker");
                Files.writeString(marker, Long.toString(ProcessHandle.current().pid()));
                if (Files.exists(lock)) {
                    Files.deleteIfExists(marker);
                    throw new ApiException(503, "正在备份，请稍后重试");
                }
                ctx.attribute(MARKER, marker);
            } catch (ApiException e) {
                throw e;
            } catch (Exception e) {
                throw new RuntimeException("写入锁初始化失败", e);
            }
        });
        routes.after("/api/*", ctx -> {
            Path marker = ctx.attribute(MARKER);
            if (marker == null) return;
            try {
                Files.deleteIfExists(marker);
            } catch (Exception ignored) {
            }
        });
    }

    private static boolean isWrite(Context ctx) {
        return ctx.method() != HandlerType.GET && ctx.method() != HandlerType.OPTIONS;
    }
}
