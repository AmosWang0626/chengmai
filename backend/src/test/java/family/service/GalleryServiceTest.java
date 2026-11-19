package family.service;

import family.db.Database;
import family.db.Schema;
import family.model.GalleryImage;
import family.model.GalleryStatus;
import family.model.Role;
import family.model.User;
import family.repository.GalleryRepository;
import family.repository.UserRepository;
import family.service.GalleryService.UploadFile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/** 相册服务测试：上传落盘、审核、可见性、删除时清理文件（临时目录隔离）。 */
class GalleryServiceTest {
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    @TempDir
    Path uploads;

    private GalleryService service;
    private GalleryRepository repo;
    private UserRepository users;
    private final User admin = new User("a1", "admin", "x", null, Role.ADMIN, null);
    private final User viewer = new User("v1", "viewer", "x", null, Role.VIEWER, null);

    @BeforeEach
    void setup() {
        Database db = Database.inMemory();
        Schema.init(db);
        users = new UserRepository(db);
        users.insert(admin);
        users.insert(viewer);
        repo = new GalleryRepository(db);
        service = new GalleryService(repo, uploads, 20L * 1024 * 1024);
    }

    private UploadFile png(String name) {
        return new UploadFile(name, "image/png", PNG);
    }

    @Test
    @DisplayName("上传落盘并进入待审核")
    void uploadPersistsFileAndStartsPending() throws Exception {
        GalleryImage img = service.upload(admin, png("a.png"), null, "标题", null, "[\"地契\"]");
        assertEquals(GalleryStatus.PENDING, img.status());
        assertEquals(List.of("地契"), img.tags());
        assertTrue(img.url().startsWith("/uploads/gallery/"));
        assertTrue(img.url().endsWith(".png"));
        String name = img.url().substring(img.url().lastIndexOf('/') + 1);
        assertTrue(Files.exists(uploads.resolve(name)));
    }

    @Test
    @DisplayName("非图片与超大文件拒绝")
    void nonImageAndOversizedFileRejected() {
        UploadFile txt = new UploadFile("x.txt", "text/plain", PNG);
        assertEquals(400, assertThrows(ApiException.class, () -> service.upload(admin, txt, null, null, null, null)).status());
        UploadFile big = new UploadFile("big.png", "image/png", new byte[21 * 1024 * 1024]);
        assertEquals(413, assertThrows(ApiException.class, () -> service.upload(admin, big, null, null, null, null)).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.upload(admin, null, null, null, null, null)).status());
    }

    @Test
    @DisplayName("审核通过记录时间与审核人")
    void approvalRecordsTimestampAndReviewer() {
        GalleryImage img = service.upload(viewer, png("a.png"), null, null, null, null);
        GalleryImage approved = service.review(img.id(), "approved", admin);
        assertEquals(GalleryStatus.APPROVED, approved.status());
        assertNotNull(approved.approvedAt());
        assertEquals("a1", approved.approvedBy());
        assertEquals(400, assertThrows(ApiException.class, () -> service.review(img.id(), "bogus", admin)).status());
    }

    @Test
    @DisplayName("可见性按角色区分")
    void visibilityDependsOnRole() {
        GalleryImage pending = service.upload(viewer, png("a.png"), null, null, null, null);
        assertEquals(1, service.list(admin).size(), "管理员看全部");
        assertEquals(1, service.list(viewer).size(), "上传者看自己的待审核图");
        User other = new User("v2", "other", "x", null, Role.VIEWER, null);
        users.insert(other);
        assertEquals(0, service.list(other).size(), "其他人看不到待审核图");
        service.review(pending.id(), "approved", admin);
        assertEquals(1, service.list(other).size(), "过审后所有人可见");
    }

    @Test
    @DisplayName("更新元信息")
    void updateMetadata() {
        GalleryImage img = service.upload(admin, png("a.png"), null, "旧", null, null);
        GalleryImage updated = service.updateMeta(img.id(), Map.of("title", "新", "tags", List.of("坟园")));
        assertEquals("新", updated.title());
        assertEquals(List.of("坟园"), updated.tags());
    }

    @Test
    @DisplayName("删除同时移除文件")
    void deleteAlsoRemovesFiles() {
        GalleryImage img = service.upload(admin, png("a.png"), png("t.png"), null, null, null);
        String name = img.url().substring(img.url().lastIndexOf('/') + 1);
        String thumbName = img.thumbnailUrl().substring(img.thumbnailUrl().lastIndexOf('/') + 1);
        service.delete(img.id());
        assertTrue(repo.findById(img.id()).isEmpty());
        assertFalse(Files.exists(uploads.resolve(name)));
        assertFalse(Files.exists(uploads.resolve(thumbName)));
    }
}