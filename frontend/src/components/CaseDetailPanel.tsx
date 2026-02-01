import React from 'react';
import { ArrowLeft, Calendar, User, Wrench, Clock, DollarSign, FileText } from 'lucide-react';
import { HistoricalCase } from '../types';

interface CaseDetailPanelProps {
  caseItem: HistoricalCase;
  onBack: () => void;
}

export const CaseDetailPanel: React.FC<CaseDetailPanelProps> = ({ caseItem, onBack }) => {
  return (
    <div className="p-4 bg-white border-b">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 mb-3 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回案例列表
      </button>

      {/* 标题 */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-800">案例详情</h3>
      </div>

      {/* 详情内容 */}
      <div className="space-y-3 text-sm">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">车辆信息</div>
          <div className="font-medium text-gray-800">{caseItem.vehicleModel}</div>
          <div className="text-xs text-gray-600 mt-1">{caseItem.plateNumber}</div>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">日期</span>
          <span className="font-medium text-gray-800 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {caseItem.date}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">维修技师</span>
          <span className="font-medium text-gray-800 flex items-center gap-1">
            <User className="w-3 h-3" />
            {caseItem.technician}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">维修时长</span>
          <span className="font-medium text-gray-800 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {caseItem.repairTime}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">维修费用</span>
          <span className="font-medium text-gray-800 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            {caseItem.cost}
          </span>
        </div>

        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500 mb-2">故障描述</div>
          <div className="text-gray-700 leading-relaxed">
            {caseItem.faultDescription}
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="text-xs text-gray-500 mb-2">解决方案</div>
          <div className="text-gray-700 leading-relaxed">
            {caseItem.solution}
          </div>
        </div>
      </div>
    </div>
  );
};
