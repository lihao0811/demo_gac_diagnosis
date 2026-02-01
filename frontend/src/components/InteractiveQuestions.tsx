import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface InteractiveQuestionsProps {
  questions: Question[];
  onSubmitAnswers: (answers: { questionId: string; answer: string }[]) => void;
}

export const InteractiveQuestions: React.FC<InteractiveQuestionsProps> = ({ questions, onSubmitAnswers }) => {
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => {
      const newMap = new Map(prev);
      newMap.set(questionId, answer);
      return newMap;
    });
  };

  const handleSubmit = () => {
    const answerArray = Array.from(answers.entries()).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    onSubmitAnswers(answerArray);
  };

  const allQuestionsAnswered = questions.every(q => answers.has(q.id));

  return (
    <div className="mt-3 space-y-3">
      <div className="text-xs font-medium text-gray-500 mb-2">请选择以下信息：</div>

      {questions.map((question) => {
        const selectedAnswer = answers.get(question.id);

        return (
          <div key={question.id} className="p-3 bg-purple-50 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-800">{question.question}</div>
              </div>
            </div>

            {/* 选项按钮 */}
            <div className="flex flex-wrap gap-2 ml-6">
              {question.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelectAnswer(question.id, option)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedAnswer === option
                      ? 'bg-purple-500 text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-purple-100 border border-gray-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={!allQuestionsAnswered}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
          allQuestionsAnswered
            ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {allQuestionsAnswered ? '提交信息并继续' : '请回答所有问题'}
      </button>
    </div>
  );
};
