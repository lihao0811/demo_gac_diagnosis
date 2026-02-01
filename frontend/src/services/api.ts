import axios from 'axios';
import { ChatResponse, VehicleInfo, DiagnosisSession, DiagnosisStage, DiagnosisTask } from '../types';

// 生产环境使用相对路径，开发环境使用本地后端地址
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? ''
  : (process.env.REACT_APP_API_URL || 'http://localhost:3021');

export const chatApi = {
  async sendMessage(
    message: string,
    sessionId?: string,
    stage?: DiagnosisStage,
    onStream?: (content: string) => void
  ): Promise<ChatResponse> {
    if (onStream) {
      return this.sendStreamMessage(message, sessionId, stage, onStream);
    }

    const response = await axios.post(`${API_BASE_URL}/api/chat-with-tools`, {
      message,
      sessionId,
      stage,
    });

    return response.data;
  },

  async sendStreamMessage(
    message: string,
    sessionId?: string,
    stage?: DiagnosisStage,
    onStream?: (content: string) => void
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId,
        stage,
      }),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let finalSessionId = sessionId || '';
    let finalStage: DiagnosisStage = stage || 'perception';
    let errorMessage = '';
    let enrichedTasksJson = '';

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              onStream?.(parsed.content);
            }
            if (parsed.enrichedTasks) {
              // 接收enriched的任务JSON
              enrichedTasksJson = parsed.enrichedTasks;
            }
            if (parsed.done) {
              finalSessionId = parsed.sessionId || finalSessionId;
              finalStage = parsed.stage || finalStage;
              // 检查是否有错误消息
              if (parsed.error) {
                errorMessage = parsed.error;
              }
            }
          } catch {
          }
        }
      }
    }

    // 如果有enriched的任务JSON，替换fullContent中的原始JSON
    if (enrichedTasksJson) {
      const startIdx = fullContent.indexOf('{"type":"tasks"');
      if (startIdx !== -1) {
        let braceCount = 0;
        let endIdx = startIdx;
        let inString = false;
        let escape = false;

        for (let i = startIdx; i < fullContent.length; i++) {
          const char = fullContent[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (char === '\\' && inString) {
            escape = true;
            continue;
          }
          if (char === '"' && !escape) {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (braceCount === 0 && i > startIdx) {
              endIdx = i + 1;
              break;
            }
          }
        }

        // 替换原始JSON为enriched JSON
        fullContent = fullContent.substring(0, startIdx) + enrichedTasksJson + fullContent.substring(endIdx);
      }
    }

    // 如果有错误消息，抛出错误
    if (errorMessage) {
      throw new Error(errorMessage);
    }

    return {
      content: fullContent,
      sessionId: finalSessionId,
      stage: finalStage,
    };
  },

  async getVehicleByVIN(vin: string): Promise<VehicleInfo | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/vehicle/${vin}`);
      return response.data.data;
    } catch {
      return null;
    }
  },

  async getVehicleByPlate(plateNumber: string): Promise<VehicleInfo | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/vehicle/plate/${plateNumber}`);
      return response.data.data;
    } catch {
      return null;
    }
  },

  async getSession(sessionId: string): Promise<DiagnosisSession | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/session/${sessionId}`);
      return response.data.data;
    } catch {
      return null;
    }
  },

  async updateStage(sessionId: string, stage: DiagnosisStage): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/session/${sessionId}/stage`, { stage });
  },

  async updateTasks(sessionId: string, tasks: DiagnosisTask[]): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/session/${sessionId}/tasks`, { tasks });
  },

  async confirmFaults(sessionId: string, faults: string[]): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/session/${sessionId}/confirm-faults`, { faults });
  },
};
