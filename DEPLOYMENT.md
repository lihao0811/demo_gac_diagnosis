# Vercel 部署指南

## 前置准备

1. 注册 Vercel 账号：https://vercel.com
2. 安装 Vercel CLI（可选）：`npm install -g vercel`

## 部署步骤

### 方式一：通过 Vercel 网站部署（推荐）

1. 登录 Vercel 控制台
2. 点击 "New Project"
3. 导入 GitHub 仓库：`main-poc-area/demo_gac_diagnosis`
4. 配置项目：
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/build`

5. 配置环境变量（Environment Variables）：
   ```
   BAILIAN_API_KEY=your_api_key_here
   BAILIAN_APP_ID=your_app_id_here
   BAILIAN_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1
   PORT=3021
   ```

6. 点击 "Deploy" 开始部署

### 方式二：通过 Vercel CLI 部署

```bash
# 登录 Vercel
vercel login

# 部署项目
vercel

# 设置环境变量
vercel env add BAILIAN_API_KEY
vercel env add BAILIAN_APP_ID
vercel env add BAILIAN_ENDPOINT
vercel env add PORT

# 部署到生产环境
vercel --prod
```

## 注意事项

1. **环境变量**：确保在 Vercel 控制台中配置所有必需的环境变量
2. **API 路由**：后端 API 会自动部署为 Serverless Functions
3. **CORS 配置**：确保后端允许 Vercel 域名的跨域请求
4. **构建时间**：首次部署可能需要 3-5 分钟

## 部署后验证

1. 访问 Vercel 提供的域名
2. 测试车辆信息查询功能
3. 测试故障诊断流程
4. 检查 API 响应是否正常

## 常见问题

### 1. 构建失败
- 检查 `package.json` 中的依赖是否完整
- 查看 Vercel 构建日志

### 2. API 请求失败
- 检查环境变量是否正确配置
- 确认 CORS 设置

### 3. 页面加载缓慢
- 检查 API 响应时间
- 考虑使用 CDN 加速静态资源
