package family.service;

import family.db.Database;
import family.db.Schema;
import family.model.Role;
import family.model.User;
import family.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

/** 认证服务测试：bcryptjs 旧哈希兼容、JWT 往返与失效、密钥持久化、改密。 */
class AuthServiceTest {
    // bcryptjs 2.4.3 生成的 "123456" 哈希，验证跨实现兼容
    private static final String BCRYPTJS_HASH = "$2a$10$ulyBgdJp521VV.2EQWDCG.QI.Wi1T8.6U4B9k1TLDnP0BTpAJuGce";

    @TempDir
    Path tempDir;

    private AuthService service;
    private UserRepository users;
    private final User user = new User("u1", "tester@family.local", BCRYPTJS_HASH, null, Role.ADMIN, null);

    @BeforeEach
    void setup() {
        Database db = Database.inMemory();
        Schema.init(db);
        users = new UserRepository(db);
        users.insert(user);
        service = new AuthService(users, tempDir.resolve(".jwt-secret"));
    }

    @Test
    void 兼容bcryptjs旧密码哈希() {
        AuthService.LoginResult result = service.login("tester@family.local", "123456");
        assertNotNull(result.token());
        assertEquals("u1", result.user().id());
        assertEquals("tester@family.local", result.user().email());
    }

    @Test
    void 错误密码与未知账号401() {
        assertEquals(401, assertThrows(ApiException.class, () -> service.login("tester@family.local", "wrong")).status());
        assertEquals(401, assertThrows(ApiException.class, () -> service.login("nobody", "123456")).status());
    }

    @Test
    void 空参数400() {
        assertEquals(400, assertThrows(ApiException.class, () -> service.login("", "")).status());
    }

    @Test
    void JWT往返与篡改拒绝() {
        String token = service.login("tester@family.local", "123456").token();
        assertEquals("u1", service.requireUser("Bearer " + token).id());
        assertEquals(401, assertThrows(ApiException.class, () -> service.requireUser(null)).status());
        assertEquals(401, assertThrows(ApiException.class, () -> service.requireUser("Bearer garbage")).status());
        assertEquals(401, assertThrows(ApiException.class, () -> service.requireUser("Bearer " + token + "x")).status());
    }

    @Test
    void 账号删除后token立即失效() {
        String token = service.login("tester@family.local", "123456").token();
        users.delete("u1");
        ApiException e = assertThrows(ApiException.class, () -> service.requireUser("Bearer " + token));
        assertEquals(401, e.status());
        assertEquals("账号已被删除", e.getMessage());
    }

    @Test
    void 密钥持久化后重启仍认旧token() {
        String token = service.login("tester@family.local", "123456").token();
        AuthService restarted = new AuthService(users, tempDir.resolve(".jwt-secret"));
        assertEquals("u1", restarted.requireUser("Bearer " + token).id());
    }

    @Test
    void 改密需验证旧密码() {
        assertEquals(400, assertThrows(ApiException.class, () -> service.changePassword(user, "wrong", "newpass123")).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.changePassword(user, "123456", "123")).status());
        service.changePassword(user, "123456", "newpass123");
        assertEquals(401, assertThrows(ApiException.class, () -> service.login("tester@family.local", "123456")).status());
        assertNotNull(service.login("tester@family.local", "newpass123").token());
    }
}