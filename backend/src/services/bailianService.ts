import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { Message, Tool } from '../types';

export class BailianService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1秒

  constructor() {
    this.apiKey = config.bailianApiKey;
    // 使用 OpenAI 兼容接口
    this.baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.model = 'qwen3-max';
  }

  /**
   * 判断错误是否可以重试
   */
  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      // 网络错误
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        return true;
      }
      // 5xx 服务器错误
      if (error.response && error.response.status >= 500) {
        return true;
      }
      // 429 限流错误
      if (error.response && error.response.status === 429) {
        return true;
      }
    }
    return false;
  }

  /**
   * 延迟函数
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取友好的错误消息
   */
  private getFriendlyErrorMessage(error: any, retryCount: number): string {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        return `网络连接不稳定，正在重试 (${retryCount}/${this.maxRetries})...`;
      }
      if (error.response?.status === 429) {
        return `请求过于频繁，正在重试 (${retryCount}/${this.maxRetries})...`;
      }
      if (error.response?.status && error.response.status >= 500) {
        return `服务暂时不可用，正在重试 (${retryCount}/${this.maxRetries})...`;
      }
    }
    return `请求失败，正在重试 (${retryCount}/${this.maxRetries})...`;
  }

  async chat(messages: Message[], tools?: Tool[]): Promise<string> {
    const request: any = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
    };

    if (tools && tools.length > 0) {
      request.tools = tools;
      request.tool_choice = 'auto';
    }

    let lastError: any = null;

    // 重试逻辑
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          request,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30秒超时
          }
        );

        return response.data.choices?.[0]?.message?.content || '';

      } catch (error) {
        lastError = error;
        console.error(`Chat attempt ${attempt} failed:`, error);

        // 判断是否可以重试
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          const errorMsg = this.getFriendlyErrorMessage(error, attempt);
          console.log(errorMsg);

          // 等待后重试，使用指数退避
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        // 不可重试或已达到最大重试次数
        break;
      }
    }

    // 所有重试都失败了，抛出友好的错误消息
    throw new Error(
      `AI服务暂时不可用，请稍后再试。已尝试 ${this.maxRetries} 次连接。` +
      (lastError?.message ? `\n错误详情: ${lastError.message}` : '')
    );
  }

  async *streamChat(messages: Message[], tools?: Tool[]): AsyncGenerator<any> {
    const request: any = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      temperature: 0.7,
    };

    if (tools && tools.length > 0) {
      request.tools = tools;
      request.tool_choice = 'auto';
    }

    let lastError: any = null;

    // 重试逻辑
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          request,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            responseType: 'stream',
            timeout: 30000, // 30秒超时
          }
        );

        const stream = response.data;
        let buffer = '';

        for await (const chunk of stream) {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') {
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                yield parsed;
              } catch {
              }
            }
          }
        }

        // 成功完成，退出重试循环
        return;

      } catch (error) {
        lastError = error;
        console.error(`Stream attempt ${attempt} failed:`, error);

        // 判断是否可以重试
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          const errorMsg = this.getFriendlyErrorMessage(error, attempt);
          console.log(errorMsg);

          // 等待后重试，使用指数退避
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        // 不可重试或已达到最大重试次数，抛出错误
        break;
      }
    }

    // 所有重试都失败了，抛出友好的错误消息
    throw new Error(
      `AI服务暂时不可用，请稍后再试。已尝试 ${this.maxRetries} 次连接。` +
      (lastError?.message ? `\n错误详情: ${lastError.message}` : '')
    );
  }

  async chatWithTools(messages: Message[], tools: Tool[]): Promise<{ content: string; toolCalls?: any[] }> {
    const request = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id,
      })),
      tools: tools,
      tool_choice: 'auto',
      temperature: 0.7,
    };

    let lastError: any = null;

    // 重试逻辑
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          request,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30秒超时
          }
        );

        const choice = response.data.choices?.[0];
        const message = choice?.message;

        return {
          content: message?.content || '',
          toolCalls: message?.tool_calls,
        };

      } catch (error) {
        lastError = error;
        console.error(`ChatWithTools attempt ${attempt} failed:`, error);

        // 判断是否可以重试
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          const errorMsg = this.getFriendlyErrorMessage(error, attempt);
          console.log(errorMsg);

          // 等待后重试，使用指数退避
          await this.delay(this.retryDelay * attempt);
          continue;
        }

        // 不可重试或已达到最大重试次数
        break;
      }
    }

    // 所有重试都失败了，抛出友好的错误消息
    throw new Error(
      `AI服务暂时不可用，请稍后再试。已尝试 ${this.maxRetries} 次连接。` +
      (lastError?.message ? `\n错误详情: ${lastError.message}` : '')
    );
  }
}
