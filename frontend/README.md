# frontend · 前端项目

React 18 + TypeScript + Tailwind 3 + webpack 5 的纯静态前端，可独立部署到 CDN / 任意静态托管。

```bash
npm install
npm run dev        # http://localhost:3266（/api、/uploads 代理到 localhost:8080）
npm run typecheck  # tsc --noEmit
npm run build      # 产出 dist/
```

- 运行时配置：`public/config.js` 的 `apiBase`（留空同域；填后端地址即分离部署），部署后改文件无需重构建。
- 登录态：`localStorage.fm_token`（JWT）。
- 路由为 HashRouter，静态托管无需 rewrite。
- 主题与控件类见 `tailwind.config.js` 与 `src/styles/index.css`（`ui-*` / `seal`）。
- 谱图双风格：`src/pages/FamilyTreeCanvas.tsx`（容器 + 风格切换）、`src/pages/tree/FanView.tsx`（扇形谱图）、`src/pages/tree/TraditionalView.tsx`（传统图谱：谱页吊线主体 + 夫妻双柱融合）；共享布局与平移缩放见 `src/pages/tree/shared.ts`。

完整架构、API 契约与部署说明见仓库根 [README.md](../README.md)。