package family.repository;

import family.db.Database;
import family.db.RowMapper;
import family.model.Role;
import family.model.User;

import java.util.List;
import java.util.Optional;

/**
 * 用户表 DAO：只负责 SQL，不含业务校验。
 *
 * @author dorian
 * @date 2026-11-19
 */
public class UserRepository {
    private static final RowMapper<User> MAPPER = rs -> new User(
            rs.getLong("id"),
            rs.getString("username"),
            rs.getString("password_hash"),
            rs.getString("full_name"),
            Role.fromWire(rs.getString("role")),
            rs.getString("created_at"));

    private final Database db;

    public UserRepository(Database db) {
        this.db = db;
    }

    public Optional<User> findById(long id) {
        return db.queryOne("SELECT * FROM users WHERE id = ?", MAPPER, id);
    }

    public Optional<User> findByUsername(String username) {
        return db.queryOne("SELECT * FROM users WHERE username = ?", MAPPER, username);
    }

    /** 账号列表，新注册在前。 */
    public List<User> findAllNewestFirst() {
        return db.query("SELECT * FROM users ORDER BY created_at DESC", MAPPER);
    }

    /** 插入用户并返回自增 id；created_at 由数据库默认值生成，full_name 暂不启用。 */
    public long insert(User user) {
        return db.insert("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                user.username(), user.passwordHash(), user.role().wire());
    }

    public void updatePassword(long id, String passwordHash) {
        db.update("UPDATE users SET password_hash = ? WHERE id = ?", passwordHash, id);
    }

    public void updateRole(long id, Role role) {
        db.update("UPDATE users SET role = ? WHERE id = ?", role.wire(), id);
    }

    public void delete(long id) {
        db.update("DELETE FROM users WHERE id = ?", id);
    }

    /** 管理员数量，用于“至少保留一名管理员”保护。 */
    public int countAdmins() {
        return db.queryOne("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'", rs -> rs.getInt("n")).orElse(0);
    }
}