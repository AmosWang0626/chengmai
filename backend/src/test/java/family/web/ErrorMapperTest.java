package family.web;

import family.service.ApiException;
import family.util.Json;
import io.javalin.Javalin;
import io.javalin.config.RoutesConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * 全局异常映射测试：HTTP、业务与未知异常均直接返回错误响应，避免异常处理器递归。
 *
 * @author dorian
 * @date 2026-11-28
 */
class ErrorMapperTest {
    private Javalin app;
    private HttpClient client;

    @BeforeEach
    void setUp() {
        app = Javalin.create(config -> {
            new ErrorMapper().register(config.routes);
            config.routes.get("/business-error", ctx -> {
                throw new ApiException(409, "业务冲突");
            });
            config.routes.get("/unexpected-error", ctx -> {
                throw new IllegalStateException("测试异常");
            });
        }).start(0);
        client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    }

    @AfterEach
    void tearDown() {
        app.stop();
    }

    @Test
    @Timeout(5)
    @DisplayName("未知路由直接返回 JSON 404 而不触发异常处理器递归")
    void notFoundReturnsJsonWithoutRecursion() throws Exception {
        HttpResponse<String> response = get("/missing");

        assertEquals(404, response.statusCode());
        assertEquals("Endpoint GET /missing not found", Json.toMap(response.body()).get("error"));
    }

    @Test
    @Timeout(5)
    @DisplayName("业务异常保留自定义状态码与提示")
    void businessErrorPreservesStatusAndMessage() throws Exception {
        HttpResponse<String> response = get("/business-error");

        assertEquals(409, response.statusCode());
        assertEquals("业务冲突", Json.toMap(response.body()).get("error"));
    }

    @Test
    @Timeout(5)
    @DisplayName("未知异常返回 JSON 500 而不泄露内部信息")
    void unexpectedErrorReturnsSafeJson() throws Exception {
        HttpResponse<String> response = get("/unexpected-error");

        assertEquals(500, response.statusCode());
        assertEquals("服务器内部错误", Json.toMap(response.body()).get("error"));
    }

    private HttpResponse<String> get(String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + app.port() + path))
                .timeout(Duration.ofSeconds(3))
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertNotNull(response.body());
        return response;
    }
}
