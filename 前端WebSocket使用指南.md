# 快艇骰子游戏 - 前端WebSocket使用指南

## 📋 目录

- [概述](#概述)
- [连接端点](#连接端点)
- [连接流程](#连接流程)
- [消息格式](#消息格式)
- [消息类型详解](#消息类型详解)
- [心跳机制](#心跳机制)
- [错误处理](#错误处理)
- [前端实现示例](#前端实现示例)
- [最佳实践](#最佳实践)

---

## 概述

本项目使用WebSocket实现实时多人游戏通信，支持房间状态同步、游戏动作广播、聊天消息等功能。

### 技术特性

- ✅ 房间级别连接管理
- ✅ 自动心跳检测（30秒间隔）
- ✅ 消息格式验证
- ✅ 异常断线处理
- ✅ 连接数限制（每房间最多10人）
- ✅ 广播和单播消息支持

---

## 连接端点

### 1. 游戏WebSocket端点

```
ws://localhost:8000/api/v1/game/ws/{game_id}/{player_id}
```

**用途**：用于游戏进行中的实时状态同步

**参数**：
- `game_id`: 游戏ID（字符串）
- `player_id`: 玩家ID（字符串）

### 2. 房间WebSocket端点

```
ws://localhost:8000/api/v1/room/ws/{room_code}/{player_id}
```

**用途**：用于房间等待大厅的状态同步

**参数**：
- `room_code`: 房间编码（6位字母数字组合）
- `player_id`: 玩家ID（字符串）

---

## 连接流程

### 完整连接流程图

```
前端                                    后端
 │                                       │
 ├─ 1. 创建/加入房间 (HTTP API)          │
 │   POST /api/v1/room/create            │
 │   或 POST /api/v1/room/join           │
 │─────────────────────────────────────>│
 │                                       │
 │<─────────────────────────────────────┤
 │   返回 room_code 和 player_id        │
 │                                       │
 ├─ 2. 建立WebSocket连接                 │
 │   ws://.../room/ws/{room_code}/       │
 │       {player_id}                     │
 │─────────────────────────────────────>│
 │                                       │
 │<─────────────────────────────────────┤
 │   连接成功                             │
 │                                       │
 ├─ 3. 接收心跳包 (每30秒)               │
 │   {"type": "ping"}                    │
 │<─────────────────────────────────────┤
 │                                       │
 ├─ 4. 响应心跳                          │
 │   {"type": "pong"}                    │
 │─────────────────────────────────────>│
 │                                       │
 ├─ 5. 发送/接收消息                     │
 │   {"type": "chat", ...}              │
 │<─────────────────────────────────────>│
 │                                       │
```

### 步骤详解

#### 步骤1：创建或加入房间

**创建房间**：
```javascript
const response = await fetch('http://localhost:8000/api/v1/room/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // 需要登录
  },
  body: JSON.stringify({
    player_name: '玩家1',
    room_name: '我的房间',
    max_players: 4
  })
});

const data = await response.json();
// data.data.room_code: "ABC123"
// data.data.players[0].player_id: "123"
```

**加入房间**：
```javascript
const response = await fetch('http://localhost:8000/api/v1/room/join', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    room_code: 'ABC123',
    player_name: '玩家2'
  })
});

const data = await response.json();
// data.data.player_id: "456"
```

#### 步骤2：建立WebSocket连接

```javascript
const ws = new WebSocket(
  `ws://localhost:8000/api/v1/room/ws/${roomCode}/${playerId}`
);

ws.onopen = () => {
  console.log('WebSocket连接已建立');
};
```

---

## 消息格式

### 标准消息结构

所有WebSocket消息均采用JSON格式，包含以下字段：

```typescript
interface WebSocketMessage {
  type: MessageType;      // 消息类型（必填）
  content?: any;          // 消息内容（可选）
  timestamp?: string;     // 时间戳（ISO 8601格式，可选）
  player_id?: string;     // 发送者玩家ID（服务器自动添加）
  player_name?: string;   // 发送者玩家名称（服务器自动添加）
}
```

### 消息类型枚举

```typescript
enum MessageType {
  CHAT = "chat",                    // 聊天消息
  GAME_ACTION = "game_action",      // 游戏动作
  SYSTEM = "system",                // 系统消息
  PING = "ping",                    // 心跳请求
  PONG = "pong",                    // 心跳响应
  ERROR = "error",                  // 错误消息
  ROOM_UPDATED = "room_updated",   // 房间状态更新
  PLAYER_KICKED = "player_kicked"  // 玩家被踢出
}
```

---

## 消息类型详解

### 1. 聊天消息 (chat)

**发送格式**：
```json
{
  "type": "chat",
  "content": {
    "message": "大家好！"
  }
}
```

**接收格式**（服务器广播）：
```json
{
  "type": "chat",
  "content": {
    "message": "大家好！"
  },
  "player_id": "123",
  "player_name": "玩家1",
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

### 2. 游戏动作 (game_action)

**掷骰子动作**：
```json
{
  "type": "game_action",
  "action": "roll",
  "player_id": "123",
  "dice": [1, 3, 5, 2, 6],
  "dice_locked": [false, true, false, false, true],
  "rolls_left": 2,
  "current_player": "123",
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

**提交分数动作**：
```json
{
  "type": "game_action",
  "action": "submit_score",
  "player_id": "123",
  "category": "ones",
  "score": 3,
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

### 3. 系统消息 (system)

**玩家加入**：
```json
{
  "type": "system",
  "content": {
    "action": "player_joined",
    "player_id": "456",
    "player_name": "玩家2"
  },
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

**玩家离开**：
```json
{
  "type": "system",
  "content": {
    "action": "player_left",
    "player_id": "456",
    "player_name": "玩家2"
  },
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

### 4. 房间状态更新 (room_updated)

当房间状态发生变化时（玩家加入/离开/准备状态改变），服务器会广播此消息：

```json
{
  "type": "room_updated",
  "data": {
    "room_code": "ABC123",
    "room_name": "我的房间",
    "max_players": 4,
    "players": [
      {
        "player_id": "123",
        "name": "玩家1",
        "is_host": true,
        "is_ready": true,
        "points": 0
      },
      {
        "player_id": "456",
        "name": "玩家2",
        "is_host": false,
        "is_ready": false,
        "points": 0
      }
    ],
    "status": "waiting",
    "host_id": "123"
  },
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

**房间状态枚举**：
- `waiting`: 等待中
- `playing`: 游戏中
- `finished`: 已结束

### 5. 玩家被踢出 (player_kicked)

当房主踢出玩家时，被踢玩家会收到此消息：

```json
{
  "type": "player_kicked",
  "data": {
    "room_code": "ABC123",
    "player_id": "456",
    "message": "你已被房主移出房间"
  },
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

### 6. 心跳消息 (ping/pong)

**服务器发送**：
```json
{
  "type": "ping"
}
```

**客户端响应**：
```json
{
  "type": "pong"
}
```

### 7. 错误消息 (error)

当消息格式错误或其他异常时：

```json
{
  "type": "error",
  "message": "Invalid JSON format",
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

---

## 心跳机制

### 工作原理

1. **服务器主动发送**：服务器每30秒向客户端发送一次 `ping` 消息
2. **客户端响应**：客户端收到 `ping` 后应立即回复 `pong`
3. **超时检测**：如果60秒内未收到客户端响应，服务器将断开连接

### 前端实现

```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  // 自动响应心跳
  if (message.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
    return;
  }
  
  // 处理其他消息
  handleMessage(message);
};
```

---

## 错误处理

### 连接错误

**房间已满**：
```json
{
  "type": "error",
  "message": "Room is full"
}
```
WebSocket连接会被关闭，关闭码为1008。

**无效的JSON格式**：
```json
{
  "type": "error",
  "message": "Invalid JSON format",
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

**消息结构验证失败**：
```json
{
  "type": "error",
  "message": "Invalid message structure: ...",
  "timestamp": "2024-01-15T10:30:00.123456"
}
```

### 连接关闭码

| 关闭码 | 说明 |
|--------|------|
| 1000 | 正常关闭 |
| 1008 | 策略性关闭（房间已满、权限不足等） |
| 1011 | 服务器错误 |

---

## 前端实现示例

### 完整的WebSocket管理类

```javascript
class GameWebSocket {
  constructor(roomCode, playerId, token) {
    this.roomCode = roomCode;
    this.playerId = playerId;
    this.token = token;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageHandlers = new Map();
    this.isManualClose = false;
  }

  connect() {
    const wsUrl = `ws://localhost:8000/api/v1/room/ws/${this.roomCode}/${this.playerId}`;
    this.ws = new WebSocket(wsUrl);
    this.isManualClose = false;

    this.ws.onopen = () => {
      console.log('WebSocket连接已建立');
      this.reconnectAttempts = 0;
      this.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('消息解析失败:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      this.onError?.(error);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket连接关闭:', event.code, event.reason);
      this.onDisconnect?.(event);
      
      // 自动重连
      if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this.connect();
        }, this.reconnectDelay * this.reconnectAttempts);
      }
    };
  }

  handleMessage(message) {
    // 自动响应心跳
    if (message.type === 'ping') {
      this.send({ type: 'pong' });
      return;
    }

    // 调用注册的消息处理器
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    } else {
      console.warn('未处理的消息类型:', message.type, message);
    }
  }

  on(event, handler) {
    this.messageHandlers.set(event, handler);
  }

  off(event) {
    this.messageHandlers.delete(event);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket未连接');
    }
  }

  close() {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close();
    }
  }

  // 发送聊天消息
  sendChat(message) {
    this.send({
      type: 'chat',
      content: { message }
    });
  }

  // 发送游戏动作
  sendGameAction(action, data) {
    this.send({
      type: 'game_action',
      action,
      ...data
    });
  }
}
```

### 使用示例

```javascript
// 创建WebSocket实例
const gameWs = new GameWebSocket('ABC123', '123', 'your-token');

// 注册事件处理器
gameWs.on('chat', (message) => {
  console.log(`${message.player_name}: ${message.content.message}`);
  displayChatMessage(message);
});

gameWs.on('room_updated', (message) => {
  console.log('房间状态更新:', message.data);
  updateRoomUI(message.data);
});

gameWs.on('game_action', (message) => {
  console.log('游戏动作:', message.action);
  handleGameAction(message);
});

gameWs.on('player_kicked', (message) => {
  alert(message.data.message);
  gameWs.close();
  redirectToLobby();
});

gameWs.on('error', (message) => {
  console.error('服务器错误:', message.message);
  showErrorToast(message.message);
});

// 连接回调
gameWs.onConnect = () => {
  console.log('连接成功！');
  hideLoadingSpinner();
};

gameWs.onDisconnect = (event) => {
  if (event.code === 1008) {
    alert('连接被拒绝：房间已满');
  }
};

// 建立连接
gameWs.connect();

// 发送消息
gameWs.sendChat('大家好！');

// 关闭连接
// gameWs.close();
```

### React Hook示例

```javascript
import { useEffect, useRef, useState } from 'react';

function useGameWebSocket(roomCode, playerId) {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [roomState, setRoomState] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:8000/api/v1/room/ws/${roomCode}/${playerId}`
    );

    ws.onopen = () => {
      console.log('WebSocket已连接');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      // 心跳响应
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      // 处理不同类型的消息
      switch (message.type) {
        case 'chat':
          setMessages(prev => [...prev, message]);
          break;
        case 'room_updated':
          setRoomState(message.data);
          break;
        case 'player_kicked':
          alert(message.data.message);
          ws.close();
          break;
        default:
          console.log('收到消息:', message);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket已断开');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [roomCode, playerId]);

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const sendChat = (text) => {
    sendMessage({
      type: 'chat',
      content: { message: text }
    });
  };

  return {
    isConnected,
    messages,
    roomState,
    sendMessage,
    sendChat
  };
}

// 使用示例
function GameRoom({ roomCode, playerId }) {
  const { isConnected, messages, roomState, sendChat } = useGameWebSocket(
    roomCode,
    playerId
  );

  return (
    <div>
      <div>连接状态: {isConnected ? '已连接' : '未连接'}</div>
      <div>房间: {roomState?.room_name}</div>
      <div>玩家: {roomState?.players.map(p => p.name).join(', ')}</div>
      
      <div>
        {messages.map((msg, idx) => (
          <div key={idx}>
            {msg.player_name}: {msg.content.message}
          </div>
        ))}
      </div>
      
      <button onClick={() => sendChat('你好！')}>发送消息</button>
    </div>
  );
}
```

---

## 最佳实践

### 1. 连接管理

✅ **推荐做法**：
```javascript
// 在组件挂载时连接，卸载时断开
useEffect(() => {
  const ws = new WebSocket(url);
  
  return () => {
    ws.close();
  };
}, []);
```

❌ **避免**：
```javascript
// 不要在每次渲染时创建新连接
const ws = new WebSocket(url); // 错误！
```

### 2. 错误处理

✅ **推荐做法**：
```javascript
ws.onerror = (error) => {
  console.error('WebSocket错误:', error);
  showUserFriendlyError('连接出现问题，正在重连...');
};

ws.onclose = (event) => {
  if (event.code === 1008) {
    alert('房间已满，无法加入');
  }
};
```

### 3. 心跳响应

✅ **推荐做法**：
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  // 自动响应心跳，无需用户干预
  if (message.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
    return;
  }
  
  // 处理业务消息
  handleBusinessMessage(message);
};
```

### 4. 重连机制

✅ **推荐做法**：
```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

ws.onclose = (event) => {
  if (reconnectAttempts < maxReconnectAttempts) {
    setTimeout(() => {
      reconnectAttempts++;
      connectWebSocket();
    }, 1000 * reconnectAttempts);
  }
};
```

### 5. 消息验证

✅ **推荐做法**：
```javascript
ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    
    // 验证消息格式
    if (!message.type) {
      console.error('无效的消息格式:', message);
      return;
    }
    
    handleMessage(message);
  } catch (error) {
    console.error('JSON解析失败:', error);
  }
};
```

### 6. 性能优化

✅ **推荐做法**：
```javascript
// 使用防抖处理频繁更新
const debouncedUpdate = debounce((data) => {
  updateUI(data);
}, 100);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'room_updated') {
    debouncedUpdate(message.data);
  }
};
```

---

## 常见问题

### Q1: WebSocket连接失败怎么办？

**可能原因**：
1. 后端服务未启动
2. room_code 或 player_id 错误
3. 未登录（需要Authorization token）
4. 网络问题

**解决方案**：
```javascript
ws.onerror = (error) => {
  console.error('连接失败:', error);
  // 检查后端服务状态
  // 验证参数是否正确
  // 检查网络连接
};
```

### Q2: 如何处理断线重连？

参考上面的"重连机制"部分，实现指数退避重连策略。

### Q3: 消息发送失败怎么办？

```javascript
function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    console.error('WebSocket未连接');
    // 可以将消息加入队列，待重连后发送
  }
}
```

### Q4: 如何测试WebSocket？

使用浏览器控制台或工具如：
- **浏览器控制台**：直接运行WebSocket代码
- **Postman**：支持WebSocket测试
- **wscat**：命令行WebSocket客户端

```bash
# 使用wscat测试
wscat -c ws://localhost:8000/api/v1/room/ws/ABC123/123
```

---

## 附录

### WebSocket状态码

| 状态码 | 说明 |
|--------|------|
| 0 | CONNECTING - 连接中 |
| 1 | OPEN - 已连接 |
| 2 | CLOSING - 关闭中 |
| 3 | CLOSED - 已关闭 |

### 相关API文档

- [创建房间API](API接口设计文档.md#21-创建房间)
- [加入房间API](API接口设计文档.md#22-加入房间)
- [离开房间API](API接口设计文档.md#23-离开房间)

### 技术支持

如有问题，请查看：
- 后端代码：`app/api/websocket.py`
- 连接管理器：`app/websocket/manager.py`
- API文档：`API接口设计文档.md`