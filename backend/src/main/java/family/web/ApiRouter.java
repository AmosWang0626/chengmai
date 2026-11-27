package family.web;

import family.web.controller.AuditController;
import family.web.controller.AuthController;
import family.web.controller.GalleryController;
import family.web.controller.GenerationCharController;
import family.web.controller.MemberController;
import family.web.controller.UserController;
import io.javalin.config.RoutesConfig;

/** 路由汇总：把五个控制器的路由一次性注册到 Javalin。 */
public class ApiRouter {
    private final AuthController auth;
    private final MemberController members;
    private final GenerationCharController chars;
    private final GalleryController gallery;
    private final UserController users;
    private final AuditController audit;

    public ApiRouter(AuthController auth, MemberController members, GenerationCharController chars,
                     GalleryController gallery, UserController users, AuditController audit) {
        this.auth = auth;
        this.members = members;
        this.chars = chars;
        this.gallery = gallery;
        this.users = users;
        this.audit = audit;
    }

    public void register(RoutesConfig routes) {
        auth.register(routes);
        members.register(routes);
        chars.register(routes);
        gallery.register(routes);
        users.register(routes);
        audit.register(routes);
    }
}