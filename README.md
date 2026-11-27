# 承脉 ChengMai · 家谱系统（前后端分离 · 三块结构）

**承脉**（ChengMai）：承接血脉、世系传承。一个面向家族世系记录的全栈应用：**前端项目**、**后端项目**、**数据** 三块完全分离，可独立开发、独立部署、独立备份。
前端为纯静态产物（可放 CDN），后端为单 jar 的轻量 Java 服务，数据为 SQLite 文件目录——无外部数据库、无容器依赖。

核心能力：

- 家族成员 CRUD：世代 / 字辈自动填充、同辈排行与家庭排序自动计算、父母子女树关系
- 字辈管理：每世代一字、可隐藏
- 家族图册：上传（落盘 + 缩略图）、审核状态机（pending → approved / rejected / hidden）、标签
- 账号与三档权限：admin / editor / viewer
- 家谱展示双风格：**扇形谱图**（默认首选：环状放射、配偶为环抱成员弧的"婚环"带、双击换根、全名字标注）、**传统图谱**（竖排右起谱页为主体，融合夫妻双柱信息：朱砂婚线♥、生卒、性别、卡框开关、墨线吊挂）
- 图谱导出：JSON / SVG / 高清 PNG / PDF，可选当前分支或整个家谱、折叠后代、配偶与备注
- 协作维护：批量新增 / 批量编辑原子提交、同辈拖拽排序、详情面板内编辑与添加子女
- 紧凑首页：统计、世系分布、最近更新与快捷入口；成员管理统一提供表格 / 世系 / 世代三种视图
- 统一视觉主题：朱砂 + 鎏金 + jade + 黛青 + 暖墨宣纸

---

## 一、总体架构

```
┌────────────────────────┐        REST /api/* (JSON + JWT Bearer)
│  frontend/  前端项目     │ ────────────────────────────────────────┐
│  React 18 + TS + Tailwind│        /api/gallery/file (鉴权图片)    │
│  webpack → 纯静态 dist/  │ ────────────────────────────────────────┤
────────────────────────┘                                         ▼
                                              ┌────────────────────────────┐
                                              │  backend/  后端项目          │
                                              │  Javalin 7 (Jetty 12) 单 jar │
                                              │  鉴权 / 业务 / 静态托管(可选)  │
                                              └─────────────┬──────────────┘
                                                            ▼
                                              ┌────────────────────────────┐
                                              │  data/  数据块              │
                                              │  family.db (SQLite, WAL)   │
                                              │  uploads/gallery/  图片落盘  │
                                              │  .jwt-secret  签名密钥       │
                                              └────────────────────────────┘
```

| 块 | 职责 | 产物 | 可独立部署 |
| --- | --- | --- | --- |
| `frontend/` | 全部 UI 与交互，不含任何服务端逻辑 | `frontend/dist/` 静态文件 | ✅ CDN / nginx / 任意静态托管 |
| `backend/` | REST API、鉴权、上传落盘、可选同进程托管前端 | `backend/target/chengmai-backend.jar` | ✅ 任意有 JDK 17+ 的机器 |
| `data/` | 持久化状态：数据库、图片、密钥、字辈导出 | 目录整体 | ✅ `./backup.sh` 在线备份 / 拷贝目录迁移 |

两种部署形态：

1. **同源模式**：后端进程直接托管 `frontend/dist`（默认），一个端口搞定；
2. **分离模式**：前端放 CDN / 静态托管，后端独立部署；前端通过 `config.js` 的 `apiBase` 指向后端，后端已开启 CORS。

---

## 二、目录结构

```
chengmai/
├── README.md                  # 本文件
├── .gitignore
├── frontend/                  # ① 前端项目（独立 package.json）
│   ├── package.json           #    dev / build / lint / typecheck / test
│   ├── webpack.config.js      #    devServer 3266，/api 与 /uploads 代理到 8080
│   ├── tailwind.config.js     #    主题色板（朱砂/鎏金/jade/黛青/暖墨）
│   ├── tsconfig.json / postcss.config.js
│   ├── index.html             #    入口模板（含 config.js 运行时配置引用）
│   ├── public/
│   │   └── config.js          #    运行时配置：apiBase（部署后改它，无需重构建）
│   ├── src/
│   │   ├── api/client.ts      #    fetch 封装 + token + 401 处理
│   │   ├── hooks/             #    共享数据 Provider / useFamilyMembers / useGallery / useUserRole
│   │   ├── components/        #    Layout / MemberPanel / AdminRoute / BatchChildrenModal
│   │   ├── pages/             #    首页 / 双风格谱图 / 列表 / 表单 / 图册 / 账号 / 字辈 / 登录
│   │   │   └── tree/          #    布局+视口裁剪 / URL 状态 / 双图谱 / 导出引擎
│   │   ├── styles/index.css   #    全局质感 + ui-* 控件组件类
│   │   └── types/
│   └── dist/                  #    构建产物（git 忽略）
├── backend/                   # ② 后端项目（独立 Maven 工程）
│   ├── pom.xml
│   └── src/
│       ├── main/java/family/
│       │   ├── Main.java      #    装配：静态托管 / CORS / 鉴权 / 路由
│       │   ├── config/        #    AppConfig（PORT / DATA_DIR / STATIC_DIR）
│       │   ├── db/            #    Database(SQLite 单连接) / Schema(自动建表)
│       │   ├── model/         #    records + 枚举（snake_case JSON）
│       │   ├── repository/    #    四个 DAO（列白名单防注入）
│       │   ├── service/       #    五个服务 + ApiException
│       │   ├── web/           #    AuthInterceptor / CorsHandler / ErrorMapper / controller
│       │   └── util/          #    Json / Time
│       ├── main/resources/schema.sql
│       └── test/java/family/  #    55 项 JUnit（内存 SQLite）
└── data/                      # ③ 数据块（git 忽略，含隐私）
    ├── family.db              #    SQLite 主库（WAL 模式）
    ├── family.db-wal / -shm   #    WAL 运行时日志（./backup.sh 在线备份无需停服）
    ├── .jwt-secret            #    JWT 签名密钥（0600）
    └── uploads/gallery/       #    相册原图与缩略图落盘
```

---

## 三、快速开始

### 0) 启动文件（推荐）

仓库根提供统一启动脚本，自动按需构建、后台运行、pid/日志管理（`run/` 目录，git 忽略）：

```bash
./start.sh            # 生产模式：按需构建 jar/dist，后端 8080 同进程托管前端
./start.sh dev        # 开发模式：后端 8080 + 前端 dev 3266（热更新）
./start.sh status     # 查看运行状态
./start.sh restart    # 重启后端（重建 jar 后必须重启）
./start.sh stop       # 停止本脚本启动的前后端
./start.sh build      # 仅构建（后端 jar + 前端 dist）
```

- macOS 可双击 `start.command`：生产模式启动并自动打开浏览器。
- 环境变量：`PORT` / `DATA_DIR` / `STATIC_DIR` / `MVN` / `SKIP_TESTS=1`（跳过单测）。
- 前端 dev 为单进程入口 `frontend/dev-server.js`（`npm run dev` 同），避免 webpack-cli 多层 spawn 导致停止时留孤儿进程占端口；脚本启动后按端口反查真实 pid 写入 `run/frontend.pid`，停止精确可靠。
- 日志：`run/backend.log`、`run/frontend.log`。

### 环境要求

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| JDK | 17+（编译 release 17；21/25 实测可用） | 后端运行 |
| Maven | 3.9+ | 后端构建 |
| Node.js | 18+ | 前端构建 / dev server |

### 1) 启动后端

在**仓库根目录**执行（数据与静态目录默认相对根目录解析）：

```bash
# 构建（含 55 项单元测试）
mvn -f backend/pom.xml package

# 运行（默认端口 8080，数据目录 ./data，静态目录 ./frontend/dist）
java --enable-native-access=ALL-UNNAMED -jar backend/target/chengmai-backend.jar

# 可选：灌入完全虚构的演示数据（仅空库；王氏四代 12 人，账号已内置）
sqlite3 data/family.db < data/seed-demo.sql
```

> `--enable-native-access=ALL-UNNAMED` 用于消除 sqlite-jdbc 的 JDK 原生访问警告，可省略但会有 WARNING。

### 2) 前端开发模式

```bash
cd frontend
npm install
npm run dev          # http://localhost:3266
```

dev server 将 `/api` 与 `/uploads` 代理到 `http://localhost:8080`，因此**先起后端再起前端**即可联调；
`public/` 目录（含 `config.js`）在 dev 下也直接可访问。

### 3) 生产构建 + 同源部署

```bash
cd frontend && npm run build     # 产出 frontend/dist/
# 回到仓库根，重启后端即自动托管 dist（同源，无需 nginx）
java --enable-native-access=ALL-UNNAMED -jar backend/target/chengmai-backend.jar
# 访问 http://localhost:8080
```

### 4) 前后端分离部署（前端上 CDN）

1. `cd frontend && npm run build`，把 `frontend/dist/` 整体上传到 CDN / 静态托管；
2. 修改托管目录中的 `config.js`：`window.APP_CONFIG = { apiBase: 'https://api.example.com' }`（**改文件即可，无需重新构建**）；
3. 后端独立运行并设置数据目录：`DATA_DIR=/srv/family-data java -jar chengmai-backend.jar`；
4. 后端 CORS 已放行跨域携带 `Authorization`，无需额外配置。

前端使用 HashRouter（`/#/路由`），静态托管无需任何 rewrite 规则。

### 默认账号与安全提醒

仓库仅含**完全虚构**的演示种子 `data/seed-demo.sql`（王氏四代 12 人）；账号在建库时内置：
`admin / demo123`（管理员）、`viewer / demo123`（访客）。**部署到任何非本机环境前请立即在「账号管理」改密**；
真实家谱数据请自行录入，切勿提交 / 推送真实数据、照片或密钥（详见 [SECURITY.md](SECURITY.md)）。
`.jwt-secret` 为签名密钥，权限 0600，切勿入库 / 上传 / 分享。

---

## 四、配置项

### 后端环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `8080` | HTTP 端口 |
| `DATA_DIR` | `data` | 数据块目录（db / uploads / secret），相对进程 cwd |
| `STATIC_DIR` | `frontend/dist` | 同进程托管的前端产物目录；目录不存在则只提供 API |

上传限制为常量：单文件 20MB、单请求 45MB；允许扩展名 png / jpg / jpeg / gif / webp。

### 前端运行时配置

| 位置 | 作用 |
| --- | --- |
| `public/config.js` → `window.APP_CONFIG.apiBase` | API 基址；留空 = 同域；填完整地址 = 分离部署 |
| `localStorage.fm_token` | 登录 JWT（7 天有效）；401 自动清除并回登录页 |

---

## 五、数据块（data/）

| 文件 | 说明 |
| --- | --- |
| `family.db` | SQLite 主库，WAL 模式 + 外键开启；首次启动按 `schema.sql` 自动建表 |
| `family.db-wal` / `-shm` | WAL 运行时文件；`./backup.sh` 在线备份无需停服，冷拷贝则三文件一并 |
| `.jwt-secret` | HS256 密钥文件；不存在时自动生成并 chmod 0600 |
| `uploads/gallery/` | 相册原图 + `thumb_` 缩略图；删除图片记录时同步删文件 |

### 表结构概览

| 表 | 要点 |
| --- | --- |
| `users` | username 唯一；role ∈ admin/editor/viewer；bcrypt 哈希（与 bcryptjs 互通） |
| `family_members` | `parent_id` 自引用成树，删父节点子女归属置空（ON DELETE SET NULL）；generation / generation_char / sibling_rank / family_rank；配偶以字段存储（spouse_name 等） |
| `generation_chars` | generation 唯一；hidden 控制前端展示 |
| `gallery_images` | tags 为 JSON 数组字符串；status 状态机 pending/approved/rejected/hidden；记录审核人与时间 |

### 备份 / 迁移 / 互通

- **备份**：`./backup.sh [备份根目录]` 在线一致备份（sqlite3 `.backup`，无需停服），产出库快照 + `uploads/` + 全量 SQL dump（`family-data.sql`，schema + 全表数据，可灌空库恢复），并打同名 `.zip`（完整性校验过）；默认落在 `backups/`（已忽略）；
- **迁移**：把 `data/` 放到新机器并用 `DATA_DIR` 指向它即可，schema 自动补齐；
- **与 Node 版不互通**：姊妹项目 `../family-manage`（Node/Express 后端）为 TEXT 主键与旧账号契约；本版已改数字自增主键（10000 起）并内置账号，**库结构不再兼容，不可共用 `data/`**。

> `data/` 含真实家族隐私与密码哈希，已被 `.gitignore` 整体忽略——它作为本地运行块存在，不进入版本库。

---

## 六、API 契约

- 基址 `/api`；除登录与 OPTIONS 外均需 `Authorization: Bearer <token>`；
- 错误统一 `{ "error": "消息" }` + 对应状态码（400/401/403/404/409/413）；
- JSON 字段一律 snake_case；时间戳 ISO 毫秒字符串。

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 公开 | 登录，返回 `{token, user}`；账号为裸用户名，精确匹配 |
| GET | `/api/auth/me` | 登录 | 恢复会话 |
| PUT | `/api/auth/password` | 登录 | 修改本人密码 |
| GET | `/api/members` | 登录 | 全量成员 |
| POST | `/api/members` | admin / editor | 新增（字辈 / 排行可自动计算） |
| POST | `/api/members/batch` | admin / editor | 批量新增，单次最多 500 人，失败整批回滚 |
| PUT | `/api/members/batch` | admin / editor | 批量更新，单次最多 500 人，失败整批回滚 |
| PUT | `/api/members/order` | admin / editor | 提交完整同父顺序；重排家庭排行与同性别排行 |
| PUT | `/api/members/:id` | admin / editor | 更新（以请求体为准重算排行） |
| DELETE | `/api/members/:id` | admin / editor | 删除（子女归属置空） |
| GET | `/api/generation-chars` | 登录 | 字辈列表 |
| POST / PUT / DELETE | `/api/generation-chars[/:id]` | admin / editor | 字辈增改删（世代唯一冲突 409） |
| GET | `/api/gallery` | 登录 | 按角色可见性返回图片 |
| GET | `/api/gallery/file?path=...` | 登录 | 按图片审核状态鉴权读取，不做目录直链 |
| POST | `/api/gallery` | 登录 | multipart 上传，初始 pending |
| PATCH | `/api/gallery/:id/status` | admin | 审核状态流转 |
| PUT / DELETE | `/api/gallery/:id` | admin | 改元信息 / 删除（同步删文件） |
| GET / POST | `/api/users` | admin | 账号列表 / 新建 |
| PUT | `/api/users/:id/role` | admin | 改角色（保留至少一名管理员） |
| DELETE | `/api/users/:id` | admin | 删账号（不能删自己 / 最后一名管理员） |

同源模式下 `/` 托管前端产物；上传文件保留在数据目录，仅通过鉴权图片接口读取。

---

## 七、前端块说明

- 技术栈：React 18 + TypeScript + Tailwind 3 + framer-motion + lucide-react；webpack 5 构建，**无服务端渲染、无 Node 运行时依赖**。
- 路由：`/login`、`/dashboard`（首页）、`/graph`（家谱图谱，含扇形/传统双风格切换）、`/members`（成员管理，`?view=table|tree|generations` 切换表格/世系/世代）、`/members/new`、`/members/:id/edit`、`/members/batch`（`?action=add|edit`）、`/gallery`、`/generation-chars`、`/accounts`。
  旧地址 `/dashboard-v2`、`/tree-canvas`、`/tree`、`/tree-v2`、`/members/batch-edit`、`/members/edit/:id` 自动重定向，旧书签仍可使用。
- 双风格共享 `pages/tree/shared.ts`（tidy 布局 + 平移缩放 hook）与 `components/MemberPanel.tsx`（详情面板）；
  默认首选扇形谱图（选择记忆于 `localStorage.tree.graphStyle`，旧 `fm_tree_mode_v2` 记忆自动迁移）；扇形中配偶不切分成员角度，而是成员弧外侧整跨度的粉色"婚环"带（名字沿环切向书写、♥ 标记、可点击开详情）；
  传统图谱以谱页吊线为主体（竖排右起、印章题签、墨线吊挂），融合原画布的夫妻双柱信息（婚线♥、生卒、性别、卡框开关）；
  折叠体系：默认全部展开；工具栏「全部折叠／全部展开」；每个分支节点三钮簇——双箭上=折叠整支（含全部后代）、圆钮=折/展单代（+N 后代计数）、双箭下=展开整支，整支全折/全展时对应双箭钮高亮；折叠后视口自动重定位到操作节点；
  支持 `#/graph?focus=<memberId>` 从首页 / 分布图跳转定位并开面板；搜索覆盖折叠分支，回车自动展开祖先链。
- 图谱工作流：导出菜单提供 JSON / SVG / 2x PNG / PDF；URL 查询参数保存 `style / root / focus / q / collapsed`，可直接分享当前视图；详情面板支持编辑成员与配偶、添加子女、同辈拖拽排序（移动端提供上下移动按钮）。
- 性能与反馈：成员 / 字辈按账号共享 30 秒缓存并合并重复请求；传统卡片、扇形弧段与标签按视口裁剪；页面加载失败显示重试入口，批量写操作失败整批回滚。
- 主题：色板定义在 `tailwind.config.js`（cinnabar 朱砂 / gilt 鎏金 / jade / qing 黛青 / slate 暖墨 / paper 宣纸）；
  全局控件类 `ui-card / ui-head / ui-title / ui-input / ui-select / ui-btn-* / ui-icon-btn / ui-chip / ui-label / seal` 定义在 `styles/index.css`，新页面请复用而非另起样式。
- 导航菜单：分组信息架构（总览 / 家谱 / 家族资料 / 系统管理），成员页内切换表格、世系与世代；实时计数徽标（`useNavCounts`，20s 缓存、按账号与角色隔离）、待审金点、管理员组按角色隐藏；
  展开 / 收起 / 移动抽屉三态同构；弹出菜单统一 `ui-menu / ui-menu-item`，分段切换统一 `ui-seg / ui-seg-item`；顶栏带分组面包屑。

---

## 八、后端块说明

- 技术栈：Javalin 7（内嵌 Jetty 12）+ sqlite-jdbc + jjwt 0.12 + jbcrypt + Jackson；**无 Spring**，手动构造器注入装配于 `Main`。
- Javalin 7 迁移要点：路由/横切需在 `Javalin.create(cfg -> …)` 配置期经 `cfg.routes` 注册；`showJavalinBanner` 移至 `cfg.startup`；
  多静态挂载的前缀剥离行为变化会使 `/uploads` 404，故上传图片改由**显式路由** `/uploads/*` 服务（含路径穿越防护），前端 `/` 静态挂载保留。
- 分层：`config → db → model → repository → service → web(controller)`，横切（CORS / 鉴权 / 异常映射）独立成类。
- 安全要点：DAO 列白名单防注入；密码 bcrypt；JWT HS256（sub + role，7 天）；密钥文件 0600；`UserView` 永不暴露哈希；上传扩展名白名单 + 大小限制。
- 测试：`mvn -f backend/pom.xml test` —— 58 项 JUnit，全部跑在内存 SQLite 上，覆盖自动字辈 / 排行、批量事务回滚、同辈排序、权限边界、最后管理员保护、token 互通、上传落盘与审核可见性等。

---

## 九、验证清单

```bash
# 后端单测
mvn -f backend/pom.xml test
# 前端检查与测试
cd frontend
npm run lint
npm run typecheck
npm run test:run
npm run build
# API 冒烟（自动使用临时 DATA_DIR，不读取真实数据）
cd ..
mvn -f backend/pom.xml package
python3 tests/smoke_test.py
```

浏览器回归建议覆盖：登录 → 强制改密 → 首页统计与抽屉 → 双风格谱图（全量搜索 / 折叠 / 换根 / focus 跳转 / 导出 / 卡框开关）→ 同辈拖拽排序 → 批量编辑 → 图册上传审核 → 账号权限边界 → 移动端抽屉与卡片布局。

---

## 十、开发约定与坑

- **重建 jar 后必须重启后端进程**：运行中的 JVM 持有被覆盖的 jar 时，懒加载类会抛 `ClassNotFoundException`；
- dev 联调顺序：先后端（8080）再前端（3266）；代理只认 `/api` 与 `/uploads` 前缀；
- SQLite 为单连接 + synchronized 串行写，WAL 提升读并发；不要多进程同时写同一库；
- 端口占用：`lsof -ti:8080` / `lsof -ti:3266` 查进程；
- 视觉统一：新增页面使用 `ui-*` 控件类与主题色板，禁止引入新的灰阶 / 圆角胶囊徽标 / 渐变头像。

---

## 十一、开源与隐私

- 许可证：**MIT**（见 [LICENSE](LICENSE)）。
- **代码与数据彻底分离**：仓库只含代码、文档与完全虚构的演示种子；真实家谱（`data/family.db`、
  `uploads/`、`.jwt-secret`）一律被 `.gitignore` 忽略，仅放行 `data/README.md` 与 `data/seed-demo.sql`。
- 克隆后体验：`./start.sh` 自动建表并内置 `admin / demo123`、`viewer / demo123` → 可选
  `sqlite3 data/family.db < data/seed-demo.sql` 灌入虚构王氏四代 12 人；真实数据自行录入，**永不入库**。
- 安全设计（本地化存储 / 密钥自动生成 0600 / bcrypt / JWT / 角色矩阵 / 上传白名单 / 列白名单防注入）见 [SECURITY.md](SECURITY.md)。
- 无 git 历史包袱：本项目以干净起点开源，不存在历史提交中的隐私残留。

---

## 十二、相关项目

- `../family-manage`：Node/Express 版后端 + 同前端契约的实现（含 Supabase 迁移脚本与 CSV 种子）；本版改数字主键后**与其数据、token 不再互通**；
- 历史：初版基于 Supabase，后迁移 SQLite + Node，再克隆出本 Java 版并完成前后端分离三块改造。