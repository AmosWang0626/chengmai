-- ============================================================================
-- 演示种子数据（完全虚构，仅用于开源仓库快速体验）
-- 用法：仅对空库执行  sqlite3 data/family.db < data/seed-demo.sql
-- 账号：admin / demo123（管理员）、viewer / demo123（访客）——体验后请立即改密
-- 真实家谱数据请自行录入或导入，切勿将真实数据提交到版本库
-- ============================================================================

-- 账号（bcrypt 哈希对应密码 demo123）
INSERT INTO users (id, username, password_hash, full_name, role) VALUES
  ('demo-u1', 'admin',  '$2a$10$nWn8NGDCq0AOGoe8WDgFW.URiqmwKYV4HnsHXeqsqUHKQnSsCTBAS', '演示管理员', 'admin'),
  ('demo-u2', 'viewer', '$2a$10$nWn8NGDCq0AOGoe8WDgFW.URiqmwKYV4HnsHXeqsqUHKQnSsCTBAS', '演示访客',   'viewer');

-- 字辈（四代）
INSERT INTO generation_chars (generation, char, hidden) VALUES
  (1, '承', 0), (2, '建', 0), (3, '明', 0), (4, '子', 0);

-- 虚构李氏家族：四代 12 人（配偶以字段存储，独立展示）
INSERT INTO family_members
  (id, user_id, name, gender, birth_date, death_date, phone, email, address, occupation, education, bio,
   parent_id, generation, generation_char, sibling_rank, family_rank,
   spouse_name, spouse_origin, spouse_birth_date, spouse_death_date, notes)
VALUES
  ('demo-m01', 'demo-u1', '李承祖', 'male',   '1920-03-12', '1998-11-02', '13800000001', 'chengzu@example.com', '示例省示例市示例县示例村', '农民', '私塾', '家族始祖，迁居示例村。',
   NULL, 1, '承', 1, 1, '周淑兰', '示例县周家湾', '1923-05-20', '2005-01-15', NULL),
  ('demo-m02', 'demo-u1', '李建国', 'male',   '1948-08-01', NULL, '13800000002', 'jianguo@example.com', '示例省示例市示例县示例村', '教师', '中专', '长子，村小教师。',
   'demo-m01', 2, '建', 1, 1, '张秀英', '示例县张家庄', '1950-02-11', NULL, NULL),
  ('demo-m03', 'demo-u1', '李建军', 'male',   '1952-04-18', NULL, '13800000003', 'jianjun@example.com', '示例省示例市示例县示例村', '工程师', '大学', '次子，水利工程师。',
   'demo-m01', 2, '建', 2, 2, '刘玉兰', '示例县刘家集', '1954-09-03', NULL, NULL),
  ('demo-m04', 'demo-u1', '李建华', 'female', '1955-12-30', NULL, '13800000004', 'jianhua@example.com', '示例省示例市示例县示例村', '医生', '大学', '三女，乡卫生院医生。',
   'demo-m01', 2, '建', 1, 3, '王志强', '示例县王家屯', '1953-06-25', NULL, NULL),
  ('demo-m05', 'demo-u1', '李明轩', 'male',   '1975-01-22', NULL, '13800000005', 'mingxuan@example.com', '示例省示例市示例区', '程序员', '大学', '建国长子。',
   'demo-m02', 3, '明', 1, 1, '赵晓芸', '示例市赵家楼', '1977-03-08', NULL, NULL),
  ('demo-m06', 'demo-u1', '李明哲', 'male',   '1978-07-14', NULL, '13800000006', 'mingzhe@example.com', '示例省示例市示例区', '厨师', '高中', '建国次子。',
   'demo-m02', 3, '明', 2, 2, NULL, NULL, NULL, NULL, NULL),
  ('demo-m07', 'demo-u1', '李明月', 'female', '1980-10-05', NULL, '13800000007', 'mingyue@example.com', '示例省示例市示例区', '会计', '大学', '建军长女。',
   'demo-m03', 3, '明', 1, 1, '刘畅', '示例市刘家庄', '1979-11-19', NULL, NULL),
  ('demo-m08', 'demo-u1', '李明辉', 'female', '1983-02-27', NULL, '13800000008', 'minghui@example.com', '示例省示例市示例区', '设计师', '大学', '建军次女。',
   'demo-m03', 3, '明', 2, 2, NULL, NULL, NULL, NULL, NULL),
  ('demo-m09', 'demo-u1', '王小雅', 'female', '1982-05-16', NULL, '13800000009', 'xiaoya@example.com', '示例省示例市示例区', '护士', '中专', '建华长女，随父姓。',
   'demo-m04', 3, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL),
  ('demo-m10', 'demo-u1', '王小磊', 'male',   '1985-09-09', NULL, '13800000010', 'xiaolei@example.com', '示例省示例市示例区', '司机', '高中', '建华次子，随父姓。',
   'demo-m04', 3, NULL, 1, 2, NULL, NULL, NULL, NULL, NULL),
  ('demo-m11', 'demo-u1', '李子涵', 'female', '2005-06-01', NULL, NULL, NULL, '示例省示例市示例区', '学生', '高中', '明轩长女。',
   'demo-m05', 4, '子', 1, 1, NULL, NULL, NULL, NULL, NULL),
  ('demo-m12', 'demo-u1', '李子豪', 'male',   '2008-12-12', NULL, NULL, NULL, '示例省示例市示例区', '学生', '初中', '明轩次子。',
   'demo-m05', 4, '子', 1, 2, NULL, NULL, NULL, NULL, NULL);