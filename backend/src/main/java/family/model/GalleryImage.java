package family.model;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

/**
 * 相册图片实体：url/thumbnailUrl 为相对路径（/uploads/gallery/xxx），前端经 assetUrl 补全。
 *
 * @author dorian
 * @date 2026-11-19
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record GalleryImage(
        Long id,
        Long userId,          // 上传者
        String url,
        String thumbnailUrl,
        String title,
        String description,
        List<String> tags,      // 库中以 JSON 字符串存储，读写时转换
        GalleryStatus status,   // 新上传默认 pending，管理员审核后 approved
        String uploadedAt,
        String approvedAt,      // 仅审核通过时写入
        Long approvedBy) {    // 审核人 id
}