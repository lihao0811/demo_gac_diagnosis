FROM node:18-alpine

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制前端代码
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY frontend/ ./

# 构建
ENV CI=false
RUN pnpm run build

# 使用 nginx 托管静态文件
FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html

# nginx 配置 - 支持 SPA 路由
RUN echo 'server { \
    listen 8080; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
