import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Circle, AlertTriangle } from 'lucide-react';
import { Message } from '../types';
import { InteractiveTaskList } from './InteractiveTaskList';
import { InteractiveQuestions } from './InteractiveQuestions';
import { LoadingText } from './LoadingText';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  isWaiting?: boolean; // 等待首token
  onTaskFeedback?: (feedback: any[]) => void; // 任务反馈回调
  onQuestionAnswers?: (answers: any[]) => void; // 问题回答回调
  onViewCases?: (task: any) => void; // 查看历史案例回调
  onRequestRepairGuide?: () => void; // 请求维修指导回调
}

// 解析消息内容，分离JSON和普通文本
const parseMessageContent = (content: string) => {
  // 尝试匹配完整的JSON对象
  const jsonRegex = /\{"type":\s*"(tasks|faults|repair|questions|vehicle)"[\s\S]*?\}\s*\n/g;
  let match;
  let lastJson = null;
  let jsonStart = -1;
  let jsonEnd = -1;

  // 查找最后一个完整的JSON
  while ((match = jsonRegex.exec(content)) !== null) {
    try {
      // 尝试找到完整的JSON（包括嵌套的数组和对象）
      const startIdx = match.index;
      let braceCount = 0;
      let inString = false;
      let escape = false;

      for (let i = startIdx; i < content.length; i++) {
        const char = content[i];

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

          if (braceCount === 0) {
            const jsonStr = content.substring(startIdx, i + 1);
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type && parsed.data) {
                lastJson = parsed;
                jsonStart = startIdx;
                jsonEnd = i + 1;
              }
            } catch {}
            break;
          }
        }
      }
    } catch {}
  }

  if (lastJson && jsonStart >= 0) {
    const textBefore = content.substring(0, jsonStart).trim();
    const textAfter = content.substring(jsonEnd).trim();
    return { text: textBefore || textAfter, json: lastJson };
  }

  // 如果没有找到完整的 JSON，但内容中包含 JSON 开头，过滤掉不完整的 JSON
  const incompleteJsonMatch = content.match(/\{"type":/);
  if (incompleteJsonMatch) {
    const jsonStartIdx = incompleteJsonMatch.index!;
    const textBeforeJson = content.substring(0, jsonStartIdx).trim();
    return { text: textBeforeJson, json: null };
  }

  return { text: content, json: null };
};

// 解析流式JSON，提取已完成的任务项
const parseStreamingTasks = (content: string): any[] => {
  const tasks: any[] = [];

  // 匹配 {"id":"1","name":"xxx","desc":"xxx"}
  const taskRegex = /\{"id":"(\d+)","name":"([^"]+)","desc":"([^"]+)"\}/g;
  let match;

  while ((match = taskRegex.exec(content)) !== null) {
    tasks.push({
      id: match[1],
      name: match[2],
      desc: match[3]
    });
  }

  return tasks;
};

// 解析流式JSON，提取已完成的问题项
const parseStreamingQuestions = (content: string): any[] => {
  const questions: any[] = [];

  // 匹配 {"id":"1","question":"xxx","options":["a","b","c"]}
  const questionRegex = /\{"id":"(\d+)","question":"([^"]+)","options":\[([^\]]+)\]\}/g;
  let match;

  while ((match = questionRegex.exec(content)) !== null) {
    try {
      const optionsStr = match[3];
      const options = optionsStr.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
      questions.push({
        id: match[1],
        question: match[2],
        options: options
      });
    } catch (e) {
      // 解析失败，跳过
    }
  }

  return questions;
};

// 解析流式维修指导JSON，提取已完成的部分（支持多个维修指导）
const parseStreamingRepair = (content: string): any => {
  // 检查是否是数组格式 "data":[{...},{...}]
  const isArrayFormat = content.includes('"data":[');

  if (isArrayFormat) {
    // 解析数组格式的多个维修指导
    const repairs: any[] = [];

    // 尝试匹配每个完整的维修指导对象
    const repairRegex = /\{"fault":"([^"]+)","solution":"([^"]+)"(?:,"steps":\[([^\]]*)\])?(?:,"time":"([^"]*)")?(?:,"difficulty":"([^"]*)")?\}/g;
    let match;

    while ((match = repairRegex.exec(content)) !== null) {
      const repair: any = {
        fault: match[1],
        solution: match[2],
      };

      // 解析steps
      if (match[3]) {
        const steps: string[] = [];
        const stepRegex = /"([^"]+)"/g;
        let stepMatch;
        while ((stepMatch = stepRegex.exec(match[3])) !== null) {
          steps.push(stepMatch[1]);
        }
        if (steps.length > 0) {
          repair.steps = steps;
        }
      }

      if (match[4]) repair.time = match[4];
      if (match[5]) repair.difficulty = match[5];

      repairs.push(repair);
    }

    return repairs.length > 0 ? repairs : null;
  } else {
    // 单个维修指导格式
    const repair: any = {};

    const faultMatch = content.match(/"fault"\s*:\s*"([^"]+)"/);
    if (faultMatch) {
      repair.fault = faultMatch[1];
    }

    const solutionMatch = content.match(/"solution"\s*:\s*"([^"]+)"/);
    if (solutionMatch) {
      repair.solution = solutionMatch[1];
    }

    const stepsMatch = content.match(/"steps"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
    if (stepsMatch) {
      const stepsContent = stepsMatch[1];
      const steps: string[] = [];
      const stepRegex = /"([^"]+)"/g;
      let stepMatch;

      while ((stepMatch = stepRegex.exec(stepsContent)) !== null) {
        steps.push(stepMatch[1]);
      }

      if (steps.length > 0) {
        repair.steps = steps;
      }
    }

    const timeMatch = content.match(/"time"\s*:\s*"([^"]+)"/);
    if (timeMatch) {
      repair.time = timeMatch[1];
    }

    const difficultyMatch = content.match(/"difficulty"\s*:\s*"([^"]+)"/);
    if (difficultyMatch) {
      repair.difficulty = difficultyMatch[1];
    }

    return Object.keys(repair).length > 0 ? repair : null;
  }
};

// 任务列表组件（只读版本，用于已完成的任务）
const TaskList: React.FC<{ tasks: any[]; feedbacks?: any[] }> = ({ tasks, feedbacks }) => {
  // 创建反馈映射
  const feedbackMap = new Map(feedbacks?.map(f => [f.taskId, f]) || []);

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-medium text-gray-500 mb-2">排查任务：</div>
      {tasks.map((task, idx) => {
        const feedback = feedbackMap.get(task.id);

        return (
          <div key={task.id || idx} className="p-3 bg-blue-50 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <Circle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-800">{task.name}</div>
                <div className="text-xs text-gray-500">{task.desc}</div>
              </div>
            </div>

            {/* 显示用户的反馈状态 */}
            {feedback && (
              <div className="ml-6 flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    feedback.status === 'normal'
                      ? 'bg-green-500 text-white'
                      : feedback.status === 'abnormal'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}
                >
                  {feedback.status === 'normal' ? '✅ 正常' : feedback.status === 'abnormal' ? '❌ 异常' : '❓ 无法检查'}
                </span>
                {feedback.note && <span className="text-xs text-gray-600">{feedback.note}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// 问题列表组件（只读版本，用于已回答的问题）
const QuestionList: React.FC<{ questions: any[]; answers?: any[] }> = ({ questions, answers }) => {
  // 创建答案映射
  const answerMap = new Map(answers?.map(a => [a.questionId, a.answer]) || []);

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs font-medium text-gray-500 mb-2">已回答的问题：</div>
      {questions.map((question, idx) => {
        const selectedAnswer = answerMap.get(question.id);

        return (
          <div key={question.id || idx} className="p-3 bg-purple-50 rounded-lg">
            <div className="font-medium text-sm text-gray-800 mb-2">{question.question}</div>
            <div className="flex flex-wrap gap-2">
              {question.options.map((opt: string) => (
                <span
                  key={opt}
                  className={`px-3 py-1 rounded-lg text-xs ${
                    selectedAnswer === opt
                      ? 'bg-purple-500 text-white font-medium'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {opt}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 故障列表组件
const FaultList: React.FC<{ faults: any[]; isLatestMessage?: boolean; onRequestRepairGuide?: () => void }> = ({ faults, isLatestMessage, onRequestRepairGuide }) => (
  <div className="mt-3 space-y-2">
    <div className="text-xs font-medium text-gray-500 mb-2">确认的故障：</div>
    {faults.map((fault, idx) => (
      <div key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <div className="font-medium text-sm text-gray-800">{fault.name}</div>
          <div className="text-xs text-gray-500">置信度: {fault.confidence} | {fault.evidence}</div>
        </div>
      </div>
    ))}
    {isLatestMessage && onRequestRepairGuide && (
      <button
        onClick={onRequestRepairGuide}
        className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-medium text-sm shadow-md"
      >
        展示维修指导
      </button>
    )}
  </div>
);

// 维修方案组件 - 支持单个或多个维修指导
const RepairPlan: React.FC<{ repair: any }> = ({ repair }) => {
  // 判断是单个对象还是数组
  const repairs = Array.isArray(repair) ? repair : [repair];

  return (
    <div className="mt-3 space-y-3">
      {repairs.map((item: any, index: number) => (
        <div key={index} className="p-3 bg-green-50 rounded-lg">
          <div className="font-medium text-sm text-green-800 mb-2">维修方案：{item.fault}</div>
          <div className="text-sm text-gray-700 mb-2">{item.solution}</div>
          {item.steps && (
            <div className="mb-2">
              <div className="text-xs font-medium text-gray-500">步骤：</div>
              <ol className="list-decimal list-inside text-xs text-gray-600">
                {item.steps.map((step: string, idx: number) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {item.time && <span className="px-2 py-1 bg-white rounded">⏱ {item.time}</span>}
            {item.difficulty && <span className="px-2 py-1 bg-white rounded">难度: {item.difficulty}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

// 渲染消息内容
const MessageContent: React.FC<{
  content: string;
  isLatestMessage?: boolean;
  onTaskFeedback?: (feedback: any[]) => void;
  onQuestionAnswers?: (answers: any[]) => void;
  onViewCases?: (task: any) => void;
  onRequestRepairGuide?: () => void;
}> = ({ content, isLatestMessage, onTaskFeedback, onQuestionAnswers, onViewCases, onRequestRepairGuide }) => {
  const { text, json } = parseMessageContent(content);

  // 如果内容为空或只有空白，显示加载动画
  if (!content || !content.trim()) {
    return (
      <div className="flex items-center gap-2">
        <LoadingText text="正在加载中..." />
      </div>
    );
  }

  return (
    <div>
      {text && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      )}
      {/* 交互式问题卡片 */}
      {json?.type === 'questions' && isLatestMessage && onQuestionAnswers ? (
        <InteractiveQuestions questions={json.data} onSubmitAnswers={onQuestionAnswers} />
      ) : json?.type === 'questions' ? (
        <QuestionList questions={json.data} answers={json.answers} />
      ) : null}
      {/* 如果是最新消息且有任务，显示交互式任务列表 */}
      {json?.type === 'tasks' && isLatestMessage && onTaskFeedback ? (
        <InteractiveTaskList tasks={json.data} onSubmitFeedback={onTaskFeedback} onViewCases={onViewCases} />
      ) : json?.type === 'tasks' ? (
        <TaskList tasks={json.data} feedbacks={json.feedbacks} />
      ) : null}
      {json?.type === 'faults' && <FaultList faults={json.data} isLatestMessage={isLatestMessage} onRequestRepairGuide={onRequestRepairGuide} />}
      {json?.type === 'repair' && <RepairPlan repair={json.data} />}
    </div>
  );
};

// 流式内容渲染（带光标和实时JSON检测）
const StreamingContent: React.FC<{ content: string; isStreaming: boolean }> = ({ content, isStreaming }) => {
  const { text, json } = parseMessageContent(content);

  // 检测是否正在输出JSON（以 { 开头但还没解析成功）
  const isTypingJson = !json && content.includes('{"type":');

  // 检测是否正在输出 vehicle JSON
  const isTypingVehicleJson = isTypingJson && content.includes('"type":"vehicle"');

  // 如果正在输出 vehicle JSON，显示加载提示
  if (isTypingVehicleJson) {
    return (
      <div className="flex items-center gap-2">
        <LoadingText text="正在查询车辆信息..." />
      </div>
    );
  }

  // 如果正在输出JSON，尝试提取已完成的任务项或问题项或维修指导
  const streamingTasks = isTypingJson && content.includes('"name"') ? parseStreamingTasks(content) : [];
  const streamingQuestions = isTypingJson && content.includes('"question"') ? parseStreamingQuestions(content) : [];
  const streamingRepair = isTypingJson && content.includes('"type":"repair"') ? parseStreamingRepair(content) : null;

  return (
    <div>
      {/* 普通文本部分 - 始终显示 */}
      {text && (
        <div className="prose prose-sm max-w-none inline">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      )}

      {/* JSON正在输入时，显示已解析的问题 */}
      {isTypingJson && streamingQuestions.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-gray-500 mb-2">请选择以下信息：</div>
          {streamingQuestions.map((question, idx) => (
            <div key={question.id || idx} className="p-3 bg-purple-50 rounded-lg animate-fadeIn">
              <div className="font-medium text-sm text-gray-800 mb-2">{question.question}</div>
              <div className="flex flex-wrap gap-2">
                {question.options.map((opt: string) => (
                  <span key={opt} className="px-3 py-1 bg-white text-gray-600 rounded-lg text-xs border border-gray-200">
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 text-gray-400 text-xs pl-2">
            <div className="animate-spin w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full" />
            <span>正在生成更多问题...</span>
          </div>
        </div>
      )}

      {/* JSON正在输入时，显示已解析的任务 */}
      {isTypingJson && streamingTasks.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-gray-500 mb-2">排查任务：</div>
          {streamingTasks.map((task, idx) => (
            <div key={task.id || idx} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg animate-fadeIn">
              <Circle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-sm text-gray-800">{task.name}</div>
                <div className="text-xs text-gray-500">{task.desc}</div>
              </div>
            </div>
          ))}
          {/* 正在输入下一个任务的提示 */}
          <div className="flex items-center gap-2 text-gray-400 text-xs pl-2">
            <div className="animate-spin w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full" />
            <span>正在生成更多任务...</span>
          </div>
        </div>
      )}

      {/* JSON正在输入时，显示已解析的维修指导（流式渲染，支持多个） */}
      {isTypingJson && streamingRepair && (
        <div className="mt-3 space-y-3">
          {(Array.isArray(streamingRepair) ? streamingRepair : [streamingRepair]).map((item: any, index: number) => (
            <div key={index} className="p-3 bg-green-50 rounded-lg animate-fadeIn">
              {item.fault && (
                <div className="font-medium text-sm text-green-800 mb-2">
                  维修方案：{item.fault}
                </div>
              )}
              {item.solution && (
                <div className="text-sm text-gray-700 mb-2">{item.solution}</div>
              )}
              {item.steps && item.steps.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-500">步骤：</div>
                  <ol className="list-decimal list-inside text-xs text-gray-600">
                    {item.steps.map((step: string, idx: number) => (
                      <li key={idx} className="animate-fadeIn">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {item.time && <span className="px-2 py-1 bg-white rounded">⏱ {item.time}</span>}
                {item.difficulty && <span className="px-2 py-1 bg-white rounded">难度: {item.difficulty}</span>}
              </div>
            </div>
          ))}
          {/* 正在生成的提示 */}
          <div className="flex items-center gap-2 text-gray-400 text-xs pl-2">
            <div className="animate-spin w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full" />
            <span>正在生成维修指导...</span>
          </div>
        </div>
      )}

      {/* 已解析的完整JSON渲染成卡片 */}
      {json?.type === 'tasks' && <TaskList tasks={json.data} />}
      {json?.type === 'faults' && <FaultList faults={json.data} isLatestMessage={false} />}
      {json?.type === 'repair' && <RepairPlan repair={json.data} />}

      {/* 打字机光标 */}
      {isStreaming && !isTypingJson && (
        <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1 align-middle" />
      )}
    </div>
  );
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming,
  streamingContent,
  isWaiting = false,
  onTaskFeedback,
  onQuestionAnswers,
  onViewCases,
  onRequestRepairGuide,
}) => {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isLatestAssistantMessage =
          message.role === 'assistant' &&
          index === messages.length - 1 &&
          !isStreaming;

        // 检测是否是加载消息（带跑马灯效果的消息）
        const isLoadingMessage = message.role === 'user' &&
          (message.content.includes('正在分析故障中') ||
           message.content.includes('正在加载维修指导') ||
           message.content.includes('正在加载中'));

        return (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-primary-600'
                  : 'bg-gradient-to-br from-secondary-500 to-secondary-600'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === 'user'
                  ? isLoadingMessage
                    ? 'bg-white border-2 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-origin-border rounded-br-md'
                    : 'bg-primary-600 text-white rounded-br-md'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
              }`}
              style={isLoadingMessage && message.role === 'user' ? {
                backgroundImage: 'linear-gradient(white, white), linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              } : undefined}
            >
              {message.role === 'assistant' ? (
                <MessageContent
                  content={message.content}
                  isLatestMessage={isLatestAssistantMessage}
                  onTaskFeedback={onTaskFeedback}
                  onQuestionAnswers={onQuestionAnswers}
                  onViewCases={onViewCases}
                  onRequestRepairGuide={onRequestRepairGuide}
                />
              ) : (
                (message.content.includes('正在分析故障中') || message.content.includes('正在加载维修指导')) ? (
                  <LoadingText text={message.content} />
                ) : (
                  <p>{message.content}</p>
                )
              )}
            </div>
          </div>
        );
      })}

      {/* 等待首token时显示 */}
      {isWaiting && !streamingContent && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-white shadow-sm border border-gray-100 rounded-bl-md">
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" />
          </div>
        </div>
      )}

      {/* 流式内容显示 */}
      {isStreaming && streamingContent && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md">
            <StreamingContent content={streamingContent} isStreaming={isStreaming} />
          </div>
        </div>
      )}
    </div>
  );
};
