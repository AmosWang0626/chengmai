package family;

import family.config.AppConfig;
import family.db.Database;
import family.db.Schema;
import family.repository.GalleryRepository;
import family.repository.GenerationCharRepository;
import family.repository.MemberRepository;
import family.repository.UserRepository;
import family.service.AuthService;
import family.service.GalleryService;
import family.service.GenerationCharService;
import family.service.MemberService;
import family.service.UserService;
import family.web.ApiRouter;
import family.web.AuthInterceptor;
import family.web.CorsHandler;
import family.web.ErrorMapper;
import family.web.controller.AuthController;
import family.web.controller.GalleryController;
import family.web.controller.GenerationCharController;
import family.web.controller.MemberController;
import family.web.controller.UserController;
import io.javalin.Javalin;
import io.javalin.config.MultipartConfig;
import io.javalin.config.SizeUnit;
import io.javalin.http.staticfiles.Location;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/** 程序入口：手动构造注入装配各层（web → service → repository → db），启动 Javalin。 */
public class Main {
    public static void main(String[] args) throws Exception {
        // 配置与数据目录
        AppConfig config = AppConfig.fromEnv();
        Files.createDirectories(config.uploadsDir());

        // 数据库连接与建表（幂等）
        Database db = new Database(config.dbFile());
        Schema.init(db);

        // 仓储层
        UserRepository userRepo = new UserRepository(db);
        MemberRepository memberRepo = new MemberRepository(db);
        GenerationCharRepository charRepo = new GenerationCharRepository(db);
        GalleryRepository galleryRepo = new GalleryRepository(db);

        // 服务层
        AuthService authService = new AuthService(userRepo, config.jwtSecretFile());
        MemberService memberService = new MemberService(memberRepo, charRepo);
        GenerationCharService charService = new GenerationCharService(charRepo);
        GalleryService galleryService = new GalleryService(galleryRepo, config.uploadsDir(),
                config.maxFileSizeMb() * 1024 * 1024);
        UserService userService = new UserService(userRepo);

        Javalin app = Javalin.create(cfg -> {
            cfg.startup.showJavalinBanner = false;

            // 存在前端构建产物时同进程托管（同源模式）；CDN 部署时前端单独托管，经 CORS 跨域调 API
            Path dist = Paths.get(System.getenv().getOrDefault("STATIC_DIR", "frontend/dist")).toAbsolutePath();
            if (Files.isDirectory(dist)) {
                cfg.staticFiles.add(sf -> {
                    sf.hostedPath = "/";
                    sf.directory = dist.toString();
                    sf.location = Location.EXTERNAL;
                });
            }
            // multipart 上传大小限制（单文件 / 整个请求）
            MultipartConfig multipart = new MultipartConfig();
            multipart.maxFileSize(config.maxFileSizeMb(), SizeUnit.MB);
            multipart.maxTotalRequestSize(config.maxRequestSizeMb(), SizeUnit.MB);
            cfg.jetty.multipartConfig = multipart;

            // 横切关注点按序注册：CORS → 鉴权 → 异常映射 → 业务路由（Javalin 7 路由需在配置期注册）
            new CorsHandler().register(cfg.routes);
            new AuthInterceptor(authService).register(cfg.routes);
            new ErrorMapper().register(cfg.routes);
            new ApiRouter(
                    new AuthController(authService),
                    new MemberController(memberService),
                    new GenerationCharController(charService),
                    new GalleryController(galleryService),
                    new UserController(userService)
            ).register(cfg.routes);

            // 上传图片显式路由服务（/uploads/gallery/xxx）。
            // Javalin 7 多静态挂载的前缀剥离/匹配行为变化会导致 /uploads 404，故用显式路由保证确定性，并防路径穿越。
            cfg.routes.get("/uploads/*", ctx -> {
                String rel = ctx.path().substring("/uploads/".length());
                Path root = config.uploadsRoot();
                Path file = root.resolve(rel).normalize();
                if (!file.startsWith(root) || !Files.isRegularFile(file)) {
                    ctx.status(404).result("not found");
                    return;
                }
                String type = Files.probeContentType(file);
                ctx.contentType(type != null ? type : "application/octet-stream");
                ctx.header("Cache-Control", "public, max-age=86400");
                ctx.result(Files.newInputStream(file));
            });
        });

        app.start(config.port());
        System.out.println("家谱后端(Java)已启动: http://localhost:" + config.port());
    }
}