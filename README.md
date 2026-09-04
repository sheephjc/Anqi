# 暗棋 · Web 对战版

一款基于中国象棋棋盘的双人暗棋变体，支持本地同屏和四位房间号联机对战。联机模式由服务端保存暗棋身份并权威裁决落子。

## 本地运行

```bash
npm install
npm run dev
```

该命令会同时启动 Vite 前端与 `http://127.0.0.1:3001` 联机服务。生产构建后可运行：

```bash
npm run build
npm start
```

Windows PowerShell 如果限制执行 `npm.ps1`，可改用：

```powershell
npm.cmd install
npm.cmd run dev
```

## 检查与测试

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

开发模式可通过 `?seed=42` 使用固定洗牌，方便复现测试棋局；生产构建会忽略该参数。

## 结构

- `src/game/`：不依赖 React 的规则、状态、合法走法和公开状态投影。
- `src/components/`：棋盘、俘虏区和规则界面。
- `src/online/`：联机客户端状态与共享 Socket.IO 协议。
- `server/`：内存房间、断线恢复和服务端权威棋局。
- `public/assets/pieces/`：本地化并重新着色的 CC0 棋子 SVG。
- `tests/`：规则、组件和 Playwright 浏览器测试。

第三方视觉素材的来源和许可见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
