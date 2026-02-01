import React from 'react';
import { DiagnosisStage } from '../types';

interface StageIndicatorProps {
  stage: DiagnosisStage;
  name: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

export const StageIndicator: React.FC<StageIndicatorProps> = ({
  name,
  icon,
  isActive,
  isCompleted,
  onClick,
}) => {
  const baseClasses = 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap';

  const stateClasses = isActive
    ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
    : isCompleted
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-500 hover:bg-gray-200';

  return (
    <button onClick={onClick} className={`${baseClasses} ${stateClasses}`}>
      {icon}
      <span>{name}</span>
      {isCompleted && (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
};
