package family.model;

/** 用户实体（含密码哈希，仅限服务层内部使用，禁止直接序列化返回前端）。 */
public record User(
        String id,
        String username,      // 登录账号（裸用户名）
        String passwordHash,  // bcrypt 哈希，兼容 Node 版 bcryptjs 生成的 $2a$ 哈希
        String fullName,
        Role role,
        String createdAt) {
}