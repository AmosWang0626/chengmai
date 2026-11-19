package family.web.controller;

import family.service.ApiException;
import family.service.UserService;
import family.util.Json;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;

import java.util.Map;

import static family.web.controller.AuthController.str;
import static family.web.controller.AuthController.user;

/** 账号管理接口：列表 / 创建 / 改角色 / 删除。整组路由均需管理员权限（见 AuthInterceptor）。 */
public class UserController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    public void register(RoutesConfig routes) {
        routes.get("/api/users", ctx -> ctx.json(service.list()));

        routes.post("/api/users", ctx -> {
            Map<String, Object> body = Json.toMap(ctx.body());
            ctx.status(201).json(service.create(str(body.get("username")), str(body.get("password")), str(body.get("role"))));
        });

        routes.put("/api/users/{id}/role", ctx ->
                ctx.json(service.updateRole(idParam(ctx), str(Json.toMap(ctx.body()).get("role")))));

        routes.delete("/api/users/{id}", ctx -> {
            service.delete(idParam(ctx), user(ctx));
            ctx.json(Map.of("ok", true));
        });
    }

    /** 路径参数转 long；非数字按“不存在”处理。 */
    private static long idParam(Context ctx) {
        try {
            return Long.parseLong(ctx.pathParam("id"));
        } catch (NumberFormatException e) {
            throw new ApiException(404, "账号不存在");
        }
    }
}