package family.service;

import family.model.GalleryImage;
import family.model.GalleryStatus;
import family.model.Role;
import family.model.User;
import family.repository.GalleryRepository;
import family.util.Json;
import family.util.Time;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * 相册服务：上传落盘、审核、元信息维护、删除（连同物理文件）。
 *
 * @author dorian
 * @date 2026-11-19
 */
public class GalleryService {
    /**
     * 上传文件的内存表示，与 HTTP 层解耦，便于测试。
     *
     * @author dorian
     * @date 2026-11-19
     */
    public record UploadFile(String originalName, String contentType, byte[] bytes) {
    }

    /**
     * 图片文件访问结果：包含磁盘路径与内容类型。
     *
     * @author dorian
     * @date 2026-11-19
     */
    public record ImageFile(Path path, String contentType) {
    }

    /** 允许的扩展名白名单；不在名单内的一律按 .png 落盘。 */
    private static final Set<String> ALLOWED_EXT = Set.of(".png", ".jpg", ".jpeg", ".gif", ".webp");

    private final GalleryRepository gallery;
    private final Path uploadsDir;
    private final long maxFileSize;

    public GalleryService(GalleryRepository gallery, Path uploadsDir, long maxFileSize) {
        this.gallery = gallery;
        this.uploadsDir = uploadsDir;
        this.maxFileSize = maxFileSize;
    }

    /** 管理员看全部；普通用户看过审的 + 自己上传的。 */
    public List<GalleryImage> list(User user) {
        return user.role() == Role.ADMIN ? gallery.findAllNewestFirst() : gallery.findVisible(user.id());
    }

    /** 按数据库中的 URL 打开图片；普通用户只能读取已过审或自己上传的图片。 */
    public ImageFile openFile(User user, String url) {
        if (url == null || url.isBlank()) {
            throw new ApiException(404, "图片不存在");
        }
        GalleryImage image = gallery.findByUrl(url).orElseThrow(() -> new ApiException(404, "图片不存在"));
        boolean visible = user.role() == Role.ADMIN
                || image.status() == GalleryStatus.APPROVED
                || Objects.equals(image.userId(), user.id());
        if (!visible) {
            throw new ApiException(403, "无权访问该图片");
        }
        String name = url.substring(url.lastIndexOf('/') + 1);
        Path root = uploadsDir.toAbsolutePath().normalize();
        Path file = root.resolve(name).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            throw new ApiException(404, "图片文件不存在");
        }
        String contentType;
        try {
            contentType = Files.probeContentType(file);
        } catch (Exception e) {
            contentType = null;
        }
        return new ImageFile(file, contentType == null ? "application/octet-stream" : contentType);
    }

    /** 上传图片（可选缩略图）：校验类型与大小，UUID 重命名落盘，初始状态 pending。 */
    public GalleryImage upload(User actor, UploadFile file, UploadFile thumbnail,
                               String title, String description, String tagsJson) {
        if (file == null) {
            throw new ApiException(400, "请选择图片文件");
        }
        List<UploadFile> files = new ArrayList<>();
        files.add(file);
        if (thumbnail != null) files.add(thumbnail);
        for (UploadFile f : files) {
            if (f.contentType() == null || !f.contentType().startsWith("image/")) {
                throw new ApiException(400, "只允许上传图片文件");
            }
            if (f.bytes().length > maxFileSize) {
                throw new ApiException(413, "图片大小不能超过 20MB");
            }
            if (!hasImageSignature(f.bytes())) {
                throw new ApiException(400, "图片内容与格式不匹配");
            }
        }
        String fileName = null;
        String thumbName = null;
        try {
            fileName = save(file);
            thumbName = thumbnail == null ? null : save(thumbnail);
            List<String> tags = tagsJson == null || tagsJson.isEmpty() ? List.of() : Json.toStringList(tagsJson);
            long id = gallery.insert(new GalleryImage(
                    null, actor.id(),
                    "/uploads/gallery/" + fileName,
                    thumbName == null ? null : "/uploads/gallery/" + thumbName,
                    title == null || title.isEmpty() ? null : title,
                    description == null || description.isEmpty() ? null : description,
                    tags, GalleryStatus.PENDING, null, null, null));
            return gallery.findById(id).orElseThrow();
        } catch (RuntimeException e) {
            if (fileName != null) deleteFile(fileName);
            if (thumbName != null) deleteFile(thumbName);
            throw e;
        }
    }

    /** 审核：通过时记录时间与审核人；其他状态仅改状态位。 */
    public GalleryImage review(long id, String statusWire, User actor) {
        gallery.findById(id).orElseThrow(() -> new ApiException(404, "图片不存在"));
        GalleryStatus status = GalleryStatus.parseOrNull(statusWire);
        if (status == null) {
            throw new ApiException(400, "无效的状态");
        }
        if (status == GalleryStatus.APPROVED) {
            gallery.updateStatusApproved(id, Time.isoNow(), actor.id());
        } else {
            gallery.updateStatus(id, status);
        }
        return gallery.findById(id).orElseThrow();
    }

    /** 部分更新标题/描述/标签，未传字段沿用原值。 */
    public GalleryImage updateMeta(long id, Map<String, Object> body) {
        GalleryImage existing = gallery.findById(id)
                .orElseThrow(() -> new ApiException(404, "图片不存在"));
        String title = body.containsKey("title") ? str(body.get("title")) : existing.title();
        String description = body.containsKey("description") ? str(body.get("description")) : existing.description();
        String tagsJson = body.containsKey("tags") ? Json.write(body.get("tags")) : Json.write(existing.tags());
        gallery.updateMeta(id, title, description, tagsJson);
        return gallery.findById(id).orElseThrow();
    }

    /** 删除记录并清理原图与缩略图文件。 */
    public void delete(long id) {
        GalleryImage existing = gallery.findById(id)
                .orElseThrow(() -> new ApiException(404, "图片不存在"));
        gallery.delete(id);
        deleteFiles(existing.url(), existing.thumbnailUrl());
    }

    /** UUID 重命名落盘，避免原始文件名带来的冲突与路径风险。 */
    private String save(UploadFile file) {
        String original = file.originalName();
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0) ext = original.substring(dot).toLowerCase();
        if (!ALLOWED_EXT.contains(ext)) {
            throw new ApiException(400, "不支持的图片扩展名");
        }
        String name = UUID.randomUUID() + ext;
        try {
            Files.createDirectories(uploadsDir);
            Files.write(uploadsDir.resolve(name), file.bytes());
        } catch (Exception e) {
            throw new RuntimeException("图片保存失败", e);
        }
        return name;
    }

    private static boolean hasImageSignature(byte[] bytes) {
        if (bytes == null || bytes.length < 12) return false;
        if (bytes[0] == (byte) 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') return true;
        if ((bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) return true;
        if (bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == '8') return true;
        return bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
    }

    private void deleteFile(String name) {
        if (name == null) return;
        Path root = uploadsDir.toAbsolutePath().normalize();
        Path file = root.resolve(name).normalize();
        if (!file.startsWith(root)) return;
        try {
            Files.deleteIfExists(file);
        } catch (Exception ignored) {
        }
    }

    /** 只取 URL 末段文件名删除，并校验仍在上传目录内（防路径穿越）。 */
    private void deleteFiles(String url, String thumbnailUrl) {
        for (String s : new String[]{url, thumbnailUrl}) {
            if (s == null) continue;
            deleteFile(s.substring(s.lastIndexOf('/') + 1));
        }
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }
}