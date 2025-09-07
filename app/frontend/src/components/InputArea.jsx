// app/frontend/src/components/InputArea.jsx

import React, { useEffect } from 'react';
import { Send } from 'lucide-react';

const InputArea = ({
  inputValue,
  setInputValue,
  handleKeyDown,
  handleSubmit,
  textareaRef,
  isLoading,
  theme,
  chatboxHeight,
  resizeRef,
  handleResizeStart,
  model,
  placeholder,
  onFocus,
}) => {
  useEffect(() => {
    // Only auto-size when not using a controlled height
    if (typeof chatboxHeight === 'number') return;
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200; // same for global + single model
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.height = `${maxHeight}px`;
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.height = `${scrollHeight}px`;
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [inputValue, chatboxHeight]);

  return (
    <div className="px-4 py-1 relative">
      {/* Resize Handle (shown when resize handler provided) */}
      {typeof handleResizeStart === 'function' && (
        <div
          ref={resizeRef}
          onMouseDown={handleResizeStart}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 cursor-ns-resize z-10 group"
          aria-label="Resize input area"
        >
          <div className="h-0.5 w-full bg-gray-300 dark:bg-gray-700 rounded-full group-hover:bg-emerald-500 transition-colors" />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`group relative w-full ${theme.surface} rounded-lg border ${theme.border} focus-within:ring-1 focus-within:ring-emerald-500/60 transition-all duration-200 shadow-md`}
      >
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          placeholder={placeholder}
          className={`w-full resize-none bg-transparent pl-4 pr-12 py-1 text-sm ${theme.textPrimary} placeholder:text-gray-500/70 focus:outline-none`}
          style={
            typeof chatboxHeight === 'number'
              ? { height: `${chatboxHeight}px`, minHeight: '22px', overflowY: 'auto' }
              : { minHeight: '22px' }
          }
          readOnly={isLoading}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          aria-label={model ? "Send message" : "Send message to all models"}
          title={model ? "Send message" : "Send message to all models"}
          className={`absolute right-4 bottom-1 flex items-center justify-center !p-0 !border-0 bg-transparent transition-colors transition-transform duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 
            ${inputValue?.trim() ? 'text-emerald-300' : 'text-emerald-400'} group-focus-within:text-emerald-300 hover:text-emerald-300`}
        >
          <Send size={18} className={`transform hover:translate-x-0.5 active:-rotate-6 transition-transform duration-150 ${inputValue?.trim() ? 'scale-110' : 'scale-100'} group-focus-within:scale-110`} />
        </button>
      </form>

      {/* {isLoading && (
        <div className="text-[10px] text-gray-500 pt-0.5 text-center">
          {model ? "Streaming..." : "Sending to models..."}
        </div>
      )} */}
    </div>
  );
};

export default InputArea;
