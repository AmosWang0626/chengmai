#!/usr/bin/env bash
# 承脉 ChengMai · 数据块备份脚本
# 用法：./backup.sh [备份根目录]   默认 ./backups
# 备份期间通过 data/.backup-lock 暂停新写入，并等待在途请求结束。
# 产出：<根目录>/family-data-<时间戳>/{family.db, uploads/, family-data.sql, manifest.txt} 及同名 .zip
set -euo pipefail
cd "$(dirname "$0")"

DATA="${DATA_DIR:-data}"
DB="$DATA/family.db"
[ -f "$DB" ] || { echo "数据库不存在：$DB" >&2; exit 1; }

ROOT="${1:-backups}"
STAMP=$(date +%Y%m%d-%H%M%S)
DEST="$ROOT/family-data-$STAMP"
WRITERS="$DATA/.writers"
LOCK="$DATA/.backup-lock"
RESTORE_TMP=""
LOCK_CREATED=0

cleanup() {
  if [ "$LOCK_CREATED" = 1 ]; then rmdir "$LOCK" 2>/dev/null || true; fi
  if [ -n "$RESTORE_TMP" ]; then rm -rf "$RESTORE_TMP"; fi
}
trap cleanup EXIT

mkdir -p "$DEST" "$WRITERS"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "已有备份正在进行：$LOCK" >&2
  exit 1
fi
LOCK_CREATED=1

echo "[备份] 等待在途写入结束…"
SECONDS=0
while true; do
  for marker in "$WRITERS"/*.marker; do
    [ -f "$marker" ] || continue
    pid=$(cat "$marker" 2>/dev/null || true)
    if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$marker"
    fi
  done
  [ -z "$(find "$WRITERS" -type f -print -quit)" ] && break
  if [ "$SECONDS" -ge 120 ]; then
    echo "等待写入超时，请检查 data/.writers 和运行中的后端进程" >&2
    exit 1
  fi
  sleep 0.2
done

echo "[备份] 库快照（一致时间点）→ $DEST/family.db"
sqlite3 "$DB" ".backup '$DEST/family.db'"

echo "[备份] 相册文件 → $DEST/uploads/"
if [ -d "$DATA/uploads" ]; then
  cp -R "$DATA/uploads" "$DEST/uploads"
else
  mkdir -p "$DEST/uploads"
fi

echo "[备份] 从快照导出全量 SQL → $DEST/family-data.sql"
sqlite3 "$DEST/family.db" .dump > "$DEST/family-data.sql"

echo "[备份] 恢复到临时库并校验…"
RESTORE_TMP=$(mktemp -d)
sqlite3 "$RESTORE_TMP/restored.db" < "$DEST/family-data.sql"
FOREIGN_KEY_ERRORS=$(sqlite3 "$RESTORE_TMP/restored.db" "PRAGMA foreign_key_check;")
if [ -n "$FOREIGN_KEY_ERRORS" ]; then
  echo "恢复校验失败：外键检查未通过" >&2
  printf '%s\n' "$FOREIGN_KEY_ERRORS" >&2
  exit 1
fi
while IFS= read -r table; do
  [ -n "$table" ] || continue
  SOURCE_COUNT=$(sqlite3 "$DEST/family.db" "SELECT COUNT(*) FROM \"$table\";")
  RESTORED_COUNT=$(sqlite3 "$RESTORE_TMP/restored.db" "SELECT COUNT(*) FROM \"$table\";")
  if [ "$SOURCE_COUNT" != "$RESTORED_COUNT" ]; then
    echo "恢复校验失败：$table 行数不一致（$SOURCE_COUNT/$RESTORED_COUNT）" >&2
    exit 1
  fi
done < <(sqlite3 "$DEST/family.db" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")

DB_HASH=$(shasum -a 256 "$DEST/family.db" | cut -d ' ' -f1)
SQL_HASH=$(shasum -a 256 "$DEST/family-data.sql" | cut -d ' ' -f1)
UPLOAD_COUNT=$(find "$DEST/uploads" -type f | wc -l | tr -d ' ')
cat > "$DEST/manifest.txt" <<EOF
created_at=$(date +%Y-%m-%dT%H:%M:%S%z)
database_sha256=$DB_HASH
sql_sha256=$SQL_HASH
upload_files=$UPLOAD_COUNT
restore_check=ok
EOF

echo "[备份] 压缩 → $DEST.zip"
(cd "$(dirname "$DEST")" && zip -r -q "$(basename "$DEST").zip" "$(basename "$DEST")" -x "*.DS_Store")
unzip -tq "$DEST.zip" >/dev/null

rmdir "$LOCK"
LOCK_CREATED=0
echo "[备份] 完成：$DEST （及同名 .zip，恢复校验通过）"
du -sh "$DEST" "$DEST.zip" 2>/dev/null || true
