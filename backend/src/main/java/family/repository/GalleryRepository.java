package family.repository;

import family.db.Database;
import family.db.RowMapper;
import family.model.GalleryImage;
import family.model.GalleryStatus;
import family.util.Json;

import java.util.List;
import java.util.Optional;

/** 相册图片表 DAO：tags 在库中为 JSON 字符串，映射时转为 List。 */
public class GalleryRepository {
    private static final RowMapper<GalleryImage> MAPPER = rs -> new GalleryImage(
            rs.getLong("id"),
            RowMapper.longOrNull(rs, "user_id"),
            rs.getString("url"),
            rs.getString("thumbnail_url"),
            rs.getString("title"),
            rs.getString("description"),
            Json.toStringList(rs.getString("tags")),
            GalleryStatus.fromWire(rs.getString("status")),
            rs.getString("uploaded_at"),
            rs.getString("approved_at"),
            RowMapper.longOrNull(rs, "approved_by"));

    private final Database db;

    public GalleryRepository(Database db) {
        this.db = db;
    }

    /** 全部图片（管理员视角），新上传在前。 */
    public List<GalleryImage> findAllNewestFirst() {
        return db.query("SELECT * FROM gallery_images ORDER BY uploaded_at DESC", MAPPER);
    }

    /** 普通用户可见范围：已过审的 + 自己上传的（含待审核）。 */
    public List<GalleryImage> findVisible(long userId) {
        return db.query("SELECT * FROM gallery_images WHERE status = 'approved' OR user_id = ? ORDER BY uploaded_at DESC",
                MAPPER, userId);
    }

    public Optional<GalleryImage> findById(long id) {
        return db.queryOne("SELECT * FROM gallery_images WHERE id = ?", MAPPER, id);
    }

    public Optional<GalleryImage> findByUrl(String url) {
        return db.queryOne("SELECT * FROM gallery_images WHERE url = ? OR thumbnail_url = ?", MAPPER, url, url);
    }

    /** 插入图片记录并返回自增 id。 */
    public long insert(GalleryImage image) {
        return db.insert("INSERT INTO gallery_images (user_id, url, thumbnail_url, title, description, tags, status)" +
                        " VALUES (?, ?, ?, ?, ?, ?, ?)",
                image.userId(), image.url(), image.thumbnailUrl(), image.title(), image.description(),
                Json.write(image.tags()), image.status().wire());
    }

    /** 拒绝/隐藏时同步清除审核信息，避免状态与元数据矛盾。 */
    public void updateStatus(long id, GalleryStatus status) {
        db.update("UPDATE gallery_images SET status = ?, approved_at = NULL, approved_by = NULL WHERE id = ?",
                status.wire(), id);
    }

    /** 审核通过：同时记录审核时间与审核人。 */
    public void updateStatusApproved(long id, String approvedAt, Long approvedBy) {
        db.update("UPDATE gallery_images SET status = 'approved', approved_at = ?, approved_by = ? WHERE id = ?",
                approvedAt, approvedBy, id);
    }

    public void updateMeta(long id, String title, String description, String tagsJson) {
        db.update("UPDATE gallery_images SET title = ?, description = ?, tags = ? WHERE id = ?",
                title, description, tagsJson, id);
    }

    public void delete(long id) {
        db.update("DELETE FROM gallery_images WHERE id = ?", id);
    }
}