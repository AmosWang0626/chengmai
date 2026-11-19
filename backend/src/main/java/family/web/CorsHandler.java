package family.web;

import io.javalin.config.RoutesConfig;

/** CORS 处理：允许任意来源跨域调用 API（前端可独立部署到 CDN），预检直接 204。 */
public class CorsHandler {
    public void register(RoutesConfig routes) {
        routes.before("/api/*", ctx -> {
            ctx.header("Access-Control-Allow-Origin", "*");
            ctx.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
            ctx.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
            ctx.header("Access-Control-Max-Age", "86400");
        });
        routes.options("/api/*", ctx -> ctx.status(204));
    }
}