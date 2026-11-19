package family.web;

import family.model.Role;
import family.model.User;
import family.service.ApiException;
import family.service.AuthService;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;
import io.javalin.http.HandlerType;

/** 统一鉴权拦截器：校验 token 并把当前用户挂到 ctx.attribute("user")，再按路由矩阵判定管理员权限。 */
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
            if (needsAdmin(ctx) && user.role() != Role.ADMIN) {
                throw new ApiException(403, "需要管理员权限");
            }
        });
    }

    /** 权限矩阵：账号管理全需管理员；成员/字辈写操作需管理员；相册审核/改/删需管理员；其余登录即可。 */
    private static boolean needsAdmin(Context ctx) {
        String path = ctx.path();
        String method = ctx.method().name();
        if (path.startsWith("/api/users")) return true;
        if (path.startsWith("/api/members") || path.startsWith("/api/generation-chars")) return !"GET".equals(method);
        if (path.startsWith("/api/gallery")) {
            return "PATCH".equals(method) || "PUT".equals(method) || "DELETE".equals(method);
        }
        return false;
    }
}