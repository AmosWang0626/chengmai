package family.db;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * SQLite 访问封装：单连接 + synchronized 串行化（轻量场景足够），开启 WAL 与外键。
 *
 * @author dorian
 * @date 2026-11-19
 */
public class Database {
    private final Connection conn;

    /** dbFile 为 null 时使用内存库（单元测试用）。 */
    public Database(Path dbFile) {
        try {
            String url;
            if (dbFile == null) {
                url = "jdbc:sqlite::memory:";
            } else {
                Files.createDirectories(dbFile.toAbsolutePath().getParent());
                url = "jdbc:sqlite:" + dbFile.toAbsolutePath();
            }
            conn = DriverManager.getConnection(url);
            try (Statement st = conn.createStatement()) {
                st.execute("PRAGMA journal_mode = WAL");
                // 外键约束依赖此开关：父成员删除时子女 parent_id 自动置空（ON DELETE SET NULL）
                st.execute("PRAGMA foreign_keys = ON");
            }
        } catch (Exception e) {
            throw new RuntimeException("数据库初始化失败", e);
        }
    }

    /** 创建内存数据库，供测试隔离使用。 */
    public static Database inMemory() {
        return new Database(null);
    }

    /** 执行 DDL 等无结果集语句。 */
    public synchronized void execute(String sql) {
        try (Statement st = conn.createStatement()) {
            st.execute(sql);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    /** 参数化查询，逐行交给 mapper 映射。 */
    public synchronized <T> List<T> query(String sql, RowMapper<T> mapper, Object... params) {
        try (PreparedStatement ps = prepare(sql, params); ResultSet rs = ps.executeQuery()) {
            List<T> rows = new ArrayList<>();
            while (rs.next()) {
                rows.add(mapper.map(rs));
            }
            return rows;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    /** 查询首行，无结果返回 empty。 */
    public synchronized <T> Optional<T> queryOne(String sql, RowMapper<T> mapper, Object... params) {
        List<T> rows = query(sql, mapper, params);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    /** 执行 INSERT/UPDATE/DELETE，返回受影响行数。 */
    public synchronized int update(String sql, Object... params) {
        try (PreparedStatement ps = prepare(sql, params)) {
            return ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    /** 执行插入并返回自增主键（last_insert_rowid）。 */
    public synchronized long insert(String sql, Object... params) {
        update(sql, params);
        return queryOne("SELECT last_insert_rowid() AS id", rs -> rs.getLong("id")).orElseThrow();
    }

    /** 在同一连接上执行原子操作，并持有实例锁避免多步检查与写入之间发生竞态。 */
    public synchronized <T> T inTransaction(Supplier<T> work) {
        try {
            conn.setAutoCommit(false);
            T result = work.get();
            conn.commit();
            return result;
        } catch (RuntimeException e) {
            rollbackQuietly();
            throw e;
        } catch (Exception e) {
            rollbackQuietly();
            throw new RuntimeException(e);
        } finally {
            try {
                conn.setAutoCommit(true);
            } catch (Exception e) {
                throw new RuntimeException("恢复数据库自动提交失败", e);
            }
        }
    }

    public synchronized void inTransaction(Runnable work) {
        inTransaction(() -> {
            work.run();
            return null;
        });
    }

    private void rollbackQuietly() {
        try {
            conn.rollback();
        } catch (Exception ignored) {
        }
    }

    /** 预编译并按序绑定参数（防 SQL 注入）。 */
    private PreparedStatement prepare(String sql, Object... params) throws Exception {
        PreparedStatement ps = conn.prepareStatement(sql);
        for (int i = 0; i < params.length; i++) {
            ps.setObject(i + 1, params[i]);
        }
        return ps;
    }
}