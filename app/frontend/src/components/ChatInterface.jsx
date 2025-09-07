// app/frontend/src/components/ChatInterface.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Menu, Plus, MessageSquare, Settings, HelpCircle, Sun, Moon, Copy, Check, X } from 'lucide-react';
import MessageContent from './MessageContent';
import Sidebar from './Sidebar';
import CustomHeader from './Header';
import InputArea from './InputArea';
import ModelChatPane from './ModelChatPane';
import PaneResizer from './PaneResizer';
import { sendMessageStream, endSession, startSession } from './api';
import { useTheme } from './hooks/useTheme';
import { useChatState } from './hooks/useChatState';
import { useResizing } from './hooks/useResizing';
import { usePaneResizing } from './hooks/usePaneResizing';
import { useMessageHandling } from './hooks/useMessageHandling';
import { modelOptions, sampleConversations, handleCopyToClipboard, resetTextareaHeight } from './utils/chatUtils';

const ChatInterface = () => {
  const thread_id_1 = "1";
  
  // Theme management
  const { isDarkMode, setIsDarkMode, theme } = useTheme();
  
  // Chat state management
  const {
    selectedModels,
    setSelectedModels,
    modelMessages,
    setModelMessages,
    inputValue,
    setInputValue,
    modelInputValues,
    setModelInputValues,
    isLoading,
    setIsLoading,
    isStreaming,
    setIsStreaming,
    streamingMessageIds,
    setStreamingMessageIds,
    copiedUserMsgId,
    setCopiedUserMsgId,
    handleModelToggle
  } = useChatState();
  
  // Resizing hooks
  const {
    chatboxHeight,
    setChatboxHeight,
    modelChatboxHeights,
    setModelChatboxHeights,
    isResizing,
    setIsResizing,
    resizingKey,
    setResizingKey,
    handleResizeStart
  } = useResizing();
  
  const {
    panelWidths,
    setPanelWidths,
    panesContainerRef
  } = usePaneResizing(selectedModels);
  
  // Refs and state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePane, setActivePane] = useState(null);
  const messagesEndRefs = useRef({});
  const messagesContainerRefs = useRef({});
  const isAtBottomRef = useRef({});
  // Removed hover tracking to avoid rerendering during text selection
  const userScrollTimersRef = useRef({});
  const userScrollingRef = useRef({});
  const textareaRef = useRef(null);
  const modelTextareaRefs = useRef({});
  const resizeRef = useRef(null);

  // Scroll utilities
  const scrollToBottom = (model) => {
    messagesEndRefs.current[model]?.scrollIntoView({ behavior: "smooth" });
  };

  const shouldAutoScroll = (model) => {
    const atBottom = isAtBottomRef.current[model];
    return atBottom === undefined ? true : !!atBottom;
  };

  const scrollAllToBottom = () => {
    selectedModels.forEach(model => {
      if (shouldAutoScroll(model)) scrollToBottom(model);
    });
  };

  // Effects
  useEffect(() => {
    scrollAllToBottom();
  }, [modelMessages]);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      try {
        Object.values(streamingAbortControllerRefs.current).forEach(controller => {
          if (controller) controller.abort();
        });
        await Promise.all(selectedModels.map(model => endSession(`${thread_id_1}_${model}`)));
      } catch (err) {
        // Optionally log error
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedModels]);

  // Message handling hook
  const { sendToModel, streamingAbortControllerRefs } = useMessageHandling({
    thread_id_1,
    selectedModels,
    modelMessages,
    setModelMessages,
    isLoading,
    setIsLoading,
    isStreaming,
    setIsStreaming,
    streamingMessageIds,
    setStreamingMessageIds,
    shouldAutoScroll,
    scrollToBottom
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const currentInput = inputValue;
    setInputValue('');

    resetTextareaHeight(textareaRef, '30px');

    selectedModels.forEach(model => {
      sendToModel(model, currentInput);
    });
  };

  const handleModelSubmit = async (e, model) => {
    e.preventDefault();
    const messageContent = modelInputValues[model]?.trim();
    if (!messageContent) return;

    setModelInputValues(prev => ({ ...prev, [model]: '' }));
    
    resetTextareaHeight(modelTextareaRefs.current[model] ? { current: modelTextareaRefs.current[model] } : null, '22px');

    sendToModel(model, messageContent);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    
    if (e.key === 'Escape') {
      Object.entries(streamingAbortControllerRefs.current).forEach(([model, controller]) => {
        if (controller && isStreaming[model]) {
          controller.abort();
        }
      });
      setIsStreaming({});
      setIsLoading({});
      setStreamingMessageIds({});
    }
  };

  const handleModelKeyDown = (e, model) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleModelSubmit(e, model);
    }
    
    if (e.key === 'Escape' && isStreaming[model]) {
      if (streamingAbortControllerRefs.current[model]) {
        streamingAbortControllerRefs.current[model].abort();
      }
      setIsStreaming(prev => ({ ...prev, [model]: false }));
      setIsLoading(prev => ({ ...prev, [model]: false }));
      setStreamingMessageIds(prev => {
        const newIds = { ...prev };
        delete newIds[model];
        return newIds;
      });
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleModelInputChange = (e, model) => {
    setModelInputValues(prev => ({ ...prev, [model]: e.target.value }));
  };

  const handleCopyUserMessage = async (msgId, content) => {
    handleCopyToClipboard(
      content,
      () => {
        setCopiedUserMsgId(msgId);
        setTimeout(() => setCopiedUserMsgId(null), 2000);
      },
      (error) => {
        console.error('Failed to copy message:', error);
      }
    );
  };

  const anyLoading = selectedModels.some(model => isLoading[model] || isStreaming[model]);

  return (
    <div className={`flex h-screen ${theme.background} ${theme.textPrimary}`}>
      <Sidebar
        sidebarOpen={sidebarOpen}
        theme={theme}
        sampleConversations={sampleConversations}
      />
      <div className="relative group/header flex-1 flex flex-col min-w-0">
        <div className="absolute top-0 left-0 right-0 h-2 z-40 md:block" style={{ pointerEvents: 'auto' }} />
        <CustomHeader
          theme={theme}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          modelOptions={modelOptions}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
        />
        
        <div ref={panesContainerRef} className="flex-1 flex overflow-x-auto overflow-y-hidden relative min-w-0">
          {selectedModels.map((model, index) => (
            <React.Fragment key={model}>
              <ModelChatPane
                model={model}
                index={index}
                modelOptions={modelOptions}
                theme={theme}
                panelWidths={panelWidths}
                selectedModels={selectedModels}
                modelMessages={modelMessages}
                isStreaming={isStreaming}
                isLoading={isLoading}
                messagesContainerRefs={messagesContainerRefs}
              isAtBottomRef={isAtBottomRef}
                messagesEndRefs={messagesEndRefs}
                copiedUserMsgId={copiedUserMsgId}
                handleCopyUserMessage={handleCopyUserMessage}
                activePane={activePane}
                setActivePane={setActivePane}
                isDarkMode={isDarkMode}
                modelInputValues={modelInputValues}
                handleModelInputChange={handleModelInputChange}
                handleModelKeyDown={handleModelKeyDown}
                handleModelSubmit={handleModelSubmit}
                modelTextareaRefs={modelTextareaRefs}
                modelChatboxHeights={modelChatboxHeights}
                handleResizeStart={handleResizeStart}
              />
              {index < selectedModels.length - 1 && (
                <PaneResizer
                  index={index}
                  selectedModels={selectedModels}
                  panelWidths={panelWidths}
                  setPanelWidths={setPanelWidths}
                  panesContainerRef={panesContainerRef}
                  theme={theme}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <InputArea
          theme={theme}
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleKeyDown={handleKeyDown}
          handleSubmit={handleSubmit}
          textareaRef={textareaRef}
          isLoading={anyLoading}
          chatboxHeight={chatboxHeight}
          resizeRef={resizeRef}
          handleResizeStart={handleResizeStart('global')}
          placeholder="Message all selected models..."
        />
      </div>
    </div>
  );
};

export default ChatInterface;
