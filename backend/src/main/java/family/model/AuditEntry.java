package family.model;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

/**
 * 审计日志实体，对应 audit_logs 表中的一条记录。
 *
 * @author dorian
 * @date 2026-11-28
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AuditEntry(Long id, Long userId, String action, String target, String detail, String createdAt) {
}
