package family.web.controller;

import family.service.MemberService;
import family.util.Json;
import io.javalin.config.RoutesConfig;

import java.util.Map;

import static family.web.controller.AuthController.user;

/** 家族成员接口：列表 / 新增 / 更新 / 删除。写操作的管理员校验由 AuthInterceptor 统一完成。 */
public class MemberController {
    private final MemberService service;

    public MemberController(MemberService service) {
        this.service = service;
    }

    public void register(RoutesConfig routes) {
        routes.get("/api/members", ctx -> ctx.json(service.list()));

        routes.post("/api/members", ctx ->
                ctx.status(201).json(service.create(user(ctx), Json.toMap(ctx.body()))));

        routes.put("/api/members/{id}", ctx ->
                ctx.json(service.update(ctx.pathParam("id"), Json.toMap(ctx.body()))));

        routes.delete("/api/members/{id}", ctx -> {
            service.delete(ctx.pathParam("id"));
            ctx.json(Map.of("ok", true));
        });
    }
}