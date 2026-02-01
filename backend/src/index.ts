import express from 'express';
import cors from 'cors';
import path from 'path';
import chatRoutes from './routes/chat';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API 路由
app.use('/api', chatRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 托管前端静态文件
const frontendPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendPath));

// SPA 回退 - 所有非 API 路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`访问地址: http://localhost:${PORT}`);
});
