#!/usr/bin/env bash
# 承脉 ChengMai · 数据块备份脚本
# 用法：./backup.sh [备份根目录]   默认 ./backups
# 服务运行中也可执行：sqlite3 .backup 保证库快照一致性，无需停服。
# 产出：<根目录>/family-data-<时间戳>/{family.db, uploads/, generation-chars.sql}
# 同时刷新 data/generation-chars.sql（字辈表导出，可回放恢复）。
set -euo pipefail
cd "$(dirname "$0")"

DATA="${DATA_DIR:-data}"
DB="$DATA/family.db"
[ -f "$DB" ] || { echo "数据库不存在：$DB" >&2; exit 1; }

ROOT="${1:-backups}"
STAMP=$(date +%Y%m%d-%H%M%S)
DEST="$ROOT/family-data-$STAMP"
mkdir -p "$DEST"

echo "[备份] 库快照（在线一致）→ $DEST/family.db"
sqlite3 "$DB" ".backup '$DEST/family.db'"

echo "[备份] 相册文件 → $DEST/uploads/"
if [ -d "$DATA/uploads" ]; then
  cp -R "$DATA/uploads" "$DEST/uploads"
else
  mkdir -p "$DEST/uploads"
fi

echo "[备份] 字辈导出 → $DATA/generation-chars.sql"
{
  echo "-- 字辈配置导出（backup.sh 生成于 ${STAMP}，源 ${DB}）"
  echo "-- 回放方式：sqlite3 <库文件> < data/generation-chars.sql（整表替换）"
  echo "DELETE FROM generation_chars;"
  sqlite3 "$DB" "SELECT 'INSERT INTO generation_chars (id, generation, char, hidden, created_at) VALUES (' || id || ', ' || generation || ', ''' || replace(char, '''', '''''') || ''', ' || hidden || ', ''' || created_at || ''');' FROM generation_chars ORDER BY generation;"
} > "$DATA/generation-chars.sql"
cp "$DATA/generation-chars.sql" "$DEST/generation-chars.sql"

echo "[备份] 完成：$DEST"
du -sh "$DEST" 2>/dev/null || true