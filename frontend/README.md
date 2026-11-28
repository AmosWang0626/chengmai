# frontend · 前端

React 18 + TypeScript + Tailwind 3 + webpack 5 的纯静态前端，可独立部署到 CDN 或任意静态托管。

## 开发

先启动后端，再执行：

```bash
npm ci
npm run dev          # http://localhost:3266，/api 与 /uploads 代理到 8080
```

也可在仓库根目录执行 `../start.sh dev`，统一管理前后端进程。

## 构建与检查

```bash
npm run lint
npm run test:run
npm run typecheck
npm run build        # 类型检查 + 生产构建，产出 dist/
```

## 部署配置

- `public/config.js`：通过 `window.APP_CONFIG.apiBase` 设置后端地址；留空表示同域，部署后可直接修改，无需重建。
- 使用 HashRouter，静态托管不需要路由重写。
- 分离部署时，后端需通过 `CORS_ORIGINS` 放行前端域名。

## 主要目录

- `src/pages`：总览、成员、家谱图谱、图册、字辈与账号页面。
- `src/pages/tree`：扇形图谱、传统图谱、共享布局与导出。
- `src/components` / `src/hooks`：共享组件与数据状态。
- `src/styles/index.css` / `tailwind.config.js`：主题与 `ui-*` 控件样式。
- `src/test`：Vitest 测试。

完整启动与部署说明见根目录 [README.md](../README.md)。
