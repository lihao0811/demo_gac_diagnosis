FROM node:18-alpine

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制前端代码并构建
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
RUN cd frontend && pnpm install --frozen-lockfile

COPY frontend/ ./frontend/
ENV CI=false
RUN cd frontend && pnpm run build

# 复制后端代码并构建
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/
RUN cd backend && npm run build

# 设置环境变量
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

# 启动后端服务
CMD ["node", "backend/dist/index.js"]
