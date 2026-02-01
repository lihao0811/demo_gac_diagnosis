import React from 'react';
import { ArrowLeft, Calendar, User, Wrench, Clock, DollarSign } from 'lucide-react';
import { HistoricalCase } from '../types';

interface HistoricalCasesPanelProps {
  cases: HistoricalCase[];
  taskName: string;
  onBack: () => void;
  onSelectCase: (caseItem: HistoricalCase) => void;
}

export const HistoricalCasesPanel: React.FC<HistoricalCasesPanelProps> = ({
  cases,
  taskName,
  onBack,
  onSelectCase,
}) => {
  return (
    <div className="p-4 bg-white border-b">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 mb-3 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回车辆信息
      </button>

      {/* 标题 */}
      <div className="mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">相关历史案例</h3>
        <p className="text-xs text-gray-500 mt-1">任务：{taskName}</p>
      </div>

      {/* 案例列表 */}
      <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {cases.map((caseItem) => (
          <div
            key={caseItem.id}
            onClick={() => onSelectCase(caseItem)}
            className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800 mb-1">
                  {caseItem.vehicleModel}
                </div>
                <div className="text-xs text-gray-500">
                  {caseItem.plateNumber}
                </div>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {caseItem.date}
              </div>
            </div>

            <div className="text-xs text-gray-600 mb-2 line-clamp-2">
              {caseItem.faultDescription}
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {caseItem.repairTime}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {caseItem.cost}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
