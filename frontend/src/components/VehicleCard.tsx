import React from 'react';
import { Car, AlertTriangle, Zap } from 'lucide-react';
import { VehicleInfo } from '../types';

interface VehicleCardProps {
  vehicle: VehicleInfo;
  onAnalyzeFaults?: () => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onAnalyzeFaults }) => {
  const hasFaultCodes = vehicle.faultCodes && vehicle.faultCodes.length > 0;

  return (
    <div className="p-4 bg-white border-b">
      <div className="flex items-center gap-2 mb-3">
        <Car className="w-5 h-5 text-primary-600" />
        <h3 className="font-semibold text-gray-800">车辆信息</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">品牌</span>
          <span className="font-medium">{vehicle.brand}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">车型</span>
          <span className="font-medium">{vehicle.model}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">年份</span>
          <span className="font-medium">{vehicle.year}年</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">发动机</span>
          <span className="font-medium">{vehicle.engineType}</span>
        </div>
        {vehicle.plateNumber && (
          <div className="flex justify-between">
            <span className="text-gray-500">车牌号</span>
            <span className="font-medium">{vehicle.plateNumber}</span>
          </div>
        )}
        {vehicle.mileage && (
          <div className="flex justify-between">
            <span className="text-gray-500">里程</span>
            <span className="font-medium">{vehicle.mileage.toLocaleString()} km</span>
          </div>
        )}
        {vehicle.lastMaintenance && (
          <div className="flex justify-between">
            <span className="text-gray-500">上次保养</span>
            <span className="font-medium">{vehicle.lastMaintenance}</span>
          </div>
        )}
        <div className="pt-2 border-t">
          <span className="text-xs text-gray-400">VIN: {vehicle.vin}</span>
        </div>
      </div>

      {/* 故障码部分 */}
      {hasFaultCodes && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-800">故障码</h3>
            <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              {vehicle.faultCodes!.length} 个
            </span>
          </div>

          <div className="space-y-2">
            {vehicle.faultCodes!.map((fault, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg border ${
                  fault.severity === 'high'
                    ? 'bg-red-50 border-red-200'
                    : fault.severity === 'medium'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                      fault.severity === 'high'
                        ? 'bg-red-500 text-white'
                        : fault.severity === 'medium'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {fault.code}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {fault.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 一键分析按钮 */}
          {onAnalyzeFaults && (
            <button
              onClick={onAnalyzeFaults}
              className="mt-3 w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium text-sm hover:from-primary-700 hover:to-primary-800 transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              一键分析故障
            </button>
          )}
        </div>
      )}
    </div>
  );
};
