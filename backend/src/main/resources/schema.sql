-- 家谱系统数据库结构（SQLite）。主键统一 INTEGER 自增，四张表均从 10000 起。
-- 所有时间戳为 TEXT，默认 datetime('now')；服务层写入时统一用 ISO 毫秒格式。

-- 用户账号：role 三档（admin/editor/viewer），username 唯一
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,          -- bcrypt 哈希（bcryptjs / jbcrypt 互通）
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 家族成员：parent_id 自引用构成家族树，删除父节点时子女归属自动置空
CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- 录入人
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  birth_date TEXT,
  birth_calendar TEXT NOT NULL DEFAULT 'solar',
  birth_lunar_leap INTEGER NOT NULL DEFAULT 0,
  death_date TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  occupation TEXT,
  education TEXT,
  bio TEXT,
  avatar_url TEXT,
  parent_id INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
  generation INTEGER DEFAULT 1,         -- 世代（第 N 世）
  generation_char TEXT,                 -- 字辈字符，可按世代自动填充
  sibling_rank INTEGER,                 -- 同世代同性别中的排行
  family_rank INTEGER,                  -- 同世代全部成员中的排序
  spouse_name TEXT,
  spouse_origin TEXT,
  spouse_birth_date TEXT,
  spouse_birth_calendar TEXT NOT NULL DEFAULT 'solar',
  spouse_lunar_leap INTEGER NOT NULL DEFAULT 0,
  spouse_death_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_members_parent ON family_members(parent_id);
CREATE INDEX IF NOT EXISTS idx_members_generation ON family_members(generation);

-- 字辈配置：每世代唯一，hidden 控制前端展示
CREATE TABLE IF NOT EXISTS generation_chars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generation INTEGER NOT NULL UNIQUE,
  char TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 相册图片：tags 为 JSON 数组字符串；status 审核状态机 pending→approved/rejected/hidden
CREATE TABLE IF NOT EXISTS gallery_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- 上传者
  url TEXT NOT NULL,                    -- 相对路径 /uploads/gallery/xxx
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,                     -- 审核通过时间
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL  -- 审核人
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 自增起点 10000：sqlite_sequence 的行在首次插入后才存在，故先抬下限、再补缺行；
-- 只抬不降，重复初始化不会让已有库重号。
UPDATE sqlite_sequence SET seq = 9999
  WHERE name IN ('users', 'family_members', 'generation_chars', 'gallery_images', 'audit_logs') AND seq < 9999;
INSERT INTO sqlite_sequence (name, seq)
  SELECT n, 9999 FROM (
    SELECT 'users' AS n UNION ALL SELECT 'family_members'
    UNION ALL SELECT 'generation_chars' UNION ALL SELECT 'gallery_images'
    UNION ALL SELECT 'audit_logs'
  ) WHERE n NOT IN (SELECT name FROM sqlite_sequence);

-- 内置账号（密码 demo123）：建库即可登录；username 唯一 + OR IGNORE 保证重复初始化不覆盖改密结果
INSERT OR IGNORE INTO users (username, password_hash, full_name, role) VALUES
  ('admin',  '$2a$10$nWn8NGDCq0AOGoe8WDgFW.URiqmwKYV4HnsHXeqsqUHKQnSsCTBAS', '演示管理员', 'admin'),
  ('viewer', '$2a$10$nWn8NGDCq0AOGoe8WDgFW.URiqmwKYV4HnsHXeqsqUHKQnSsCTBAS', '演示访客',   'viewer');