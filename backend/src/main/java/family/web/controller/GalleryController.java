package family.web.controller;

import family.service.GalleryService;
import family.service.GalleryService.UploadFile;
import family.util.Json;
import io.javalin.config.RoutesConfig;
import io.javalin.http.UploadedFile;

import java.util.Map;

import static family.web.controller.AuthController.str;
import static family.web.controller.AuthController.user;

/** 相册接口：列表 / 上传(multipart) / 审核 / 改元信息 / 删除。 */
public class GalleryController {
    private final GalleryService service;

    public GalleryController(GalleryService service) {
        this.service = service;
    }

    public void register(RoutesConfig routes) {
        routes.get("/api/gallery", ctx -> ctx.json(service.list(user(ctx))));

        // multipart 表单：file 必填，thumbnail 可选，其余为文本字段
        routes.post("/api/gallery", ctx -> {
            UploadFile file = toUpload(ctx.uploadedFile("file"));
            UploadFile thumbnail = toUpload(ctx.uploadedFile("thumbnail"));
            ctx.status(201).json(service.upload(user(ctx), file, thumbnail,
                    ctx.formParam("title"), ctx.formParam("description"), ctx.formParam("tags")));
        });

        routes.patch("/api/gallery/{id}/status", ctx ->
                ctx.json(service.review(ctx.pathParam("id"), str(Json.toMap(ctx.body()).get("status")), user(ctx))));

        routes.put("/api/gallery/{id}", ctx ->
                ctx.json(service.updateMeta(ctx.pathParam("id"), Json.toMap(ctx.body()))));

        routes.delete("/api/gallery/{id}", ctx -> {
            service.delete(ctx.pathParam("id"));
            ctx.json(Map.of("ok", true));
        });
    }

    /** Javalin 上传文件 → 服务层内存表示（读尽字节流）。 */
    private static UploadFile toUpload(UploadedFile file) throws Exception {
        if (file == null) return null;
        return new UploadFile(file.filename(), file.contentType(), file.content().readAllBytes());
    }
}