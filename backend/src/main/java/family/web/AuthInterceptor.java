package family.web;

import family.model.Role;
import family.model.User;
import family.service.ApiException;
import family.service.AuthService;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;
import io.javalin.http.HandlerType;

/**
 * 统一鉴权拦截器：校验 token 并把当前用户挂到 ctx.attribute("user")，再按路由矩阵判定管理员权限。
 *
 * @author dorian
 * @date 2026-11-19
 */
public class AuthInterceptor {
    private final AuthService auth;

    public AuthInterceptor(AuthService auth) {
        this.auth = auth;
    }

    public void register(RoutesConfig routes) {
        routes.before("/api/*", ctx -> {
            // 预检与登录接口放行
            if (ctx.method() == HandlerType.OPTIONS) return;
            if (ctx.method() == HandlerType.POST && ctx.path().equals("/api/auth/login")) return;
            User user = auth.requireUser(ctx.header("Authorization"));
            ctx.attribute("user", user);
            if (auth.requiresPasswordChange(user)
                    && !ctx.path().equals("/api/auth/me")
                    && !ctx.path().equals("/api/auth/password")) {
                throw new ApiException(403, "请先修改默认密码");
            }
            if (!allowed(ctx, user)) {
                throw new ApiException(403, "需要相应角色权限");
            }
        });
    }

    /** 权限矩阵：admin 全权；editor 可维护成员与字辈；viewer 只读并可上传/查看自己的照片。 */
    private static boolean allowed(Context ctx, User user) {
        String path = ctx.path();
        String method = ctx.method().name();
        if (path.startsWith("/api/users") || path.startsWith("/api/audit")) {
            return user.role() == Role.ADMIN;
        }
        if (path.startsWith("/api/members") || path.startsWith("/api/generation-chars")) {
            return "GET".equals(method) || user.role() == Role.ADMIN || user.role() == Role.EDITOR;
        }
        if (path.startsWith("/api/gallery")) {
            return "GET".equals(method) || "POST".equals(method) || user.role() == Role.ADMIN;
        }
        return true;
    }
}