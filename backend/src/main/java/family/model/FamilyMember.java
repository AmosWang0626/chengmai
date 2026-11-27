package family.model;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

/**
 * 家族成员实体，字段与 family_members 表一一对应，JSON 蛇形命名。
 *
 * @author dorian
 * @date 2026-11-19
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record FamilyMember(
        Long id,
        Long userId,          // 录入人（users.id）
        String name,
        String gender,          // male / female / other
        String birthDate,
        String deathDate,
        String phone,
        String email,
        String address,
        String occupation,
        String education,
        String bio,
        String avatarUrl,
        Long parentId,        // 父节点成员 id，构成家族树；删除父节点时自动置空
        Integer generation,     // 世代（第 N 世），缺省按 1 处理
        String generationChar,  // 字辈字符，按世代自动填充，可手动覆盖
        Integer siblingRank,    // 同辈排行：同一父亲下同性别中的排序
        Integer familyRank,     // 家庭排序：同一父亲下全部子女中的排序
        String spouseName,
        String spouseOrigin,
        String spouseBirthDate,
        String spouseDeathDate,
        String notes,
        String createdAt,
        String updatedAt) {
}