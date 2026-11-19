package family.service;

import family.db.Database;
import family.db.Schema;
import family.model.Role;
import family.model.User;
import family.model.UserView;
import family.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** 账号服务测试：账号原样存储、重复账号、最后管理员保护、自删禁止。 */
class UserServiceTest {
    private UserService service;
    private UserRepository users;
    private final User admin = new User("a1", "admin", "x", null, Role.ADMIN, null);

    @BeforeEach
    void setup() {
        Database db = Database.inMemory();
        Schema.init(db);
        users = new UserRepository(db);
        users.insert(admin);
        service = new UserService(users);
    }

    @Test
    @DisplayName("创建账号原样存储且缺省角色 viewer")
    void createStoresUsernameAsIsWithDefaultViewerRole() {
        UserView v = service.create("testuser", "123456", null);
        assertEquals("testuser", v.username());
        assertEquals("testuser", v.email());
        assertEquals(Role.VIEWER, v.role());
    }

    @Test
    @DisplayName("校验账号密码长度与角色")
    void validatesUsernamePasswordLengthAndRole() {
        assertEquals(400, assertThrows(ApiException.class, () -> service.create("abc", "123456", "viewer")).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.create("abcd", "123", "viewer")).status());
        assertEquals(400, assertThrows(ApiException.class, () -> service.create("abcd", "123456", "superman")).status());
    }

    @Test
    @DisplayName("重复账号 409")
    void duplicateUsernameReturns409() {
        service.create("testuser", "123456", "viewer");
        assertEquals(409, assertThrows(ApiException.class, () -> service.create("testuser", "123456", "viewer")).status());
    }

    @Test
    @DisplayName("最后管理员不可降级")
    void lastAdminCannotBeDemoted() {
        ApiException e = assertThrows(ApiException.class, () -> service.updateRole("a1", "viewer"));
        assertEquals(400, e.status());
        assertEquals("至少保留一名管理员", e.getMessage());
    }

    @Test
    @DisplayName("最后管理员不可删除")
    void lastAdminCannotBeDeleted() {
        User other = new User("a2", "other", "x", null, Role.VIEWER, null);
        users.insert(other);
        assertEquals(400, assertThrows(ApiException.class, () -> service.delete("a1", other)).status());
    }

    @Test
    @DisplayName("有第二名管理员时可降级")
    void adminCanBeDemotedWhenSecondAdminExists() {
        service.create("admin2", "123456", "admin");
        UserView v = service.updateRole("a1", "viewer");
        assertEquals(Role.VIEWER, v.role());
    }

    @Test
    @DisplayName("不能删除自己")
    void cannotDeleteSelf() {
        ApiException e = assertThrows(ApiException.class, () -> service.delete("a1", admin));
        assertEquals(400, e.status());
        assertEquals("不能删除自己的账号", e.getMessage());
    }

    @Test
    @DisplayName("删除普通账号")
    void deleteRegularAccount() {
        UserView v = service.create("todelete", "123456", "viewer");
        service.delete(v.id(), admin);
        assertTrue(users.findById(v.id()).isEmpty());
    }
}