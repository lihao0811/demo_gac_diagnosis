import React, { useState, useRef, useEffect } from 'react';
import { Send, Car, Wrench, ClipboardCheck, BookOpen } from 'lucide-react';
import { chatApi } from '../services/api';
import { Message, DiagnosisStage, DiagnosisTask, VehicleInfo, HistoricalCase } from '../types';
import { MessageList } from './MessageList';
import { TaskPanel } from './TaskPanel';
import { VehicleCard } from './VehicleCard';
import { HistoricalCasesPanel } from './HistoricalCasesPanel';
import { CaseDetailPanel } from './CaseDetailPanel';

const stageNames: Record<DiagnosisStage, string> = {
  perception: '故障感知',
  decomposition: '任务分解',
  execution: '任务执行',
  confirmation: '故障确认',
  guidance: '维修指导',
};

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [currentStage, setCurrentStage] = useState<DiagnosisStage>('perception');
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [tasks, setTasks] = useState<DiagnosisTask[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 右侧面板状态管理
  type RightPanelView = 'vehicle' | 'cases' | 'caseDetail';
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>('vehicle');
  const [selectedTask, setSelectedTask] = useState<DiagnosisTask | null>(null);
  const [selectedCase, setSelectedCase] = useState<HistoricalCase | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 提取车辆信息的辅助函数
  const extractVehicleInfo = (content: string): { vehicleInfo: VehicleInfo | null; cleanContent: string } => {
    // 移除可能的 markdown 代码块包裹
    let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // 尝试匹配完整的 vehicle JSON（支持嵌套结构）
    const vehicleRegex = /\{"type":"vehicle","data":\{[\s\S]*?\}\}/;
    const vehicleMatch = cleanContent.match(vehicleRegex);

    if (vehicleMatch) {
      try {
        // 找到完整的 JSON 对象（处理嵌套的大括号）
        let jsonStr = '';
        let braceCount = 0;
        let startIndex = vehicleMatch.index || 0;

        for (let i = startIndex; i < cleanContent.length; i++) {
          const char = cleanContent[i];
          jsonStr += char;
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (braceCount === 0 && jsonStr.length > 0) {
            break;
          }
        }

        const vehicleJson = JSON.parse(jsonStr);
        if (vehicleJson.type === 'vehicle' && vehicleJson.data) {
          return {
            vehicleInfo: vehicleJson.data,
            cleanContent: '已为您查询到车辆信息，请问需要诊断什么故障？'
          };
        }
      } catch (e) {
        console.error('Failed to parse vehicle info:', e);
      }
    }

    return { vehicleInfo: null, cleanContent: content };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      let streamedText = '';
      const response = await chatApi.sendMessage(
        userMessage.content,
        sessionId || undefined,
        currentStage,
        (chunk) => {
          streamedText += chunk;
          setStreamingContent(streamedText);
        }
      );

      setSessionId(response.sessionId);

      // 更新当前阶段
      if (response.stage !== currentStage) {
        setCurrentStage(response.stage);
      }

      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          if (toolCall.functionName === 'queryVehicleByVIN' || toolCall.functionName === 'queryVehicleByPlate') {
            setVehicleInfo(toolCall.result);
          }
        }
      }

      // 提取车辆信息 JSON
      const { vehicleInfo: extractedVehicle, cleanContent } = extractVehicleInfo(response.content);
      if (extractedVehicle) {
        setVehicleInfo(extractedVehicle);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: cleanContent,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (error) {
      console.error('发送消息失败:', error);

      // 提取友好的错误消息
      let friendlyMessage = '抱歉，我遇到了一些问题。请稍后再试。';
      if (error instanceof Error) {
        // 如果是我们自定义的错误消息，直接使用
        if (error.message.includes('AI服务暂时不可用') ||
            error.message.includes('请求超时') ||
            error.message.includes('无法连接')) {
          friendlyMessage = error.message;
        }
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: friendlyMessage,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTaskFeedback = async (feedbacks: any[]) => {
    if (isLoading) return;

    // 更新最后一条 AI 消息，添加用户的反馈到 JSON 中
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];

      if (lastMessage && lastMessage.role === 'assistant') {
        // 在 JSON 中添加 feedbacks 字段
        const updatedContent = lastMessage.content.replace(
          /"data":\[/,
          `"feedbacks":${JSON.stringify(feedbacks)},"data":[`
        );
        lastMessage.content = updatedContent;
      }

      return newMessages;
    });

    // 组装任务反馈消息
    let feedbackText = '我已完成排查，结果如下：\n\n';
    feedbacks.forEach((feedback, index) => {
      const statusText =
        feedback.status === 'normal' ? '✅ 正常' :
        feedback.status === 'abnormal' ? '❌ 异常' :
        '❓ 无法检查';

      feedbackText += `${index + 1}. ${statusText}`;
      if (feedback.note) {
        feedbackText += ` - ${feedback.note}`;
      }
      feedbackText += '\n';
    });

    const userMessage: Message = {
      role: 'user',
      content: feedbackText,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      let streamedText = '';
      const response = await chatApi.sendMessage(
        userMessage.content,
        sessionId || undefined,
        currentStage,
        (chunk) => {
          streamedText += chunk;
          setStreamingContent(streamedText);
        }
      );

      setSessionId(response.sessionId);

      // 更新当前阶段
      if (response.stage !== currentStage) {
        setCurrentStage(response.stage);
      }

      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          if (toolCall.functionName === 'queryVehicleByVIN' || toolCall.functionName === 'queryVehicleByPlate') {
            setVehicleInfo(toolCall.result);
          }
        }
      }

      // 提取车辆信息 JSON
      const { vehicleInfo: extractedVehicle, cleanContent } = extractVehicleInfo(response.content);
      if (extractedVehicle) {
        setVehicleInfo(extractedVehicle);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: cleanContent,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (error) {
      console.error('发送消息失败:', error);

      // 提取友好的错误消息
      let friendlyMessage = '抱歉，我遇到了一些问题。请稍后再试。';
      if (error instanceof Error) {
        // 如果是我们自定义的错误消息，直接使用
        if (error.message.includes('AI服务暂时不可用') ||
            error.message.includes('请求超时') ||
            error.message.includes('无法连接')) {
          friendlyMessage = error.message;
        }
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: friendlyMessage,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleQuestionAnswers = async (answers: any[]) => {
    if (isLoading) return;

    // 更新最后一条 AI 消息，添加用户的答案到 JSON 中
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];

      if (lastMessage && lastMessage.role === 'assistant') {
        // 在 JSON 中添加 answers 字段
        const updatedContent = lastMessage.content.replace(
          /"data":\[/,
          `"answers":${JSON.stringify(answers)},"data":[`
        );
        lastMessage.content = updatedContent;
      }

      return newMessages;
    });

    // 组装问题回答消息
    let answerText = '';
    answers.forEach((answer, index) => {
      answerText += `${answer.answer}`;
      if (index < answers.length - 1) answerText += '、';
    });

    const userMessage: Message = {
      role: 'user',
      content: answerText,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      let streamedText = '';
      const response = await chatApi.sendMessage(
        userMessage.content,
        sessionId || undefined,
        currentStage,
        (chunk) => {
          streamedText += chunk;
          setStreamingContent(streamedText);
        }
      );

      setSessionId(response.sessionId);

      // 更新当前阶段
      if (response.stage !== currentStage) {
        setCurrentStage(response.stage);
      }

      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          if (toolCall.functionName === 'queryVehicleByVIN' || toolCall.functionName === 'queryVehicleByPlate') {
            setVehicleInfo(toolCall.result);
          }
        }
      }

      // 提取车辆信息 JSON
      const { vehicleInfo: extractedVehicle, cleanContent } = extractVehicleInfo(response.content);
      if (extractedVehicle) {
        setVehicleInfo(extractedVehicle);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: cleanContent,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');
    } catch (error) {
      console.error('发送消息失败:', error);

      // 提取友好的错误消息
      let friendlyMessage = '抱歉，我遇到了一些问题。请稍后再试。';
      if (error instanceof Error) {
        // 如果是我们自定义的错误消息，直接使用
        if (error.message.includes('AI服务暂时不可用') ||
            error.message.includes('请求超时') ||
            error.message.includes('无法连接')) {
          friendlyMessage = error.message;
        }
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: friendlyMessage,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleAnalyzeFaults = async () => {
    if (!vehicleInfo || !vehicleInfo.faultCodes || vehicleInfo.faultCodes.length === 0) return;
    if (isLoading) return;

    // 构建故障码分析消息
    const faultCodesText = vehicleInfo.faultCodes
      .map(fault => `${fault.code}: ${fault.description}`)
      .join('、');

    const analysisMessage = `请帮我分析这些故障码：${faultCodesText}`;

    // 直接添加用户消息，显示为"正在分析故障中..."
    const userMessage: Message = {
      role: 'user',
      content: '正在分析故障中...',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      let streamedText = '';
      const response = await chatApi.sendMessage(
        analysisMessage, // 实际发送的是完整的故障码信息
        sessionId || undefined,
        currentStage,
        (chunk) => {
          streamedText += chunk;
          setStreamingContent(streamedText);
        }
      );

      setSessionId(response.sessionId);

      // 更新当前阶段
      if (response.stage !== currentStage) {
        setCurrentStage(response.stage);
      }

      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          if (toolCall.functionName === 'queryVehicleByVIN' || toolCall.functionName === 'queryVehicleByPlate') {
            setVehicleInfo(toolCall.result);
          }
        }
      }

      // 提取车辆信息 JSON
      const { vehicleInfo: extractedVehicle, cleanContent } = extractVehicleInfo(response.content);
      if (extractedVehicle) {
        setVehicleInfo(extractedVehicle);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: cleanContent,
      };

      // 替换最后一条用户消息，将"正在分析故障中..."改为"故障分析完成"
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (newMessages[lastIndex]?.content === '正在分析故障中...') {
          newMessages[lastIndex] = {
            role: 'user',
            content: '故障分析完成',
          };
        }
        return [...newMessages, assistantMessage];
      });
      setStreamingContent('');
    } catch (error) {
      console.error('发送消息失败:', error);

      // 提取友好的错误消息
      let friendlyMessage = '抱歉，我遇到了一些问题。请稍后再试。';
      if (error instanceof Error) {
        // 如果是我们自定义的错误消息，直接使用
        if (error.message.includes('AI服务暂时不可用') ||
            error.message.includes('请求超时') ||
            error.message.includes('无法连接')) {
          friendlyMessage = error.message;
        }
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: friendlyMessage,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  // 处理查看历史案例
  const handleViewCases = (task: DiagnosisTask) => {
    setSelectedTask(task);
    setRightPanelView('cases');
  };

  // 处理查看案例详情
  const handleSelectCase = (caseItem: HistoricalCase) => {
    setSelectedCase(caseItem);
    setRightPanelView('caseDetail');
  };

  // 返回到车辆信息
  const handleBackToVehicle = () => {
    setRightPanelView('vehicle');
    setSelectedTask(null);
    setSelectedCase(null);
  };

  // 返回到案例列表
  const handleBackToCases = () => {
    setRightPanelView('cases');
    setSelectedCase(null);
  };

  // 处理请求维修指导
  const handleRequestRepairGuide = async () => {
    if (isLoading) return;

    // 添加用户消息，显示为"正在加载维修指导..."
    const userMessage: Message = {
      role: 'user',
      content: '正在加载维修指导...',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      let streamedText = '';
      const response = await chatApi.sendMessage(
        '请为上述确认的故障提供详细的维修指导', // 实际发送的消息
        sessionId || undefined,
        currentStage,
        (chunk) => {
          streamedText += chunk;
          setStreamingContent(streamedText);
        }
      );

      setSessionId(response.sessionId);

      // 更新当前阶段
      if (response.stage !== currentStage) {
        setCurrentStage(response.stage);
      }

      // 提取车辆信息 JSON
      const { vehicleInfo: extractedVehicle, cleanContent } = extractVehicleInfo(response.content);
      if (extractedVehicle) {
        setVehicleInfo(extractedVehicle);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: cleanContent,
      };

      // 替换最后一条用户消息，将"正在加载维修指导..."改为"维修指导加载完成"
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (newMessages[lastIndex]?.content === '正在加载维修指导...') {
          newMessages[lastIndex] = {
            role: 'user',
            content: '维修指导加载完成',
          };
        }
        return [...newMessages, assistantMessage];
      });
      setStreamingContent('');
    } catch (error) {
      console.error('发送消息失败:', error);

      // 提取友好的错误消息
      let friendlyMessage = '抱歉，我遇到了一些问题。请稍后再试。';
      if (error instanceof Error) {
        if (error.message.includes('AI服务暂时不可用') ||
            error.message.includes('请求超时') ||
            error.message.includes('无法连接')) {
          friendlyMessage = error.message;
        }
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: friendlyMessage,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto bg-white shadow-xl">
        <header className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">广汽智能诊断助手</h1>
                <p className="text-sm text-primary-100">专业汽车故障诊断系统</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`px-3 py-1 rounded-full font-medium ${
                  currentStage === 'guidance'
                    ? 'bg-green-500 text-white'
                    : 'bg-white/20 text-white'
                }`}
              >
                {currentStage === 'guidance' ? '✓ 诊断完成' : stageNames[currentStage]}
              </span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Car className="w-10 h-10 text-primary-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    欢迎使用广汽智能诊断助手
                  </h2>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    我是您的智能维修助手，可以帮助您诊断车辆故障。请告诉我车辆的信息或描述故障现象。
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                    {[
                      'GS4冷车启动哒哒响，热车后消失',
                      '传祺GS8 2021款，发动机故障灯亮，怠速抖动，加速无力',
                      'VVT执行器卡滞怎么修？',
                      '粤A12345',
                      '刹车时有异响，吱吱声',
                      '空调不制冷，风扇正常转',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInputValue(suggestion);
                          inputRef.current?.focus();
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                streamingContent={streamingContent}
                isWaiting={isLoading && !streamingContent}
                onTaskFeedback={handleTaskFeedback}
                onQuestionAnswers={handleQuestionAnswers}
                onViewCases={handleViewCases}
                onRequestRepairGuide={handleRequestRepairGuide}
              />

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t bg-white p-4">
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入VIN码、车牌号或描述故障现象..."
                    className="w-full px-4 py-3 pr-12 bg-gray-100 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                提示：可以输入VIN码（如 LSVAG2180E2100001）或车牌号（如 粤A12345）查询车辆信息
              </p>
            </div>
          </div>

          <div className="w-80 bg-gray-50 border-l overflow-y-auto">
            {/* 根据 rightPanelView 状态显示不同的面板 */}
            {rightPanelView === 'vehicle' && (
              <>
                {vehicleInfo && (
                  <VehicleCard vehicle={vehicleInfo} onAnalyzeFaults={handleAnalyzeFaults} />
                )}

                {tasks.length > 0 && (
                  <TaskPanel
                    tasks={tasks}
                    onTaskUpdate={(updatedTasks) => {
                      setTasks(updatedTasks);
                      if (sessionId) {
                        chatApi.updateTasks(sessionId, updatedTasks);
                      }
                    }}
                  />
                )}

                {!vehicleInfo && tasks.length === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    <Car className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">车辆信息将显示在这里</p>
                  </div>
                )}
              </>
            )}

            {/* 历史案例列表面板 */}
            {rightPanelView === 'cases' && selectedTask && (
              <HistoricalCasesPanel
                cases={selectedTask.relatedCases || []}
                taskName={selectedTask.name}
                onBack={handleBackToVehicle}
                onSelectCase={handleSelectCase}
              />
            )}

            {/* 案例详情面板 */}
            {rightPanelView === 'caseDetail' && selectedCase && (
              <CaseDetailPanel
                caseItem={selectedCase}
                onBack={handleBackToCases}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
