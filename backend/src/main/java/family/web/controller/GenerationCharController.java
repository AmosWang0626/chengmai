package family.web.controller;

import family.service.ApiException;
import family.service.GenerationCharService;
import family.util.Json;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;

import java.util.Map;

import static family.web.controller.AuthController.str;

/**
 * 字辈配置接口：列表 / 新增 / 更新 / 删除。
 *
 * @author dorian
 * @date 2026-11-19
 */
public class GenerationCharController {
    private final GenerationCharService service;

    public GenerationCharController(GenerationCharService service) {
        this.service = service;
    }

    public void register(RoutesConfig routes) {
        routes.get("/api/generation-chars", ctx -> ctx.json(service.list()));

        routes.post("/api/generation-chars", ctx -> {
            Map<String, Object> body = Json.toMap(ctx.body());
            ctx.status(201).json(service.create(body.get("generation"), str(body.get("char")), body.get("hidden")));
        });

        routes.put("/api/generation-chars/{id}", ctx ->
                ctx.json(service.update(idParam(ctx), Json.toMap(ctx.body()))));

        routes.delete("/api/generation-chars/{id}", ctx -> {
            service.delete(idParam(ctx));
            ctx.json(Map.of("ok", true));
        });
    }

    /** 路径参数转 int；非数字按“不存在”处理（与 Node 版 404 行为一致）。 */
    private static int idParam(Context ctx) {
        try {
            return Integer.parseInt(ctx.pathParam("id"));
        } catch (NumberFormatException e) {
            throw new ApiException(404, "字辈配置不存在");
        }
    }
}