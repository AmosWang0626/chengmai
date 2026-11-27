package family.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

/** 应用配置：端口与数据目录取自环境变量，上传限制为固定常量。 */
public record AppConfig(int port, Path dataDir, long maxFileSizeMb, long maxRequestSizeMb, List<String> corsOrigins) {

    /** 从环境变量构建：PORT、DATA_DIR、CORS_ORIGINS；默认只允许本地开发前端跨域。 */
    public static AppConfig fromEnv() {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        Path dataDir = Paths.get(System.getenv().getOrDefault("DATA_DIR", "data")).toAbsolutePath();
        String origins = System.getenv().getOrDefault("CORS_ORIGINS",
                "http://localhost:3266,http://127.0.0.1:3266");
        List<String> corsOrigins = Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
        return new AppConfig(port, dataDir, 20, 45, corsOrigins);
    }

    /** 上传文件静态服务根目录：data/uploads。 */
    public Path uploadsRoot() {
        return dataDir.resolve("uploads");
    }

    /** 相册图片实际落盘目录：data/uploads/gallery。 */
    public Path uploadsDir() {
        return uploadsRoot().resolve("gallery");
    }

    /** SQLite 数据库文件路径。 */
    public Path dbFile() {
        return dataDir.resolve("family.db");
    }

    /** JWT 签名密钥文件（与 Node 版共用同一份，保证 token 互通）。 */
    public Path jwtSecretFile() {
        return dataDir.resolve(".jwt-secret");
    }
}