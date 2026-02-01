import React, { useState } from 'react';
import { Circle, CheckCircle, XCircle, HelpCircle, ChevronRight } from 'lucide-react';
import { HistoricalCase } from '../types';

interface Task {
  id: string;
  name: string;
  desc: string;
  relatedCases?: HistoricalCase[];
}

interface TaskFeedback {
  taskId: string;
  status: 'normal' | 'abnormal' | 'unable' | null;
  note: string;
}

interface InteractiveTaskListProps {
  tasks: Task[];
  onSubmitFeedback: (feedback: TaskFeedback[]) => void;
  onViewCases?: (task: Task) => void;
}

export const InteractiveTaskList: React.FC<InteractiveTaskListProps> = ({ tasks, onSubmitFeedback, onViewCases }) => {
  const [feedbacks, setFeedbacks] = useState<Map<string, TaskFeedback>>(
    new Map(tasks.map(task => [task.id, { taskId: task.id, status: null, note: '' }]))
  );

  const handleStatusChange = (taskId: string, status: 'normal' | 'abnormal' | 'unable') => {
    setFeedbacks(prev => {
      const newMap = new Map(prev);
      const feedback = newMap.get(taskId)!;
      newMap.set(taskId, { ...feedback, status });
      return newMap;
    });
  };

  const handleNoteChange = (taskId: string, note: string) => {
    setFeedbacks(prev => {
      const newMap = new Map(prev);
      const feedback = newMap.get(taskId)!;
      newMap.set(taskId, { ...feedback, note });
      return newMap;
    });
  };

  const handleSubmit = () => {
    const feedbackArray = Array.from(feedbacks.values());
    onSubmitFeedback(feedbackArray);
  };

  const allTasksChecked = Array.from(feedbacks.values()).every(f => f.status !== null);

  return (
    <div className="mt-3 space-y-3">
      <div className="text-xs font-medium text-gray-500 mb-2">排查任务（请反馈检查结果）：</div>

      {tasks.map((task) => {
        const feedback = feedbacks.get(task.id)!;
        const hasCases = task.relatedCases && task.relatedCases.length > 0;

        return (
          <div key={task.id} className="p-3 bg-blue-50 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <Circle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-800">{task.name}</div>
                <div className="text-xs text-gray-500">{task.desc}</div>

                {/* 历史案例提示 */}
                {hasCases && onViewCases && (
                  <button
                    onClick={() => onViewCases(task)}
                    className="mt-1 flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    <span>有 {task.relatedCases!.length} 个相关案例</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 状态选择按钮 */}
            <div className="flex gap-2 ml-6">
              <button
                onClick={() => handleStatusChange(task.id, 'normal')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  feedback.status === 'normal'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-green-50 border border-gray-200'
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                正常
              </button>

              <button
                onClick={() => handleStatusChange(task.id, 'abnormal')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  feedback.status === 'abnormal'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-red-50 border border-gray-200'
                }`}
              >
                <XCircle className="w-3 h-3" />
                异常
              </button>

              <button
                onClick={() => handleStatusChange(task.id, 'unable')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  feedback.status === 'unable'
                    ? 'bg-gray-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <HelpCircle className="w-3 h-3" />
                无法检查
              </button>
            </div>

            {/* 备注输入框 */}
            {feedback.status && (
              <input
                type="text"
                placeholder="添加备注（可选）"
                value={feedback.note}
                onChange={(e) => handleNoteChange(task.id, e.target.value)}
                className="ml-6 w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        );
      })}

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={!allTasksChecked}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
          allTasksChecked
            ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {allTasksChecked ? '提交反馈并继续诊断' : '请完成所有任务检查'}
      </button>
    </div>
  );
};
