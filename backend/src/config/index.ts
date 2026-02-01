import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  bailianApiKey: process.env.BAILIAN_API_KEY || 'sk-a1f23477f6bf4e5e8dd0a672cdc0888c',
  bailianModel: process.env.BAILIAN_MODEL || 'qwen3-max',
  // 使用 OpenAI 兼容接口
  bailianBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  environment: process.env.NODE_ENV || 'development',
};
