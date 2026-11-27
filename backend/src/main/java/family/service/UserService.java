package family.service;

import family.db.Database;
import family.model.Role;
import family.model.User;
import family.model.UserView;
import family.repository.UserRepository;
import org.mindrot.jbcrypt.BCrypt;

import java.util.List;

/** 账号管理服务：创建、改角色、删除，含“最后管理员”与“自删”保护。 */
public class UserService {
    private final UserRepository users;
    private final Database db;

    public UserService(UserRepository users, Database db) {
        this.users = users;
        this.db = db;
    }

    /** 账号列表（不含密码哈希）。 */
    public List<UserView> list() {
        return users.findAllNewestFirst().stream().map(UserView::from).toList();
    }

    /** 创建账号：账号原样存储（裸用户名）；缺省角色 viewer。 */
    public UserView create(String username, String password, String roleWire) {
        String name = username == null ? "" : username.trim();
        if (name.length() < 4) {
            throw new ApiException(400, "账号长度至少4位");
        }
        if (password == null || password.length() < 6) {
            throw new ApiException(400, "密码长度至少6位");
        }
        if ("demo123".equals(password)) {
            throw new ApiException(400, "不能使用公开的初始密码");
        }
        Role role = roleWire == null || roleWire.isEmpty() ? Role.VIEWER : Role.parseOrNull(roleWire);
        if (role == null) {
            throw new ApiException(400, "无效的角色");
        }
        if (users.findByUsername(name).isPresent()) {
            throw new ApiException(409, "账号已存在");
        }
        long id = users.insert(new User(null, name,
                BCrypt.hashpw(password, BCrypt.gensalt(10)), null, role, null));
        return UserView.from(users.findById(id).orElseThrow());
    }

    /** 修改角色；不允许把最后一名管理员降级。 */
    public UserView updateRole(long id, String roleWire) {
        return db.inTransaction(() -> {
            User target = users.findById(id).orElseThrow(() -> new ApiException(404, "账号不存在"));
            Role role = Role.parseOrNull(roleWire);
            if (role == null) {
                throw new ApiException(400, "无效的角色");
            }
            if (isLastAdmin(target, role)) {
                throw new ApiException(400, "至少保留一名管理员");
            }
            users.updateRole(id, role);
            return UserView.from(users.findById(id).orElseThrow());
        });
    }

    /** 删除账号：禁止自删，禁止删掉最后一名管理员。 */
    public void delete(long id, User actor) {
        db.inTransaction(() -> {
            if (actor.id() == id) {
                throw new ApiException(400, "不能删除自己的账号");
            }
            User target = users.findById(id).orElseThrow(() -> new ApiException(404, "账号不存在"));
            if (isLastAdmin(target, null)) {
                throw new ApiException(400, "至少保留一名管理员");
            }
            users.delete(id);
            return null;
        });
    }

    /** 目标是管理员且将不再是管理员、且管理员只剩一名时返回 true。 */
    private boolean isLastAdmin(User target, Role newRole) {
        return target.role() == Role.ADMIN && newRole != Role.ADMIN && users.countAdmins() <= 1;
    }
}