# 投骰乐园前台 (Dice Paradise Client)

投骰乐园前台是一个基于 Next.js App Router 的快艇骰子网页游戏客户端，包含登录注册、大厅、房间、对局、结算、排行榜、个人中心和活动中心等页面。

当前项目主要负责前端交互、页面表现、游戏流程调用、WebSocket 实时同步和本地状态管理。后端接口通过 `/api/v1` 代理转发到实际后端服务。

## 当前状态

- 登录、注册、Token 校验已接入后端接口。
- 大厅支持创建房间、加入房间、房间列表、音效设置、星星/积分展示。
- 房间页支持在线房间、准备、踢人、开始游戏、房间 WebSocket 同步和房间聊天。
- 游戏页支持创建对局、投骰、锁骰、计分、轮次同步、游戏 WebSocket 同步和对局聊天。
- 结算弹窗接入结算数据、排行榜经验结算、再来一局和返回大厅。
- 排行榜接入最高分、投骰经验值、最高连胜、胜率排行榜。
- 首页大厅聊天已接入前端 WebSocket 客户端，后端需要提供对应聊天 WebSocket 服务。
- 活动中心目前是前端展示页，后端活动/任务/称号领取功能暂不实现。

## 技术栈

- Next.js 14 App Router
- React 18
- TypeScript 5
- Zustand
- Axios
- 原生 WebSocket
- CSS Modules / Tailwind CSS
- lucide-react 图标

> 注意：项目依赖中仍存在 `socket.io-client`，但当前实时通信代码实际使用浏览器原生 `WebSocket`。

## 快速开始

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:3000
```

生产构建：

```bash
npm run build
npm start
```

代码检查：

```bash
npm run lint
```

## 环境变量

本地开发使用 `.env.local`：

```env
NEXT_PUBLIC_API_BASE_URL=/api/v1
API_PROXY_TARGET=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000
```

含义：

- `NEXT_PUBLIC_API_BASE_URL`：浏览器请求基地址。推荐本地使用 `/api/v1`，由 Next.js 代理转发，避免跨域问题。
- `API_PROXY_TARGET`：Next.js 服务端代理目标，也就是真正后端地址。
- `NEXT_PUBLIC_WS_URL`：浏览器直连的 WebSocket 后端地址。

如果页面或接口返回 `503`，通常表示 Next.js 代理无法连接 `API_PROXY_TARGET` 指向的后端服务。需要确认后端已启动、端口可访问、防火墙已放行。

## 主要页面

```text
src/app/login        登录 / 注册
src/app/page.tsx     游戏大厅
src/app/room         在线房间
src/app/game         游戏对局
src/app/result       独立结算页
src/app/leaderboard  排行榜
src/app/profile      个人中心
src/app/activity     活动中心，当前仅前端展示
src/app/api/v1       Next.js API 代理
```

## 主要模块

```text
src/modules/api          Axios 客户端、认证拦截、错误处理
src/modules/auth         登录、注册、Token 校验
src/modules/game         游戏创建、状态、投骰、锁骰、计分、游戏 WebSocket
src/modules/room         房间创建、加入、离开、准备、开始、房间 WebSocket
src/modules/result       结算、再来一局、返回大厅、结算详情聚合
src/modules/leaderboard  排行榜查询、游戏结束统一结算、胜利场次更新
src/modules/chat         大厅聊天 WebSocket 客户端
src/modules/audio        全局音乐、按钮音效、投骰音效
src/modules/lobby        大厅星星/音效设置接口
```

## 已接入的核心接口

认证：

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/me`

房间：

- `POST /api/v1/room/create`
- `POST /api/v1/room/join`
- `GET /api/v1/room/current`
- `GET /api/v1/room/list`
- `POST /api/v1/room/leave`
- `POST /api/v1/room/{roomCode}/ready`
- `POST /api/v1/room/{roomCode}/start`
- `POST /api/v1/room/{roomCode}/kick`
- `DELETE /api/v1/room/{roomCode}`
- `WS /api/v1/room/ws/{roomCode}/{playerId}`

游戏：

- `POST /api/v1/game/create`
- `GET /api/v1/game/{gameId}`
- `POST /api/v1/game/{gameId}/roll`
- `POST /api/v1/game/{gameId}/score`
- `POST /api/v1/game/{gameId}/quit`
- `GET /api/v1/score/score-panel/init/{gameId}`
- `GET /api/v1/score/game/{gameId}/lock-status`
- `GET /api/v1/score/possible/{gameId}`
- `WS /api/v1/game/ws/{gameId}/{playerId}`

结算：

- `GET /api/v1/settlement/{gameId}/final-ranking`
- `GET /api/v1/settlement/{gameId}/score-summary`
- `GET /api/v1/settlement/{gameId}/highlights`
- `POST /api/v1/settlement/{gameId}/rematch`
- `POST /api/v1/settlement/{gameId}/back`

排行榜：

- `GET /api/v1/leaderboard/highest-score`
- `GET /api/v1/leaderboard/experience`
- `GET /api/v1/leaderboard/win-streak`
- `GET /api/v1/leaderboard/win-rate`
- `POST /api/v1/leaderboard/game-settle`
- `POST /api/v1/leaderboard/update-games`

大厅与聊天：

- `GET /api/v1/home/points`
- `GET /api/v1/home/settings/sound`
- `POST /api/v1/home/settings/sound`
- `WS /api/v1/chat/ws/lobby/{playerId}`

活动中心：

- 当前不接后端接口。
- 当前页面数据由前端静态数据驱动。
- 活动任务、称号领取、奖励发放等后端功能暂不实现。

## WebSocket 消息约定

房间、游戏、聊天 WebSocket 均支持基础心跳：

```json
{ "type": "ping" }
```

前端会回复：

```json
{ "type": "pong" }
```

聊天发送格式：

```json
{
  "type": "chat",
  "content": {
    "message": "大家好"
  }
}
```

前端可解析的聊天返回格式示例：

```json
{
  "type": "chat",
  "player_id": "1",
  "player_name": "玩家A",
  "content": {
    "message": "大家好"
  },
  "timestamp": "2026-06-12T10:00:00"
}
```

## 项目结构

```text
src/
  app/                 Next.js 页面与 API 代理
  assets/              图片、音频等静态资源
  components/          通用组件、游戏组件、布局组件
  config/              API / WebSocket 配置
  constants/           游戏规则、路由等常量
  hooks/               自定义 Hooks
  mocks/               旧 Mock 数据和本地兜底数据
  modules/             业务接口、WebSocket、音频等模块
  stores/              Zustand 状态管理
  styles/              全局样式
  types/               TypeScript 类型定义
  utils/               工具函数
```

## scripts 目录

`scripts/` 目录存放开发阶段的辅助验证脚本，主要用于检查页面结构、样式约定和接口调用契约，例如大厅、登录页、排行榜页、房间弹窗、聊天组件和游戏 API 约束。

这些脚本不参与网站运行，也不会被 `npm run dev`、`npm run build`、`npm start` 自动执行。它们更像手动防回归工具；如果后续不再需要这类人工检查，可以删除，不影响前台项目启动和构建。

## 游戏规则概览

快艇骰子使用 5 颗骰子。玩家每回合最多投掷 3 次，可以锁定部分骰子，并在计分表中选择一个未使用的计分类别。

上半区：

- 一点到六点：对应点数骰子的总和。
- 上半区小计达到规则阈值后获得额外奖励。

下半区：

- 三条
- 四条
- 葫芦
- 小顺
- 大顺
- 快艇
- 机会

最终根据所有计分类别总分决定排名。

## 开发注意事项

- 登录后的背景音乐才会播放；登录页未登录时不会自动播放背景音乐。
- API 默认走 `/api/v1` 代理，后端地址请优先改 `.env.local`，不要直接写死到业务代码里。
- WebSocket 地址由 `NEXT_PUBLIC_WS_URL` 控制。
- 活动中心暂时不要接后端逻辑，除非后端接口已经确认。
- 结算和排行榜相关接口需要 Token，未登录会被认证拦截器跳转到登录页。

## 相关文档

- [AGENTS.md](AGENTS.md)
- [前端连接后端指南.md](前端连接后端指南.md)
- [前端WebSocket使用指南.md](前端WebSocket使用指南.md)
