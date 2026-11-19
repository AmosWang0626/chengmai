package family.service;

import family.model.User;
import family.model.UserView;
import family.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.mindrot.jbcrypt.BCrypt;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.HexFormat;

/** 认证服务：登录、token 校验、改密。jbcrypt 与 Node 版 bcryptjs 哈希互通，JWT 密钥文件两版共用。 */
public class AuthService {
    /** 登录结果：token + 不含密码哈希的用户视图。 */
    public record LoginResult(String token, UserView user) {
    }

    private final UserRepository users;
    private final SecretKey key;

    public AuthService(UserRepository users, Path jwtSecretFile) {
        this.users = users;
        // 密钥按 UTF-8 字节参与 HMAC，与 Node 版 jsonwebtoken 的用法一致
        this.key = Keys.hmacShaKeyFor(loadOrCreateSecret(jwtSecretFile).getBytes(StandardCharsets.UTF_8));
    }

    /** 读取已有密钥；不存在则随机生成 32 字节并落盘（权限 0600，仅属主可读写）。 */
    private static String loadOrCreateSecret(Path file) {
        try {
            if (Files.exists(file)) {
                return Files.readString(file, StandardCharsets.UTF_8).trim();
            }
            byte[] bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
            String secret = HexFormat.of().formatHex(bytes);
            Files.createDirectories(file.toAbsolutePath().getParent());
            Files.writeString(file, secret);
            try {
                Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
            } catch (UnsupportedOperationException ignored) {
                // 非 POSIX 文件系统（如 Windows）跳过权限设置
            }
            return secret;
        } catch (Exception e) {
            throw new RuntimeException("JWT 密钥初始化失败", e);
        }
    }

    /** 校验账号密码，成功则签发 7 天有效的 JWT。 */
    public LoginResult login(String username, String password) {
        if (username == null || username.isEmpty() || password == null || password.isEmpty()) {
            throw new ApiException(400, "请输入账号和密码");
        }
        User user = users.findByUsername(username)
                .filter(u -> BCrypt.checkpw(password, u.passwordHash()))
                .orElseThrow(() -> new ApiException(401, "账号或密码错误"));
        return new LoginResult(signToken(user), UserView.from(user));
    }

    /** 解析 Authorization 头并返回当前用户；token 有效但账号已删除同样拒绝（即时失效）。 */
    public User requireUser(String authorizationHeader) {
        String token = authorizationHeader != null && authorizationHeader.startsWith("Bearer ")
                ? authorizationHeader.substring(7) : null;
        if (token == null) {
            throw new ApiException(401, "未登录");
        }
        String userId;
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            userId = claims.getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            throw new ApiException(401, "登录已过期，请重新登录");
        }
        return users.findById(userId).orElseThrow(() -> new ApiException(401, "账号已被删除"));
    }

    /** 修改密码：先验旧密码，新密码至少 6 位。 */
    public void changePassword(User user, String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new ApiException(400, "新密码长度至少6位");
        }
        if (!BCrypt.checkpw(currentPassword == null ? "" : currentPassword, user.passwordHash())) {
            throw new ApiException(400, "当前密码不正确");
        }
        users.updatePassword(user.id(), BCrypt.hashpw(newPassword, BCrypt.gensalt(10)));
    }

    /** 签发 HS256 token：sub=用户 id，附带 role，7 天过期。 */
    private String signToken(User user) {
        return Jwts.builder()
                .subject(user.id())
                .claim("role", user.role().wire())
                .expiration(Date.from(Instant.now().plus(7, ChronoUnit.DAYS)))
                .signWith(key)
                .compact();
    }
}