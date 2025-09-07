// app/frontend/src/components/ChatInference.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Menu, Plus, MessageSquare, Settings, HelpCircle, Sun, Moon, Copy, Check, X } from 'lucide-react';
import MessageContent from './MessageContent';
import Sidebar from './Sidebar';
import CustomHeader from './Header';
import InputArea from './InputArea';
import { sendMessageStream, endSession, startSession } from './api';

const ChatInterface = () => {
  const thread_id_1 = "1";
  const [selectedModels, setSelectedModels] = useState(['gemini-2.5-pro']); // Array of selected models
  const [modelMessages, setModelMessages] = useState({}); // Separate messages for each model
  const [inputValue, setInputValue] = useState('');
  const [modelInputValues, setModelInputValues] = useState({}); // Individual input values for each model
  const [isLoading, setIsLoading] = useState({});
  const [isStreaming, setIsStreaming] = useState({});
  const [streamingMessageIds, setStreamingMessageIds] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatboxHeight, setChatboxHeight] = useState(30); // global input height
  const [modelChatboxHeights, setModelChatboxHeights] = useState({}); // per-model input heights
  const [isResizing, setIsResizing] = useState(false);
  const [resizingKey, setResizingKey] = useState(null); // 'global' or `model:<name>`
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [copiedUserMsgId, setCopiedUserMsgId] = useState(null);
  // Horizontal resizing state for model panes
  const [panelWidths, setPanelWidths] = useState([]); // percentages matching selectedModels order
  const panesContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragIndexRef = useRef(null); // index of resizer affecting left i and right i+1
  const startXRef = useRef(0);
  const startWidthsRef = useRef([]);
  
  const modelOptions = [
    { value: 'gpt-5', label: 'GPT 5' },
    { value: 'gpt-5-mini', label: 'GPT 5 Mini' },
    { value: 'gpt-5-nano', label: 'GPT 5 Nano' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' }
  ];
  
  const messagesEndRefs = useRef({});
  const messagesContainerRefs = useRef({});
  const isAtBottomRef = useRef({}); // { [model]: boolean } tracks if a pane is scrolled to bottom
  const [hoverState, setHoverState] = useState({}); // { [model]: { hovering: bool, fractionY: number } }
  const userScrollTimersRef = useRef({}); // { [model]: number }
  const userScrollingRef = useRef({}); // { [model]: boolean }
  const textareaRef = useRef(null);
  const modelTextareaRefs = useRef({}); // Individual textarea refs for each model
  const resizeRef = useRef(null);
  const streamingAbortControllerRefs = useRef({});

  // Initialize messages and pane widths for each selected model
  useEffect(() => {
    const initialMessage = {
      id: 1,
      type: 'assistant',
      content: "To use me as a standard AI, type **`start`**. \n\n To use me as a prompt assistant for creative tasks, type **`prompt assistant`** or **`start prompt assistant`**.",
      timestamp: new Date()
    };

    const newModelMessages = {};
    const newModelInputValues = {};
    const newModelHeights = {};
    selectedModels.forEach(model => {
      if (!modelMessages[model]) {
        newModelMessages[model] = [initialMessage];
      } else {
        newModelMessages[model] = modelMessages[model];
      }
      if (!modelInputValues[model]) {
        newModelInputValues[model] = '';
      }
      if (modelChatboxHeights[model] == null) {
        newModelHeights[model] = 22;
      }
    });

    setModelMessages(newModelMessages);
    setModelInputValues(prev => ({ ...prev, ...newModelInputValues }));
    if (Object.keys(newModelHeights).length) {
      setModelChatboxHeights(prev => ({ ...prev, ...newModelHeights }));
    }
    // Initialize equal widths when selection changes
    const count = selectedModels.length || 1;
    const equal = Array(count).fill(100 / count);
    setPanelWidths(equal);
  }, [selectedModels]);

  const scrollToBottom = (model) => {
    messagesEndRefs.current[model]?.scrollIntoView({ behavior: "smooth" });
  };

  const shouldAutoScroll = (model) => {
    // Only auto-scroll if that model's messages pane is currently at the bottom.
    // Default to true if undefined so initial loads still scroll.
    const atBottom = isAtBottomRef.current[model];
    return atBottom === undefined ? true : !!atBottom;
  };

  const scrollAllToBottom = () => {
    selectedModels.forEach(model => {
      if (shouldAutoScroll(model)) scrollToBottom(model);
    });
  };

  useEffect(() => {
    scrollAllToBottom();
  }, [modelMessages]);

  // Handle model selection
  const handleModelToggle = (modelValue) => {
    setSelectedModels(prev => {
      if (prev.includes(modelValue)) {
        if (prev.length === 1) return prev; // Don't allow removing the last model
        return prev.filter(m => m !== modelValue);
      } else {
        return [...prev, modelValue];
      }
    });
  };

  // Resize functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      e.preventDefault();
      const windowHeight = window.innerHeight;
      const mouseY = e.clientY;
      
      const distanceFromBottom = windowHeight - mouseY;
      const newHeight = Math.max(22, Math.min(800, distanceFromBottom - 20));
      
      if (resizingKey === 'global') {
        setChatboxHeight(newHeight);
      } else if (resizingKey && resizingKey.startsWith('model:')) {
        const model = resizingKey.slice('model:'.length);
        setModelChatboxHeights(prev => ({ ...prev, [model]: newHeight }));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingKey(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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

  const handleResizeStart = (key) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizingKey(key);
  };

  // Send message to a specific model
  const sendToModel = async (model, messageContent) => {
    const command = messageContent.trim().toLowerCase();
    const exitCommands = ['exit', 'quit', 'clear', 'end'];
    const startCommands = ['start', 'start prompt assistant', 'prompt assistant'];

    if (startCommands.includes(command)) {
      const isPromptAssistant = command !== 'start';
      
      setIsLoading(prev => ({ ...prev, [model]: true }));

      try {
        await startSession(`${thread_id_1}_${model}`, model, isPromptAssistant);
        setModelMessages(prev => ({
          ...prev,
          [model]: [...(prev[model] || []), {
            id: Date.now() + Math.random(),
            type: 'assistant',
            content: `Session started. Mode: ${isPromptAssistant ? 'Prompt Assistant' : 'Normal'}.`,
            timestamp: new Date()
          }]
        }));
      } catch (err) {
        setModelMessages(prev => ({
          ...prev,
          [model]: [...(prev[model] || []), {
            id: Date.now() + Math.random(),
            type: 'assistant',
            content: "Error starting session. Please try again.",
            timestamp: new Date()
          }]
        }));
      } finally {
        setIsLoading(prev => ({ ...prev, [model]: false }));
      }
      return;
    }
    
    if (exitCommands.includes(command)) {
      setIsLoading(prev => ({ ...prev, [model]: true }));

      if (streamingAbortControllerRefs.current[model]) {
        streamingAbortControllerRefs.current[model].abort();
      }

      try {
        await endSession(`${thread_id_1}_${model}`);
        setModelMessages(prev => ({
          ...prev,
          [model]: [...(prev[model] || []), {
            id: Date.now() + Math.random(),
            type: 'assistant',
            content: `Session ended by user command: '${messageContent}'`,
            timestamp: new Date()
          }]
        }));
      } catch (err) {
        setModelMessages(prev => ({
          ...prev,
          [model]: [...(prev[model] || []), {
            id: Date.now() + Math.random(),
            type: 'assistant',
            content: "Error ending session. Please try again.",
            timestamp: new Date()
          }]
        }));
      } finally {
        setIsLoading(prev => ({ ...prev, [model]: false }));
        setIsStreaming(prev => ({ ...prev, [model]: false }));
        setStreamingMessageIds(prev => {
          const newIds = { ...prev };
          delete newIds[model];
          return newIds;
        });
      }
      return;
    }

    // Check if this model is currently loading or streaming
    if (isLoading[model] || isStreaming[model]) return;

    // Add user message
    const userMessage = {
      id: Date.now() + Math.random(),
      type: 'user',
      content: messageContent,
      timestamp: new Date(),
      model: model
    };

    setModelMessages(prev => ({
      ...prev,
      [model]: [...(prev[model] || []), userMessage]
    }));

    setIsStreaming(prev => ({ ...prev, [model]: true }));
    setIsLoading(prev => ({ ...prev, [model]: true }));

    const assistantMessageId = Date.now() + Math.random();
    setStreamingMessageIds(prev => ({ ...prev, [model]: assistantMessageId }));
    
    const assistantMessage = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    
    setModelMessages(prev => ({
      ...prev,
      [model]: [...(prev[model] || []), assistantMessage]
    }));

    try {
      let accumulatedContent = '';
      
      await sendMessageStream(
        messageContent,
        `${thread_id_1}_${model}`,
        (chunk) => {
          accumulatedContent += chunk;
          
          setModelMessages(prev => ({
            ...prev,
            [model]: prev[model].map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          }));
          
          setTimeout(() => { if (shouldAutoScroll(model)) scrollToBottom(model); }, 10);
        },
        () => {
          setModelMessages(prev => ({
            ...prev,
            [model]: prev[model].map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: accumulatedContent, isStreaming: false }
                : msg
            )
          }));
          
          setIsStreaming(prev => ({ ...prev, [model]: false }));
          setIsLoading(prev => ({ ...prev, [model]: false }));
          setStreamingMessageIds(prev => {
            const newIds = { ...prev };
            delete newIds[model];
            return newIds;
          });
        },
        (error) => {
          console.error(`Streaming error for ${model}:`, error);
          const errorContent = accumulatedContent || `Sorry, I'm having trouble connecting to the server. Please try again later.\n\n**Error details:**\n\`\`\`\n${error.message}\n\`\`\``;
          
          setModelMessages(prev => ({
            ...prev,
            [model]: prev[model].map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: errorContent, isStreaming: false }
                : msg
            )
          }));
          
          setIsStreaming(prev => ({ ...prev, [model]: false }));
          setIsLoading(prev => ({ ...prev, [model]: false }));
          setStreamingMessageIds(prev => {
            const newIds = { ...prev };
            delete newIds[model];
            return newIds;
          });
        }
      );
    } catch (error) {
      console.error(`Fetch error for ${model}:`, error);
      const errorMessage = `Sorry, I'm having trouble connecting to the server. Please try again later.\n\n**Error details:**\n\`\`\`\n${error.message}\n\`\`\``;
      
      setModelMessages(prev => ({
        ...prev,
        [model]: prev[model].map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: errorMessage, isStreaming: false }
            : msg
        )
      }));
      
      setIsStreaming(prev => ({ ...prev, [model]: false }));
      setIsLoading(prev => ({ ...prev, [model]: false }));
      setStreamingMessageIds(prev => {
        const newIds = { ...prev };
        delete newIds[model];
        return newIds;
      });
    }
  };

  // Handle global submit (all models)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    const currentInput = inputValue;
    setInputValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = '30px';
      textareaRef.current.style.overflowY = 'hidden';
    }

    // Send to all selected models
    selectedModels.forEach(model => {
      sendToModel(model, currentInput);
    });
  };

  // Handle individual model submit
  const handleModelSubmit = async (e, model) => {
    e.preventDefault();
    const messageContent = modelInputValues[model]?.trim();
    if (!messageContent) return;

    setModelInputValues(prev => ({ ...prev, [model]: '' }));
    
    if (modelTextareaRefs.current[model]) {
      modelTextareaRefs.current[model].style.height = '22px';
      modelTextareaRefs.current[model].style.overflowY = 'hidden';
    }

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
    try {
      await navigator.clipboard.writeText(content);
      setCopiedUserMsgId(msgId);
      setTimeout(() => setCopiedUserMsgId(null), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedUserMsgId(msgId);
        setTimeout(() => setCopiedUserMsgId(null), 2000);
      } catch (fallbackErr) {}
      document.body.removeChild(textArea);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const sampleConversations = [
    "Explain quantum computing",
    "Write a Python script",
    "Plan a weekend trip",
    "Brainstorm business ideas",
    "Help with math homework"
  ];

  const newthemeClasses = {
    dark: {
      background: "bg-[#0d1117]",
      panel: "bg-[#010409]",
      card: "bg-[#161b22]",
      surface: "bg-[#0d1117]",
      textPrimary: "text-gray-100",
      textSecondary: "text-gray-300",
      muted: "text-gray-400",
      border: "border-gray-800",
      accent: "from-emerald-500 to-teal-500"
    },
    light: {
      background: "bg-white",
      panel: "bg-gray-50",
      card: "bg-white",
      surface: "bg-gray-50",
      textPrimary: "text-gray-900",
      textSecondary: "text-gray-700",
      muted: "text-gray-500",
      border: "border-gray-200",
      accent: "from-emerald-500 to-teal-500"
    }
  };

  const theme = isDarkMode ? newthemeClasses.dark : newthemeClasses.light;

  

  const renderModelChat = (model, index) => {
    const messages = modelMessages[model] || [];
    const modelLabel = modelOptions.find(opt => opt.value === model)?.label || model;
    
    return (
      <div
        key={model}
        className={`flex flex-col min-w-0 ${index > 0 ? `border-l ${theme.border}` : ''}`}
        style={{ width: `${panelWidths[index] ?? (100 / (selectedModels.length || 1))}%`, minWidth: '10%' }}
      >
        {/* Model header */}
        <div className={`${theme.surface} px-4 py-2 border-b ${theme.border}`}>
          <div className="text-sm font-medium text-center">{modelLabel}</div>
          {(isStreaming[model] || isLoading[model]) && (
            <div className="text-xs text-center text-emerald-400 mt-1">
              {isStreaming[model] ? '● Streaming' : '● Loading'}
            </div>
          )}
        </div>

        {/* Messages area */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-6 ${theme.surface}`}
          ref={(el) => {
            messagesContainerRefs.current[model] = el;
            // Assume at bottom on first mount so initial appends scroll down
            if (el && isAtBottomRef.current[model] === undefined) {
              isAtBottomRef.current[model] = true;
            }
          }}
          onScroll={(e) => {
            const el = e.currentTarget;
            const threshold = 32; // px tolerance
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            isAtBottomRef.current[model] = distanceFromBottom <= threshold;
          }}
          onMouseEnter={() => {
            setHoverState(prev => ({ ...prev, [model]: { ...(prev[model]||{}), hovering: true } }));
          }}
          onMouseLeave={() => {
            setHoverState(prev => ({ ...prev, [model]: { ...(prev[model]||{}), hovering: false, fractionY: null } }));
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const frac = rect.height > 0 ? Math.max(0, Math.min(1, y / rect.height)) : 1;
            setHoverState(prev => ({ ...prev, [model]: { ...(prev[model]||{}), hovering: true, fractionY: frac } }));
          }}
        >
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : ''}`}>
              {message.type === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              <div className={`max-w-[85%] ${message.type === 'user' ? 'order-1' : ''} relative`}>
                <div className={`inline-block px-5 py-5 rounded-2xl shadow-lg ${
                  message.type === 'user' 
                    ? `${theme.card} ml-auto backdrop-blur-sm` 
                    : theme.card
                }`}>
                  {message.type === 'user' ? (
                    <div className="flex items-center gap-2 group relative">
                      <p className="whitespace-pre-wrap leading-relaxed text-white">{message.content}</p>
                      <button
                        className="absolute bottom-1 right-1 p-1 rounded hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
                        title="Copy message"
                        onClick={() => handleCopyUserMessage(message.id, message.content)}
                        style={{ minWidth: 22, minHeight: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {copiedUserMsgId === message.id ? <Check size={16} /> : <Copy size={16} />}
                        <span className="sr-only">{copiedUserMsgId === message.id ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <MessageContent 
                        content={message.content || ''} 
                        isDarkMode={isDarkMode} 
                        messageId={message.id} 
                      />
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
                <div className={`text-xs ${theme.muted} mt-2 ${
                  message.type === 'user' ? 'text-right' : ''
                }`}>
                  {formatTime(message.timestamp)}
                  {message.isStreaming && <span className="ml-2 text-emerald-400">● Live</span>}
                </div>
              </div>
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 order-2 shadow-lg">
                  <User size={16} className="text-white" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading[model] && !isStreaming[model] && (
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
          )}
          
          <div ref={(el) => messagesEndRefs.current[model] = el} />
        </div>

        {/* Individual model input area */}
        <InputArea
          model={model}
          theme={theme}
          inputValue={modelInputValues[model] || ''}
          setInputValue={(value) => handleModelInputChange({ target: { value } }, model)}
          handleKeyDown={(e) => handleModelKeyDown(e, model)}
          handleSubmit={(e) => handleModelSubmit(e, model)}
          textareaRef={(el) => (modelTextareaRefs.current[model] = el)}
          isLoading={isLoading[model] || isStreaming[model]}
          placeholder={`Message ${modelOptions.find((opt) => opt.value === model)?.label}...`}
          chatboxHeight={modelChatboxHeights[model] ?? 22}
          handleResizeStart={handleResizeStart(`model:${model}`)}
        />
      </div>
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
        {/* Hover zone to reveal header on desktop */}
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
        
        {/* Split screen for multiple models with draggable horizontal resizers */}
        <div ref={panesContainerRef} className="flex-1 flex overflow-x-auto overflow-y-hidden relative min-w-0">
          {selectedModels.map((model, index) => (
            <React.Fragment key={model}>
              {renderModelChat(model, index)}
              {index < selectedModels.length - 1 && (
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    isDraggingRef.current = true;
                    dragIndexRef.current = index; // resizer between index and index+1
                    startXRef.current = e.clientX;
                    startWidthsRef.current = [...panelWidths];
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                    const onMove = (ev) => {
                      if (!isDraggingRef.current || !panesContainerRef.current) return;
                      const rect = panesContainerRef.current.getBoundingClientRect();
                      const totalWidth = rect.width || 1;
                      const dx = ev.clientX - startXRef.current;
                      const deltaPct = (dx / totalWidth) * 100;
                      const i = dragIndexRef.current;
                      const minPct = 10; // minimum width per pane
                      const leftStart = startWidthsRef.current[i] ?? (100 / selectedModels.length);
                      const rightStart = startWidthsRef.current[i + 1] ?? (100 / selectedModels.length);
                      let leftNew = leftStart + deltaPct;
                      let rightNew = rightStart - deltaPct;
                      // Clamp to min widths
                      if (leftNew < minPct) {
                        const diff = minPct - leftNew;
                        leftNew = minPct;
                        rightNew -= diff;
                      }
                      if (rightNew < minPct) {
                        const diff = minPct - rightNew;
                        rightNew = minPct;
                        leftNew -= diff;
                      }
                      // Avoid negative or NaN
                      leftNew = Math.max(minPct, Math.min(100 - minPct, leftNew));
                      rightNew = Math.max(minPct, Math.min(100 - minPct, rightNew));
                      const updated = [...startWidthsRef.current];
                      updated[i] = leftNew;
                      updated[i + 1] = rightNew;
                      setPanelWidths(updated);
                    };
                    const onUp = () => {
                      isDraggingRef.current = false;
                      document.removeEventListener('mousemove', onMove);
                      document.removeEventListener('mouseup', onUp);
                      document.body.style.cursor = '';
                      document.body.style.userSelect = '';
                      // persist the final widths as the new base
                      startWidthsRef.current = [...panelWidths];
                    };
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                  }}
                  className={`w-1 cursor-col-resize select-none ${theme.surface}`}
                  style={{
                    position: 'relative',
                    backgroundColor: 'transparent',
                  }}
                >
                  {/* visual handle */}
                  <div
                    className="absolute top-0 bottom-0 left-[-3px] right-[-3px] hover:bg-gray-500/20"
                    style={{ cursor: 'col-resize' }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Global input area - sends to all models */}
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
