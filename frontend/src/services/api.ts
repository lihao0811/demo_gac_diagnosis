import { ChatResponse, VehicleInfo, DiagnosisStage } from '../types';
import { getVehicleByVIN, getVehicleByPlate } from './vehicleService';

// 百炼 API 配置 - POC 项目直接写在前端
const API_KEY = 'sk-a1f23477f6bf4e5e8dd0a672cdc0888c';
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const MODEL = 'qwen-max';

// 生成唯一 session ID
function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 系统提示词
const SYSTEM_PROMPT = `你是一个专业的汽车故障诊断助手。你的任务是帮助技师诊断车辆故障。

当用户提供车牌号或VIN码时，请分析车辆信息和故障码，给出专业的诊断建议。

请用中文回复，保持专业但易懂的语言风格。`;

export const chatApi = {
  async sendMessage(
    message: string,
    sessionId?: string,
    stage?: DiagnosisStage,
    onStream?: (content: string) => void
  ): Promise<ChatResponse> {
    const currentSessionId = sessionId || generateSessionId();

    // 检测车牌号或VIN码，获取车辆信息
    let enhancedMessage = message;
    const vinRegex = /[A-HJ-NPR-Z0-9]{17}/i;
    const plateRegex = /[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{5,6}/;

    const vinMatch = message.match(vinRegex);
    const plateMatch = message.match(plateRegex);

    if (vinMatch) {
      const vehicle = getVehicleByVIN(vinMatch[0]);
      if (vehicle) {
        enhancedMessage = `用户查询VIN码：${vinMatch[0]}。车辆信息：${JSON.stringify(vehicle)}。请分析车辆状况和故障码。`;
      }
    } else if (plateMatch) {
      const vehicle = getVehicleByPlate(plateMatch[0]);
      if (vehicle) {
        enhancedMessage = `用户查询车牌号：${plateMatch[0]}。车辆信息：${JSON.stringify(vehicle)}。请分析车辆状况和故障码。`;
      }
    }

    // 调用百炼 API
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: enhancedMessage },
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              onStream?.(content);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    return {
      content: fullContent,
      sessionId: currentSessionId,
      stage: stage || 'perception',
    };
  },

  async getVehicleByVIN(vin: string): Promise<VehicleInfo | null> {
    return getVehicleByVIN(vin);
  },

  async getVehicleByPlate(plateNumber: string): Promise<VehicleInfo | null> {
    return getVehicleByPlate(plateNumber);
  },
};
