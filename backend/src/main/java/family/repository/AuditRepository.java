package family.repository;

import family.db.Database;
import family.db.RowMapper;
import family.model.AuditEntry;

import java.util.List;

public class AuditRepository {
    private static final RowMapper<AuditEntry> MAPPER = rs -> new AuditEntry(
            rs.getLong("id"), RowMapper.longOrNull(rs, "user_id"), rs.getString("action"),
            rs.getString("target"), rs.getString("detail"), rs.getString("created_at"));

    private final Database db;

    public AuditRepository(Database db) {
        this.db = db;
    }

    public void record(Long userId, String action, String target, String detail) {
        db.insert("INSERT INTO audit_logs (user_id, action, target, detail) VALUES (?, ?, ?, ?)",
                userId, action, target, detail);
    }

    public List<AuditEntry> findRecent(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 500));
        return db.query("SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?", MAPPER, safeLimit);
    }
}
