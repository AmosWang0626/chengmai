package family.web;

import family.model.User;
import family.repository.AuditRepository;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;
import io.javalin.http.HandlerType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.UUID;

/**
 * 请求日志处理器：生成请求标识、记录耗时并写入成功写操作的审计日志。
 *
 * @author dorian
 * @date 2026-11-28
 */
public class RequestLogger {
    private static final Logger log = LoggerFactory.getLogger(RequestLogger.class);
    private final AuditRepository audit;

    public RequestLogger(AuditRepository audit) {
        this.audit = audit;
    }

    public void register(RoutesConfig routes) {
        routes.before("/*", ctx -> {
            String requestId = UUID.randomUUID().toString().replace("-", "");
            ctx.attribute("requestId", requestId);
            ctx.attribute("requestStart", System.nanoTime());
            ctx.header("X-Request-Id", requestId);
        });
        routes.after("/*", ctx -> {
            Long start = ctx.attribute("requestStart");
            long durationMs = start == null ? 0 : (System.nanoTime() - start) / 1_000_000;
            User user = ctx.attribute("user");
            Long userId = user == null ? null : user.id();
            String requestId = ctx.attribute("requestId");
            int status = ctx.status().getCode();
            log.info("request_id={} method={} path={} status={} duration_ms={} user_id={}",
                    requestId, ctx.method(), ctx.path(), status, durationMs, userId);
            if (userId != null && ctx.path().startsWith("/api/")
                    && ctx.method() != HandlerType.GET && ctx.method() != HandlerType.OPTIONS
                    && status < 400) {
                audit.record(userId, ctx.method().name(), ctx.path(),
                        "status=" + status + ",duration_ms=" + durationMs + ",request_id=" + requestId);
            }
        });
    }
}
