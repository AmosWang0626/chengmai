package family.web;

import family.service.ApiException;
import io.javalin.config.RoutesConfig;

import java.util.Map;

/** 全局异常映射：业务异常按携带的状态码返回 {error}；未知异常兜底 500。 */
public class ErrorMapper {
    public void register(RoutesConfig routes) {
        routes.exception(ApiException.class, (e, ctx) ->
                ctx.status(e.status()).json(Map.of("error", e.getMessage())));

        routes.exception(Exception.class, (e, ctx) -> {
            e.printStackTrace();
            String msg = e.getMessage();
            // Jetty 在 multipart 超限时抛的异常不带状态码，按消息关键词识别为 413
            if (msg != null && (msg.contains("size") || msg.contains("exceed") || msg.contains("large"))) {
                ctx.status(413).json(Map.of("error", "图片大小不能超过 20MB"));
                return;
            }
            ctx.status(500).json(Map.of("error", "服务器内部错误"));
        });
    }
}