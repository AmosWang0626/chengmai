package family.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

/** 字辈配置：每个世代对应一个字辈字符，hidden 控制前端是否展示。 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record GenerationChar(
        Integer id,
        int generation,
        @JsonProperty("char") String charValue,  // JSON 字段名为 char（Java 关键字，故组件名 charValue）
        boolean hidden,
        String createdAt) {
}