package family.web;

import io.javalin.config.RoutesConfig;

import java.util.List;
import java.util.Set;

/** CORS：仅允许显式配置的来源，默认保留本地开发端口。 */
public class CorsHandler {
    private final Set<String> allowedOrigins;

    public CorsHandler(List<String> allowedOrigins) {
        this.allowedOrigins = Set.copyOf(allowedOrigins);
    }

    public void register(RoutesConfig routes) {
        routes.before("/api/*", ctx -> {
            String origin = ctx.header("Origin");
            if (origin != null && allowedOrigins.contains(origin)) {
                ctx.header("Access-Control-Allow-Origin", origin);
                ctx.header("Vary", "Origin");
            }
            ctx.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
            ctx.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
            ctx.header("Access-Control-Max-Age", "86400");
        });
        routes.options("/api/*", ctx -> {
            String origin = ctx.header("Origin");
            if (origin != null && !allowedOrigins.contains(origin)) {
                ctx.status(403);
                return;
            }
            ctx.status(204);
        });
    }
}