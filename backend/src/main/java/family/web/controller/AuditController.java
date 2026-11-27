package family.web.controller;

import family.repository.AuditRepository;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;

public class AuditController {
    private final AuditRepository audit;

    public AuditController(AuditRepository audit) {
        this.audit = audit;
    }

    public void register(RoutesConfig routes) {
        routes.get("/api/audit", ctx -> {
            int limit = 50;
            try {
                limit = Integer.parseInt(ctx.queryParam("limit"));
            } catch (NumberFormatException ignored) {
            }
            ctx.json(audit.findRecent(limit));
        });
    }
}
