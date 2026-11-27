package family.web.controller;

import family.model.User;
import family.service.AuthService;
import family.util.Json;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;

import java.util.Map;

/** 认证接口：登录 / 当前用户 / 修改密码。薄控制器，只做解析与转发。 */
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    public void register(RoutesConfig routes) {
        // POST /api/auth/login —— 唯一无需 token 的接口
        routes.post("/api/auth/login", ctx -> {
            Map<String, Object> body = Json.toMap(ctx.body());
            ctx.json(auth.login(str(body.get("username")), str(body.get("password"))));
        });

        // GET /api/auth/me —— 返回当前登录用户
        routes.get("/api/auth/me", ctx ->
                ctx.json(Map.of("user", auth.view(user(ctx)))));

        // PUT /api/auth/password —— 修改自己的密码
        routes.put("/api/auth/password", ctx -> {
            Map<String, Object> body = Json.toMap(ctx.body());
            auth.changePassword(user(ctx), str(body.get("currentPassword")), str(body.get("newPassword")));
            ctx.json(Map.of("ok", true));
        });
    }

    /** 取鉴权拦截器挂载的当前用户（供各控制器静态导入复用）。 */
    static User user(Context ctx) {
        return ctx.attribute("user");
    }

    /** Object → String，null 安全。 */
    static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }
}