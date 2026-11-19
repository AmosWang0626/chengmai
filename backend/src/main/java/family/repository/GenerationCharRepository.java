package family.repository;

import family.db.Database;
import family.db.RowMapper;
import family.model.GenerationChar;

import java.util.List;
import java.util.Optional;

/** 字辈配置表 DAO：hidden 在库中为 0/1 整数，映射为布尔。 */
public class GenerationCharRepository {
    private static final RowMapper<GenerationChar> MAPPER = rs -> new GenerationChar(
            rs.getInt("id"),
            rs.getInt("generation"),
            rs.getString("char"),
            rs.getInt("hidden") != 0,
            rs.getString("created_at"));

    private final Database db;

    public GenerationCharRepository(Database db) {
        this.db = db;
    }

    /** 全部字辈，按世代升序。 */
    public List<GenerationChar> findAllOrdered() {
        return db.query("SELECT * FROM generation_chars ORDER BY generation ASC", MAPPER);
    }

    public Optional<GenerationChar> findById(int id) {
        return db.queryOne("SELECT * FROM generation_chars WHERE id = ?", MAPPER, id);
    }

    public Optional<GenerationChar> findByGeneration(int generation) {
        return db.queryOne("SELECT * FROM generation_chars WHERE generation = ?", MAPPER, generation);
    }

    /** 该世代是否已被其他记录占用（更新时排除自身）。 */
    public boolean generationTakenByOther(int generation, int excludeId) {
        return db.queryOne("SELECT id FROM generation_chars WHERE generation = ? AND id != ?",
                rs -> rs.getInt("id"), generation, excludeId).isPresent();
    }

    /** 插入并返回自增 id。 */
    public int insert(int generation, String charValue, boolean hidden) {
        return (int) db.insert("INSERT INTO generation_chars (generation, char, hidden) VALUES (?, ?, ?)",
                generation, charValue, hidden ? 1 : 0);
    }

    public void update(int id, int generation, String charValue, boolean hidden) {
        db.update("UPDATE generation_chars SET generation = ?, char = ?, hidden = ? WHERE id = ?",
                generation, charValue, hidden ? 1 : 0, id);
    }

    public void delete(int id) {
        db.update("DELETE FROM generation_chars WHERE id = ?", id);
    }
}