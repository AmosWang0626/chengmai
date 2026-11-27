package family.web.controller;

import family.service.ApiException;
import family.service.GalleryService;
import family.service.GalleryService.UploadFile;
import family.util.Json;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;
import io.javalin.http.UploadedFile;

import java.util.Map;

import static family.web.controller.AuthController.str;
import static family.web.controller.AuthController.user;

/**
 * 相册接口：列表 / 上传(multipart) / 审核 / 改元信息 / 删除。
 *
 * @author dorian
 * @date 2026-11-19
 */
public class GalleryController {
    private final GalleryService service;

    public GalleryController(GalleryService service) {
        this.service = service;
    }

    public void register(RoutesConfig routes) {
        routes.get("/api/gallery/file", ctx -> {
            GalleryService.ImageFile file = service.openFile(user(ctx), ctx.queryParam("path"));
            ctx.contentType(file.contentType());
            ctx.header("Cache-Control", "private, max-age=300");
            ctx.result(java.nio.file.Files.newInputStream(file.path()));
        });

        routes.get("/api/gallery", ctx -> ctx.json(service.list(user(ctx))));

        // multipart 表单：file 必填，thumbnail 可选，其余为文本字段
        routes.post("/api/gallery", ctx -> {
            UploadFile file = toUpload(ctx.uploadedFile("file"));
            UploadFile thumbnail = toUpload(ctx.uploadedFile("thumbnail"));
            ctx.status(201).json(service.upload(user(ctx), file, thumbnail,
                    ctx.formParam("title"), ctx.formParam("description"), ctx.formParam("tags")));
        });

        routes.patch("/api/gallery/{id}/status", ctx ->
                ctx.json(service.review(idParam(ctx), str(Json.toMap(ctx.body()).get("status")), user(ctx))));

        routes.put("/api/gallery/{id}", ctx ->
                ctx.json(service.updateMeta(idParam(ctx), Json.toMap(ctx.body()))));

        routes.delete("/api/gallery/{id}", ctx -> {
            service.delete(idParam(ctx));
            ctx.json(Map.of("ok", true));
        });
    }

    /** 路径参数转 long；非数字按“不存在”处理。 */
    private static long idParam(Context ctx) {
        try {
            return Long.parseLong(ctx.pathParam("id"));
        } catch (NumberFormatException e) {
            throw new ApiException(404, "图片不存在");
        }
    }

    /** Javalin 上传文件 → 服务层内存表示（读尽字节流）。 */
    private static UploadFile toUpload(UploadedFile file) throws Exception {
        if (file == null) return null;
        return new UploadFile(file.filename(), file.contentType(), file.content().readAllBytes());
    }
}