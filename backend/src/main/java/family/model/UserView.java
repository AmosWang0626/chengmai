package family.model;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

/** 用户对外视图：不含密码哈希。 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record UserView(
        Long id,
        String username,
        String fullName,
        Role role,
        String createdAt,
        boolean passwordChangeRequired) {

    /** 由实体转换为安全的对外视图。 */
    public static UserView from(User user) {
        return from(user, false);
    }

    public static UserView from(User user, boolean passwordChangeRequired) {
        return new UserView(user.id(), user.username(), user.fullName(), user.role(), user.createdAt(),
                passwordChangeRequired);
    }
}