import React from 'react';

export const LoadingText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="inline-block">
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #3b82f6 0%,
            #8b5cf6 25%,
            #ec4899 50%,
            #f59e0b 75%,
            #3b82f6 100%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2s linear infinite;
          font-weight: 500;
        }
      `}</style>
      <span className="shimmer-text">{text}</span>
    </div>
  );
};
