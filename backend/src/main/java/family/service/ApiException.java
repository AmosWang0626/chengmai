package family.service;

/**
 * 业务异常：携带 HTTP 状态码与中文提示，由 ErrorMapper 统一转成 {error: ...} 响应。
 *
 * @author dorian
 * @date 2026-11-19
 */
public class ApiException extends RuntimeException {
    private final int status;

    public ApiException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int status() {
        return status;
    }
}