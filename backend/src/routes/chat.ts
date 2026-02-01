import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BailianService } from '../services/bailianService';
import { SessionService } from '../services/sessionService';
import { VehicleService } from '../services/vehicleService';
import { PromptService } from '../services/promptService';
import { enrichTasksWithCases } from '../services/historicalCaseService';
import { Message, ChatMessageRequest } from '../types';

const router = Router();
const bailianService = new BailianService();
const sessionService = new SessionService();
const vehicleService = new VehicleService();
const promptService = new PromptService();

router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, stage }: ChatMessageRequest = req.body;

    let session = sessionId ? sessionService.getSession(sessionId) : null;
    if (!session) {
      session = sessionService.createSession();
    }

    if (stage) {
      sessionService.setStage(session.id, stage);
    }

    // 检测是否是车牌号或VIN码查询
    const vinRegex = /[A-HJ-NPR-Z0-9]{17}/i;
    const plateRegex = /[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{5,6}/;

    let vehicleInfo = null;
    let enhancedMessage = message;

    const vinMatch = message.match(vinRegex);
    const plateMatch = message.match(plateRegex);

    if (vinMatch) {
      vehicleInfo = await vehicleService.getVehicleByVIN(vinMatch[0]);
      if (vehicleInfo) {
        sessionService.setVehicleInfo(session.id, vehicleInfo);
        enhancedMessage = `用户查询VIN码：${vinMatch[0]}。车辆信息如下：${JSON.stringify(vehicleInfo)}。请按照vehicle JSON格式输出车辆信息。`;
      }
    } else if (plateMatch) {
      vehicleInfo = await vehicleService.getVehicleByPlate(plateMatch[0]);
      if (vehicleInfo) {
        sessionService.setVehicleInfo(session.id, vehicleInfo);
        enhancedMessage = `用户查询车牌号：${plateMatch[0]}。车辆信息如下：${JSON.stringify(vehicleInfo)}。请按照vehicle JSON格式输出车辆信息。`;
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: enhancedMessage,
    };
    sessionService.addMessage(session.id, userMessage);

    const currentStage = session.currentStage;
    const systemPrompt = promptService.getSystemPrompt(currentStage);

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...session.messages.slice(-10),
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullResponse = '';

    try {
      const stream = bailianService.streamChat(messages);

      for await (const chunk of stream) {
        // OpenAI 兼容接口格式: choices[0].delta.content
        const content = chunk.choices?.[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content, type: 'text' })}\n\n`);
          // 立即刷新缓冲区
          if ((res as any).flush) (res as any).flush();
        }
      }

      // 如果响应包含任务JSON，为任务添加历史案例数据
      let enrichedResponse = fullResponse;
      if (fullResponse.includes('"type":"tasks"')) {
        console.log('检测到任务JSON，开始添加历史案例...');
        try {
          // 提取JSON部分 - 使用更精确的方法来匹配完整的JSON对象
          const startIdx = fullResponse.indexOf('{"type":"tasks"');
          if (startIdx !== -1) {
            let braceCount = 0;
            let endIdx = startIdx;
            let inString = false;
            let escape = false;

            for (let i = startIdx; i < fullResponse.length; i++) {
              const char = fullResponse[i];

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

            const jsonStr = fullResponse.substring(startIdx, endIdx);
            const tasksJson = JSON.parse(jsonStr);
            console.log('原始任务数据:', JSON.stringify(tasksJson.data, null, 2));

            // 为任务添加历史案例
            const enrichedTasks = enrichTasksWithCases(tasksJson.data);
            console.log('添加历史案例后的任务数据:', JSON.stringify(enrichedTasks, null, 2));

            // 按历史案例数量排序（案例多的排前面）
            enrichedTasks.sort((a, b) => (b.relatedCases?.length || 0) - (a.relatedCases?.length || 0));
            console.log('排序后的任务:', enrichedTasks.map(t => ({ name: t.name, casesCount: t.relatedCases?.length || 0 })));

            // 替换原JSON
            const enrichedJson = JSON.stringify({
              type: 'tasks',
              data: enrichedTasks
            });
            enrichedResponse = fullResponse.substring(0, startIdx) + enrichedJson + fullResponse.substring(endIdx);
          }
        } catch (e) {
          console.error('Failed to enrich tasks with cases:', e);
        }
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: enrichedResponse,
      };
      sessionService.addMessage(session.id, assistantMessage);

      // 根据 AI 回复内容智能判断并更新 stage
      let updatedStage = currentStage;
      if (enrichedResponse.includes('"type":"questions"')) {
        updatedStage = 'perception'; // 收集信息阶段
      } else if (enrichedResponse.includes('"type":"tasks"')) {
        updatedStage = 'decomposition'; // 任务分解阶段
      } else if (enrichedResponse.includes('"type":"faults"')) {
        updatedStage = 'confirmation'; // 故障确认阶段
      } else if (enrichedResponse.includes('"type":"repair"')) {
        updatedStage = 'guidance'; // 维修指导阶段
      }

      // 更新 session 的 stage
      if (updatedStage !== currentStage) {
        sessionService.setStage(session.id, updatedStage);
      }

      // 如果有enriched的任务数据，发送一个特殊的enriched消息
      if (enrichedResponse !== fullResponse && fullResponse.includes('"type":"tasks"')) {
        // 提取enriched的JSON部分
        const startIdx = enrichedResponse.indexOf('{"type":"tasks"');
        if (startIdx !== -1) {
          let braceCount = 0;
          let endIdx = startIdx;
          let inString = false;
          let escape = false;

          for (let i = startIdx; i < enrichedResponse.length; i++) {
            const char = enrichedResponse[i];
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

          const enrichedJson = enrichedResponse.substring(startIdx, endIdx);
          // 发送enriched的JSON作为特殊消息
          res.write(`data: ${JSON.stringify({ enrichedTasks: enrichedJson, type: 'enriched' })}\n\n`);
          if ((res as any).flush) (res as any).flush();
        }
      }

      res.write(`data: ${JSON.stringify({ done: true, sessionId: session.id, stage: updatedStage })}\n\n`);
      res.end();
    } catch (streamError) {
      console.error('Stream error:', streamError);
      console.error('Stream error message:', (streamError as Error).message);
      console.error('Stream error stack:', (streamError as Error).stack);

      // 提取友好的错误消息
      let errorMessage = '抱歉，AI服务暂时不可用，请稍后再试。';
      if (streamError instanceof Error) {
        if (streamError.message.includes('AI服务暂时不可用')) {
          errorMessage = streamError.message.split('\n')[0]; // 只取第一行友好消息
        } else if (streamError.message.includes('timeout')) {
          errorMessage = '请求超时，请检查网络连接后重试。';
        } else if (streamError.message.includes('ECONNREFUSED')) {
          errorMessage = '无法连接到AI服务，请稍后再试。';
        }
      }

      res.write(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/chat-with-tools', async (req, res) => {
  try {
    const { message, sessionId, stage }: ChatMessageRequest = req.body;

    let session = sessionId ? sessionService.getSession(sessionId) : null;
    if (!session) {
      session = sessionService.createSession();
    }

    if (stage) {
      sessionService.setStage(session.id, stage);
    }

    const userMessage: Message = {
      role: 'user',
      content: message,
    };
    sessionService.addMessage(session.id, userMessage);

    const currentStage = session.currentStage;
    const systemPrompt = promptService.getSystemPrompt(currentStage);
    const tools = currentStage === 'perception'
      ? promptService.getPerceptionTools()
      : currentStage === 'execution'
        ? promptService.getExecutionTools()
        : [];

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...session.messages.slice(-10),
    ];

    const { content, toolCalls } = await bailianService.chatWithTools(messages, tools);

    if (toolCalls && toolCalls.length > 0) {
      const toolResults = await executeToolCalls(toolCalls, session);

      messages.push({
        role: 'assistant',
        content: '',
        tool_calls: toolCalls,
      });

      for (const result of toolResults) {
        messages.push({
          role: 'tool',
          content: JSON.stringify(result.result),
          tool_call_id: result.toolCallId,
        });
      }

      const finalResponse = await bailianService.chat(messages);

      sessionService.addMessage(session.id, {
        role: 'assistant',
        content: finalResponse,
      });

      res.json({
        content: finalResponse,
        sessionId: session.id,
        stage: currentStage,
        toolCalls: toolResults,
      });
    } else {
      sessionService.addMessage(session.id, {
        role: 'assistant',
        content,
      });

      res.json({
        content,
        sessionId: session.id,
        stage: currentStage,
      });
    }
  } catch (error) {
    console.error('Chat with tools error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

async function executeToolCalls(toolCalls: any[], session: any): Promise<any[]> {
  const results = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);

    let result = null;

    switch (functionName) {
      case 'queryVehicleByVIN':
        result = await vehicleService.getVehicleByVIN(args.vin);
        if (result) {
          sessionService.setVehicleInfo(session.id, result);
        }
        break;
      case 'queryVehicleByPlate':
        result = await vehicleService.getVehicleByPlate(args.plateNumber);
        if (result) {
          sessionService.setVehicleInfo(session.id, result);
        }
        break;
      case 'getCommonFaults':
        result = await vehicleService.getCommonFaults({ brand: args.brand } as any);
        break;
      default:
        result = { error: '未知工具' };
    }

    results.push({
      toolCallId: toolCall.id,
      functionName,
      result,
    });
  }

  return results;
}

router.get('/vehicle/:vin', async (req, res) => {
  try {
    const { vin } = req.params;
    const vehicle = await vehicleService.getVehicleByVIN(vin);

    if (vehicle) {
      res.json({ success: true, data: vehicle });
    } else {
      res.status(404).json({ success: false, error: '未找到车辆信息' });
    }
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ success: false, error: '查询车辆信息失败' });
  }
});

router.get('/vehicle/plate/:plateNumber', async (req, res) => {
  try {
    const { plateNumber } = req.params;
    const vehicle = await vehicleService.getVehicleByPlate(plateNumber);

    if (vehicle) {
      res.json({ success: true, data: vehicle });
    } else {
      res.status(404).json({ success: false, error: '未找到车辆信息' });
    }
  } catch (error) {
    console.error('Get vehicle by plate error:', error);
    res.status(500).json({ success: false, error: '查询车辆信息失败' });
  }
});

router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionService.getSession(sessionId);

  if (session) {
    res.json({ success: true, data: session });
  } else {
    res.status(404).json({ success: false, error: '会话不存在' });
  }
});

router.post('/session/:sessionId/stage', (req, res) => {
  const { sessionId } = req.params;
  const { stage } = req.body;

  const session = sessionService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: '会话不存在' });
  }

  sessionService.setStage(sessionId, stage);
  res.json({ success: true, message: '阶段已更新', stage });
});

router.post('/session/:sessionId/tasks', (req, res) => {
  const { sessionId } = req.params;
  const { tasks } = req.body;

  const session = sessionService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: '会话不存在' });
  }

  sessionService.setTasks(sessionId, tasks);
  res.json({ success: true, message: '任务已更新', tasks });
});

router.post('/session/:sessionId/confirm-faults', (req, res) => {
  const { sessionId } = req.params;
  const { faults } = req.body;

  const session = sessionService.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: '会话不存在' });
  }

  for (const fault of faults) {
    sessionService.addConfirmedFault(sessionId, fault);
  }

  res.json({ success: true, message: '故障已确认', faults });
});

export default router;
