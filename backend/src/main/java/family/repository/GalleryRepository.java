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
            rs.getString("id"),
            rs.getString("user_id"),
            rs.getString("url"),
            rs.getString("thumbnail_url"),
            rs.getString("title"),
            rs.getString("description"),
            Json.toStringList(rs.getString("tags")),
            GalleryStatus.fromWire(rs.getString("status")),
            rs.getString("uploaded_at"),
            rs.getString("approved_at"),
            rs.getString("approved_by"));

    private final Database db;

    public GalleryRepository(Database db) {
        this.db = db;
    }

    /** 全部图片（管理员视角），新上传在前。 */
    public List<GalleryImage> findAllNewestFirst() {
        return db.query("SELECT * FROM gallery_images ORDER BY uploaded_at DESC", MAPPER);
    }

    /** 普通用户可见范围：已过审的 + 自己上传的（含待审核）。 */
    public List<GalleryImage> findVisible(String userId) {
        return db.query("SELECT * FROM gallery_images WHERE status = 'approved' OR user_id = ? ORDER BY uploaded_at DESC",
                MAPPER, userId);
    }

    public Optional<GalleryImage> findById(String id) {
        return db.queryOne("SELECT * FROM gallery_images WHERE id = ?", MAPPER, id);
    }

    public void insert(GalleryImage image) {
        db.update("INSERT INTO gallery_images (id, user_id, url, thumbnail_url, title, description, tags, status)" +
                        " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                image.id(), image.userId(), image.url(), image.thumbnailUrl(), image.title(), image.description(),
                Json.write(image.tags()), image.status().wire());
    }

    /** 仅改状态（拒绝/隐藏等），不触碰审核时间与审核人。 */
    public void updateStatus(String id, GalleryStatus status) {
        db.update("UPDATE gallery_images SET status = ? WHERE id = ?", status.wire(), id);
    }

    /** 审核通过：同时记录审核时间与审核人。 */
    public void updateStatusApproved(String id, String approvedAt, String approvedBy) {
        db.update("UPDATE gallery_images SET status = 'approved', approved_at = ?, approved_by = ? WHERE id = ?",
                approvedAt, approvedBy, id);
    }

    public void updateMeta(String id, String title, String description, String tagsJson) {
        db.update("UPDATE gallery_images SET title = ?, description = ?, tags = ? WHERE id = ?",
                title, description, tagsJson, id);
    }

    public void delete(String id) {
        db.update("DELETE FROM gallery_images WHERE id = ?", id);
    }
}