// app/frontend/src/components/LoadingIndicator.jsx

import React from 'react';
import { Bot } from 'lucide-react';

const LoadingIndicator = ({ theme }) => (
  <div className="flex gap-4">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
      <Bot size={16} className="text-white" />
    </div>
    <div className="max-w-[85%]">
      <div className={`inline-block px-5 py-5 rounded-2xl ${theme.card} shadow-lg`}>
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  </div>
);

export default LoadingIndicator;