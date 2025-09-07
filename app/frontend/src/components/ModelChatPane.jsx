// app/frontend/src/components/ModelChatPane.jsx

import React from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';  // Icons
import MessageContent from './MessageContent';          // Renders assistant message markdown/text
import InputArea from './InputArea';                    // Input box for each model
import LoadingIndicator from './LoadingIndicator';      // Loader while waiting
import { formatTime } from './utils/chatUtils';         // Utility to format message timestamps

/**
 * ModelChatPane
 * - A single chat panel dedicated to one model (can be multiple side-by-side).
 * - Displays model name, messages, streaming/loading status, and an input box.
 */
const ModelChatPane = ({
  model,
  index,
  modelOptions,
  theme,
  panelWidths,
  selectedModels,
  modelMessages,
  isStreaming,
  isLoading,
  messagesContainerRefs,
  isAtBottomRef,
  setHoverState,
  messagesEndRefs,
  copiedUserMsgId,
  handleCopyUserMessage,
  activePane,
  setActivePane,
  isDarkMode,
  modelInputValues,
  handleModelInputChange,
  handleModelKeyDown,
  handleModelSubmit,
  modelTextareaRefs,
  modelChatboxHeights,
  handleResizeStart
}) => {
  // Get all messages for this model
  const messages = modelMessages[model] || [];

  // Get the label from options or fallback to model name
  const modelLabel = modelOptions.find(opt => opt.value === model)?.label || model;

  // Track if this pane is currently active
  const isActive = activePane === model;

  return (
    <div
      // Container flexbox column; add left border if not the first panel
      className={`flex flex-col min-w-0 ${index > 0 ? `border-l ${theme.border}` : ''}`}
      style={{
        width: `${panelWidths[index] ?? (100 / (selectedModels.length || 1))}%`, // Responsive width
        minWidth: '3%'
      }}
      onClick={() => setActivePane && setActivePane(model)} // Activate pane on click
    >
      {/* Model header (only shown when NOT active) */}
      {!isActive && (
        <div className={`${theme.surface} px-4 py-2 border-b ${theme.border}`}>
          <div className="text-sm font-medium text-center">{modelLabel}</div>
          {(isStreaming[model] || isLoading[model]) && (
            <div className="text-xs text-center text-emerald-400 mt-1">
              {isStreaming[model] ? '● Streaming' : '● Loading'}
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-6 ${theme.surface}`}
        ref={(el) => {
          // Save ref for scroll control
          messagesContainerRefs.current[model] = el;
          if (el && isAtBottomRef.current[model] === undefined) {
            isAtBottomRef.current[model] = true; // Default to scrolled bottom
          }
        }}
        onScroll={(e) => {
          // Track whether user is near bottom of chat
          const el = e.currentTarget;
          const threshold = 32;
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          isAtBottomRef.current[model] = distanceFromBottom <= threshold;

          // Clicking/scrolling here makes it active
          if (setActivePane) setActivePane(model);
        }}
        onMouseEnter={() => {
          // Track hover state
          setHoverState(prev => ({
            ...prev,
            [model]: { ...(prev[model]||{}), hovering: true }
          }));
        }}
        onMouseLeave={() => {
          // Reset hover state
          setHoverState(prev => ({
            ...prev,
            [model]: { ...(prev[model]||{}), hovering: false, fractionY: null }
          }));
        }}
        onMouseMove={(e) => {
          // Track Y position inside container as fraction (0 → top, 1 → bottom)
          const rect = e.currentTarget.getBoundingClientRect();
          const y = e.clientY - rect.top;
          const frac = rect.height > 0 ? Math.max(0, Math.min(1, y / rect.height)) : 1;
          setHoverState(prev => ({
            ...prev,
            [model]: { ...(prev[model]||{}), hovering: true, fractionY: frac }
          }));
        }}
      >
        {/* Render messages */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            theme={theme}
            copiedUserMsgId={copiedUserMsgId}
            handleCopyUserMessage={handleCopyUserMessage}
            isDarkMode={isDarkMode}
            formatTime={formatTime}
          />
        ))}
        
        {/* Show loading spinner if waiting (but not streaming yet) */}
        {isLoading[model] && !isStreaming[model] && (
          <LoadingIndicator theme={theme} />
        )}
        
        {/* Marker div to scroll into view (always stays at bottom) */}
        <div ref={(el) => messagesEndRefs.current[model] = el} />
      </div>

      {/* Input area for sending messages to this model */}
      <InputArea
        model={model}
        theme={theme}
        inputValue={modelInputValues[model] || ''} // Controlled input value
        setInputValue={(value) => handleModelInputChange({ target: { value } }, model)}
        handleKeyDown={(e) => handleModelKeyDown(e, model)}
        handleSubmit={(e) => handleModelSubmit(e, model)}
        textareaRef={(el) => (modelTextareaRefs.current[model] = el)}
        onFocus={() => setActivePane && setActivePane(model)} // Activate on focus
        isLoading={isLoading[model] || isStreaming[model]}
        placeholder={`Message ${modelOptions.find((opt) => opt.value === model)?.label}...`}
        chatboxHeight={modelChatboxHeights[model] ?? 22}
        handleResizeStart={handleResizeStart(`model:${model}`)}
      />
    </div>
  );
};

/**
 * MessageBubble
 * - Renders either a user or assistant message with icons, copy button, streaming indicator, etc.
 */
const MessageBubble = ({ 
  message, 
  theme, 
  copiedUserMsgId, 
  handleCopyUserMessage, 
  isDarkMode, 
  formatTime 
}) => (
  <div className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : ''}`}>
    {/* Assistant avatar (left side) */}
    {message.type === 'assistant' && (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
        <Bot size={16} className="text-white" />
      </div>
    )}

    {/* Message content wrapper */}
    <div className={`max-w-[85%] ${message.type === 'user' ? 'order-1' : ''} relative`}>
      <div
        className={`inline-block px-5 py-5 rounded-2xl shadow-lg ${
          message.type === 'user' 
            ? `${theme.card} ml-auto backdrop-blur-sm`  // User bubble on right
            : theme.card                                // Assistant bubble on left
        }`}
      >
        {/* User message */}
        {message.type === 'user' ? (
          <div className="flex items-center gap-2 group relative">
            <p className={`whitespace-pre-wrap leading-relaxed ${theme.textPrimary}`}>{message.content}</p>

            {/* Copy button (appears on hover) */}
            <button
              className="absolute bottom-1 right-1 p-1 rounded hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
              title="Copy message"
              onClick={() => handleCopyUserMessage(message.id, message.content)}
              style={{
                minWidth: 22, minHeight: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {copiedUserMsgId === message.id ? <Check size={16} /> : <Copy size={16} />}
              <span className="sr-only">
                {copiedUserMsgId === message.id ? 'Copied!' : 'Copy'}
              </span>
            </button>
          </div>
        ) : (
          /* Assistant message */
          <div className="relative">
            <MessageContent 
              content={message.content || ''} 
              isDarkMode={isDarkMode} 
              messageId={message.id} 
            />

            {/* Streaming indicator ("Thinking...") */}
            {message.isStreaming && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-400">Thinking...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timestamp + Live indicator */}
      <div className={`text-xs ${theme.muted} mt-2 ${message.type === 'user' ? 'text-right' : ''}`}>
        {formatTime(message.timestamp)}
        {message.isStreaming && <span className="ml-2 text-emerald-400">● Live</span>}
      </div>
    </div>

    {/* User avatar (right side) */}
    {message.type === 'user' && (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 order-2 shadow-lg">
        <User size={16} className="text-white" />
      </div>
    )}
  </div>
);

export default ModelChatPane;
