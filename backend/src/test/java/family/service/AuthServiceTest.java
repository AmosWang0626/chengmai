package family.service;

import family.db.Database;
import family.db.Schema;
import family.model.Role;
import family.model.User;
import family.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
    private final User user = new User("u1", "tester", BCRYPTJS_HASH, null, Role.ADMIN, null);

    @BeforeEach
    void setup() {
        Database db = Database.inMemory();
        Schema.init(db);
        users = new UserRepository(db);
        users.insert(user);
        service = new AuthService(users, tempDir.resolve(".jwt-secret"));
    }

    @Test
    @DisplayName("兼容 bcryptjs 旧密码哈希")
    void acceptsBcryptjsLegacyHash() {
        AuthService.LoginResult result = service.login("tester", "123456");
        assertNotNull(result.token());
        assertEquals("u1", result.user().id());
        assertEquals("tester", result.user().email());
    }

    @Test
    @DisplayName("错误密码与未知账号 401")
    void wrongPasswordAndUnknownUserReturn401() {
        assertEquals(401, assertThrows(ApiException.class, () -> service.login("tester", "wrong")).status());
        assertEquals(401, assertThrows(ApiException.class, () -> service.login("nobody", "123456")).status());
        // 不再兼容 @family.local 后缀，带后缀的旧格式账号名直接拒绝
        assertEquals(401, assertThrows(ApiException.class, () -> service.login("tester@family.local", "123456")).status());
    }

    @Test
    @DisplayName("空参数 400")
    void emptyCredentialsReturn400() {
        assertEquals(400, assertThrows(ApiException.class, () -> service.login("", "")).status());
    }

    @Test
    @DisplayName("JWT 往返与篡改拒绝")
    void jwtRoundTripAndTamperRejection() {
        String token = service.login("tester", "123456").token();
        assertEquals("u1", service.requireUser("Bearer " + token).id());
        assertEquals(401, assertThrows(ApiException.class, () -> service.requireUser(null)).status());
        assertEquals(401, assertThrows(ApiException.class, () -> service.requireUser("Bearer garbage")).status());
        assertEquals(401, assertThrows(ApiException.class, () -> service.requireUser("Bearer " + token + "x")).status());
    }

    @Test
    @DisplayName("账号删除后 token 立即失效")
    void tokenInvalidImmediatelyAfterUserDeletion() {
        String token = service.login("tester", "123456").token();
        users.delete("u1");
        ApiException e = assertThrows(ApiException.class, () -> service.requireUser("Bearer " + token));
        assertEquals(401, e.status());
        assertEquals("账号已被删除", e.getMessage());
    }

    @Test
    @DisplayName("密钥持久化后重启仍认旧 token")
    void persistedSecretAcceptsOldTokenAfterRestart() {
        String token = service.login("tester", "123456").token();
        AuthService restarted = new AuthService(users, tempDir.resolve(".jwt-secret"));
        assertEquals("u1", restarted.requireUser("Bearer " + token).id());
    }

    @Test
    @DisplayName("改密需验证旧密码")
    void changePasswordRequiresOldPassword() {
        assertEquals(400, assertThrows(ApiException.class, () -> service.changePassword(user, "wrong", "newpass123")).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.changePassword(user, "123456", "123")).status());
        service.changePassword(user, "123456", "newpass123");
        assertEquals(401, assertThrows(ApiException.class, () -> service.login("tester", "123456")).status());
        assertNotNull(service.login("tester", "newpass123").token());
    }
}