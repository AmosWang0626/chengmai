package family.web.controller;

import family.service.ApiException;
import family.service.MemberService;
import family.util.Json;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;

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

        routes.post("/api/members/batch", ctx ->
                ctx.status(201).json(service.createBatch(user(ctx), Json.toMapList(ctx.body()))));

        routes.put("/api/members/{id}", ctx ->
                ctx.json(service.update(idParam(ctx), Json.toMap(ctx.body()))));

        routes.delete("/api/members/{id}", ctx -> {
            service.delete(idParam(ctx));
            ctx.json(Map.of("ok", true));
        });
    }

    /** 路径参数转 long；非数字按“不存在”处理。 */
    private static long idParam(Context ctx) {
        try {
            return Long.parseLong(ctx.pathParam("id"));
        } catch (NumberFormatException e) {
            throw new ApiException(404, "成员不存在");
        }
    }
}