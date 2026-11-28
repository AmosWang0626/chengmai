# data · 本地数据

应用的全部持久化状态都保存在本目录。真实数据、照片与密钥已被 `.gitignore` 忽略，仅本说明与虚构演示种子 `seed-demo.sql` 入库。

| 文件 | 说明 |
| --- | --- |
| `family.db` | SQLite 主库，首次启动自动建表并初始化账号 |
| `family.db-wal` / `family.db-shm` | WAL 运行时文件 |
| `.jwt-secret` | JWT 签名密钥，缺失时自动生成，权限为 0600 |
| `uploads/gallery/` | 相册原图与 `thumb_` 缩略图 |
| `seed-demo.sql` | 完全虚构的王氏七代演示数据，仅用于空库 |

## 初始化演示数据

```bash
./start.sh stop
sqlite3 data/family.db < data/seed-demo.sql
./start.sh
```

默认账号：`admin / demo123`（管理员）、`viewer / demo123`（访客）。体验后请在账号管理中修改密码。

## 备份与迁移

```bash
./backup.sh                       # 在线备份到 backups/
./backup.sh /path/to/backups      # 指定备份目录
```

脚本无需停服，输出数据库快照、`uploads/`、全量 SQL `family-data.sql`、校验清单及同名 ZIP。备份包含密码哈希与家族资料，应加密保存，切勿公开或提交。

迁移时先备份，再将数据库与 `uploads/` 恢复到新机器，并通过 `DATA_DIR` 指向该目录。JWT 密钥不会进入备份，首次启动会生成新密钥。

真实家谱请自行录入或导入，**切勿将真实数据、照片、密钥提交或推送到任何公开仓库**。

完整说明见根目录 [README.md](../README.md)。
