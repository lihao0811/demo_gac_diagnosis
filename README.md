# 广汽故障诊断系统 (GAC Diagnosis System)

一个面向维修技师的智能故障诊断系统，基于百炼大模型实现3步诊断流程。

## 功能特点

### 3步诊断流程
1. **故障感知**：支持VIN码/车牌号查询车辆信息，或通过自然语言描述车况
2. **故障排查**：
   - 任务分解：将故障排查拆分为多个子任务
   - 任务执行：支持自动或手动执行排查步骤
   - 故障确认：汇总任务结果，确认故障项目
3. **故障指导**：显示具体维修方案和维修手册

### 技术特点
- **智能对话**：基于百炼 qwen-max 大模型
- **Function Calling**：支持工具调用交互
- **流式响应**：实时显示AI回复
- **友好UI**：专为维修技师设计的简洁界面

## 技术栈

### 后端
- Node.js + Express + TypeScript
- SQLite 数据库
- 百炼大模型 API (qwen-max)

### 前端
- React 18 + TypeScript
- Tailwind CSS
- Axios + SSE

## 项目结构

```
demo_gac_diagnosis/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── config/       # 配置文件
│   │   ├── routes/       # API路由
│   │   ├── services/     # 业务逻辑
│   │   ├── models/       # 数据模型
│   │   ├── utils/        # 工具函数
│   │   └── index.ts      # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # 前端应用
│   ├── src/
│   │   ├── components/   # React组件
│   │   ├── hooks/        # 自定义Hooks
│   │   ├── services/     # API服务
│   │   ├── types/        # TypeScript类型
│   │   └── App.tsx       # 主应用
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 2. 配置环境变量

在后端目录创建 `.env` 文件：

```env
PORT=3001
BAILIAN_API_KEY=sk-a1f23477f6bf4e5e8dd0a672cdc0888c
BAILIAN_MODEL=qwen-max
```

### 3. 启动服务

```bash
# 启动后端（在backend目录）
npm run dev

# 启动前端（在frontend目录）
npm start
```

### 4. 访问应用

- 前端：http://localhost:3000
- 后端API：http://localhost:3001

## API 文档

### 对话接口

**POST /api/chat**

发送消息并获取AI回复。

请求体：
```json
{
  "message": "车辆发动机故障灯亮了",
  "sessionId": "session-123",
  "stage": "perception"
}
```

响应（流式）：
```
data: {"content": "我了解", "type": "text"}
data: {"content": "到您的车辆", "type": "text"}
data: {"done": true}
```

### 车辆信息查询

**GET /api/vehicle/:vin**

根据VIN码查询车辆信息。

## 开发说明

### 诊断流程状态机

```
[故障感知] -> [任务分解] -> [任务执行] -> [故障确认] -> [维修指导]
   ↑                                              ↓
   └────────────── 重新诊断 ──────────────────────┘
```

### 大模型提示词设计

系统通过精心设计的提示词引导大模型完成诊断流程：

1. **故障感知阶段**：引导用户输入车辆信息，识别故障现象
2. **排查阶段**：分解任务，逐步排查
3. **指导阶段**：生成维修方案和手册

## License

MIT
