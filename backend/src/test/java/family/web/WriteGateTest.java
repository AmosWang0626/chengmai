package family.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 写入门禁测试：启动时清理已退出进程遗留的写入标记。
 *
 * @author dorian
 * @date 2026-11-28
 */
class WriteGateTest {
    @Test
    @DisplayName("启动清理已死进程标记并保留存活进程标记")
    void clearsDeadWriterMarkersOnStartup(@TempDir Path tempDir) throws Exception {
        Path writers = Files.createDirectories(tempDir.resolve(".writers"));
        Path dead = writers.resolve("999999999-dead.marker");
        Path alive = writers.resolve(ProcessHandle.current().pid() + "-alive.marker");
        Files.writeString(dead, "999999999");
        Files.writeString(alive, Long.toString(ProcessHandle.current().pid()));

        new WriteGate(tempDir);

        assertFalse(Files.exists(dead));
        assertTrue(Files.exists(alive));
    }
}
