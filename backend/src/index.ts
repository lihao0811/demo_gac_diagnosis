import express from 'express';
import cors from 'cors';
import path from 'path';
import chatRoutes from './routes/chat';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 健康检查 - 放在最前面，确保快速响应
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路径健康检查（Zeabur 默认检查）
app.get('/', (req, res, next) => {
  // 如果是健康检查请求，直接返回
  if (req.headers['user-agent']?.includes('kube-probe') || req.headers['x-health-check']) {
    return res.json({ status: 'ok' });
  }
  next();
});

// API 路由
app.use('/api', chatRoutes);

// 托管前端静态文件
const frontendPath = path.join(__dirname, '../../frontend/build');
console.log('前端静态文件路径:', frontendPath);
app.use(express.static(frontendPath));

// SPA 回退 - 所有非 API 路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
});
