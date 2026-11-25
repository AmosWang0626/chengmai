# data · 数据块（本地运行数据，不入版本库）

本目录是应用的**全部持久化状态**，作为独立块存在：拷贝本目录即完成备份 / 迁移。
**含真实家族隐私，已被 `.gitignore` 忽略（仅本 README 与演示种子 `seed-demo.sql` 入库）。**

| 文件 | 说明 | 入库 |
| --- | --- | --- |
| `family.db` | SQLite 主库（WAL 模式 + 外键开启）；后端首次启动按 `backend/src/main/resources/schema.sql` 自动建表并内置 admin/viewer 账号 | ✗ |
| `family.db-wal` / `-shm` | WAL 运行时日志；冷备份请先停服务，或三文件一并拷贝 | ✗ |
| `.jwt-secret` | JWT HS256 密钥（0600）；缺失时后端自动生成 | ✗ |
| `uploads/gallery/` | 相册原图与 `thumb_` 缩略图；删除图片记录时同步删除文件 | ✗ |
| `README.md` / `seed-demo.sql` | 说明与**完全虚构**的演示种子 | ✓ |

## 初始化（克隆仓库后）

```bash
# 1) 启动后端即自动建表（空库）
./start.sh

# 2) 可选：灌入虚构演示数据（仅空库；王氏四代 12 人，账号建库时已内置）
sqlite3 data/family.db < data/seed-demo.sql
#    账号：admin / demo123（管理员）、viewer / demo123（访客），由 schema.sql 内置
#    体验后请立即在「账号管理」改密
```

真实家谱请自行录入 / 导入；**切勿将真实数据、照片、密钥提交或推送到任何公开仓库**。

## 备份 / 迁移

```bash
./backup.sh                          # 在线一致备份（无需停服）→ backups/family-data-<时间戳>/
./backup.sh /path/to/root            # 指定备份根目录
# 产出：family.db 快照 + uploads/ + family-data.sql（整库 dump，灌入空库即恢复）+ 同名 .zip
# 注意：dump 含密码哈希等敏感内容，备份目录切勿公开或入库
# 冷备份备选：./start.sh stop 后 cp -R data /backup/family-data-$(date +%F)
# 新机器：DATA_DIR=/path/to/data ./start.sh
```

表结构：`users`（三档角色）、`family_members`（parent_id 自引用树 + 世代/字辈/排行 + 配偶字段）、
`generation_chars`（世代唯一）、`gallery_images`（审核状态机 + JSON tags）。
库结构为数字自增主键（10000 起），与姊妹项目 Node 版（TEXT 主键）**不兼容**，请勿共用本目录。

完整说明见仓库根 [README.md](../README.md)。