import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { DiagnosisTask } from '../types';

interface TaskPanelProps {
  tasks: DiagnosisTask[];
  onTaskUpdate: (tasks: DiagnosisTask[]) => void;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({ tasks, onTaskUpdate }) => {
  const handleToggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId
        ? { ...task, status: (task.status === 'pending' ? 'normal' : 'pending') as 'normal' | 'abnormal' | 'unable' | 'pending' }
        : task
    );
    onTaskUpdate(updatedTasks);
  };

  const completedCount = tasks.filter(t => t.status !== 'pending').length;

  return (
    <div className="p-4 bg-white border-b">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">诊断任务</h3>
        <span className="text-xs text-gray-500">
          {completedCount}/{tasks.length} 已完成
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => handleToggleTask(task.id)}
          >
            {task.status !== 'pending' ? (
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className={`text-sm ${task.status !== 'pending' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                {task.name}
              </div>
              {task.desc && (
                <div className="text-xs text-gray-500 mt-1">{task.desc}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
