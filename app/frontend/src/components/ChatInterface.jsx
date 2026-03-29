// app/frontend/src/components/ChatInterface.jsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import CustomHeader from './Header';
import InputArea from './InputArea';
import ModelChatPane from './ModelChatPane';
import PaneResizer from './PaneResizer';
import { createChat, listChats, getChat, deleteChat, endSession } from './api';
import { useTheme } from './hooks/useTheme';
import { useChatState } from './hooks/useChatState';
import { useResizing } from './hooks/useResizing';
import { usePaneResizing } from './hooks/usePaneResizing';
import { useMessageHandling } from './hooks/useMessageHandling';
import { modelOptions, handleCopyToClipboard, resetTextareaHeight } from './utils/chatUtils';

const DEFAULT_MODEL = 'gemini-2.5-pro';
const MODE_INSTRUCTION_CONTENT =
  '# Usage Instructions\n\n' +
  '## Available Modes\n\n' +
  '### Default Mode\n' +
  'Type `start` to use standard functionality.\n\n' +
  '### Prompt Assistant Mode\n' +
  'Type `prompt assistant` or `start prompt assistant` for prompt creation help.\n\n' +
  '### Agent Assistant Mode\n' +
  'Type `agent assistant` or `start agent assistant` for advanced agent capabilities.\n' +
  'If the agent creates subtasks, type `generate prompts` to generate prompts.';

const createInstructionMessage = () => ({
  id: `local-mode-instruction-${Date.now()}-${Math.random()}`,
  type: 'assistant',
  content: MODE_INSTRUCTION_CONTENT,
  timestamp: new Date(),
  isStreaming: false,
  localOnly: true,
});

const ChatInterface = () => {
  const { isDarkMode, setIsDarkMode, theme } = useTheme();

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
    setStreamingMessageIds,
    copiedUserMsgId,
    setCopiedUserMsgId,
  } = useChatState();

  const { chatboxHeight, modelChatboxHeights, handleResizeStart } = useResizing();

  const { panelWidths, setPanelWidths, panesContainerRef } = usePaneResizing(selectedModels);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePane, setActivePane] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isChatListLoading, setIsChatListLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const messagesEndRefs = useRef({});
  const messagesContainerRefs = useRef({});
  const isAtBottomRef = useRef({});
  const textareaRef = useRef(null);
  const modelTextareaRefs = useRef({});
  const resizeRef = useRef(null);

  const scrollToBottom = (model) => {
    messagesEndRefs.current[model]?.scrollIntoView({ behavior: 'smooth' });
  };

  const shouldAutoScroll = (model) => {
    const atBottom = isAtBottomRef.current[model];
    return atBottom === undefined ? true : !!atBottom;
  };

  const refreshChatList = useCallback(async () => {
    try {
      const chats = await listChats();
      setChatList(chats);
    } catch (error) {
      console.error('Failed to refresh chat list:', error);
    }
  }, []);

  const loadChatSession = useCallback(async (chatId) => {
    if (!chatId) return;

    setIsChatLoading(true);
    try {
      const payload = await getChat(chatId);
      const resolvedChatId = payload?.chat?.id || chatId;
      const groupedMessages = {};
      const modelsInChat = new Set();

      (payload.messages || []).forEach((msg) => {
        if (msg.role !== 'user' && msg.role !== 'assistant') return;

        const prefix = `${resolvedChatId}_`;
        const derivedModel = msg.model || (msg.thread_id?.startsWith(prefix)
          ? msg.thread_id.slice(prefix.length)
          : null);
        const model = derivedModel || DEFAULT_MODEL;

        modelsInChat.add(model);
        if (!groupedMessages[model]) groupedMessages[model] = [];

        groupedMessages[model].push({
          id: `db-${msg.id}`,
          type: msg.role,
          content: msg.content,
          timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
          model,
          isStreaming: false,
        });
      });

      const resolvedModels = modelsInChat.size > 0
        ? Array.from(modelsInChat)
        : [DEFAULT_MODEL];

      resolvedModels.forEach((model) => {
        if (!groupedMessages[model]) groupedMessages[model] = [];
        if (groupedMessages[model].length === 0) {
          groupedMessages[model] = [createInstructionMessage()];
        }
      });

      setSelectedModels(resolvedModels);
      setModelMessages(groupedMessages);
      setModelInputValues(() => {
        const next = {};
        resolvedModels.forEach((model) => {
          next[model] = '';
        });
        return next;
      });
      setActivePane(resolvedModels[0] || null);
      setInputValue('');
      setActiveChatId(resolvedChatId);
    } catch (error) {
      console.error('Failed to load chat session:', error);
    } finally {
      setIsChatLoading(false);
    }
  }, [setInputValue, setModelInputValues, setModelMessages, setSelectedModels]);

  const createAndSelectNewChat = useCallback(async () => {
    const created = await createChat('New chat');
    const nextModels = selectedModels.length > 0 ? selectedModels : [DEFAULT_MODEL];
    const emptyMessages = {};
    nextModels.forEach((model) => {
      emptyMessages[model] = [createInstructionMessage()];
    });

    setActiveChatId(created.id);
    setSelectedModels(nextModels);
    setModelMessages(emptyMessages);
    setModelInputValues({});
    setInputValue('');
    setActivePane(nextModels[0] || null);
    await refreshChatList();
  }, [refreshChatList, selectedModels, setInputValue, setModelInputValues, setModelMessages, setSelectedModels]);

  useEffect(() => {
    let isCancelled = false;

    const bootstrap = async () => {
      setIsChatListLoading(true);
      try {
        const chats = await listChats();
        if (isCancelled) return;

        setChatList(chats);

        if (chats.length > 0) {
          await loadChatSession(chats[0].id);
          return;
        }

        const created = await createChat('New chat');
        if (isCancelled) return;

        setChatList([created]);
        setActiveChatId(created.id);
        setSelectedModels([DEFAULT_MODEL]);
        setModelMessages({ [DEFAULT_MODEL]: [createInstructionMessage()] });
        setActivePane(DEFAULT_MODEL);
      } catch (error) {
        console.error('Failed to initialize chats:', error);
      } finally {
        if (!isCancelled) {
          setIsChatListLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isCancelled = true;
    };
  }, [loadChatSession, setModelMessages, setSelectedModels]);

  useEffect(() => {
    selectedModels.forEach((model) => {
      if (shouldAutoScroll(model)) scrollToBottom(model);
    });
  }, [modelMessages, selectedModels]);

  const { sendToModel, streamingAbortControllerRefs } = useMessageHandling({
    chatId: activeChatId,
    setModelMessages,
    isLoading,
    setIsLoading,
    isStreaming,
    setIsStreaming,
    setStreamingMessageIds,
    shouldAutoScroll,
    scrollToBottom,
  });

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (!activeChatId) return;
      try {
        Object.values(streamingAbortControllerRefs.current).forEach((controller) => {
          if (controller) controller.abort();
        });
        await Promise.all(
          selectedModels.map((model) => endSession(`${activeChatId}_${model}`))
        );
      } catch {
        // Ignore on unload
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeChatId, selectedModels, streamingAbortControllerRefs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChatId) return;

    const currentInput = inputValue;
    setInputValue('');
    resetTextareaHeight(textareaRef, '30px');

    selectedModels.forEach((model) => {
      sendToModel(model, currentInput);
    });

    setTimeout(() => {
      refreshChatList();
    }, 350);
  };

  const handleModelSubmit = (e, model) => {
    e.preventDefault();
    const messageContent = modelInputValues[model]?.trim();
    if (!messageContent || !activeChatId) return;

    setModelInputValues((prev) => ({ ...prev, [model]: '' }));
    resetTextareaHeight(
      modelTextareaRefs.current[model] ? { current: modelTextareaRefs.current[model] } : null,
      '22px'
    );

    sendToModel(model, messageContent);
    setTimeout(() => {
      refreshChatList();
    }, 350);
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
      setIsStreaming((prev) => ({ ...prev, [model]: false }));
      setIsLoading((prev) => ({ ...prev, [model]: false }));
      setStreamingMessageIds((prev) => {
        const next = { ...prev };
        delete next[model];
        return next;
      });
    }
  };

  const handleModelInputChange = (e, model) => {
    setModelInputValues((prev) => ({ ...prev, [model]: e.target.value }));
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

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(chatId);
      const updatedChats = await listChats();
      setChatList(updatedChats);

      if (chatId !== activeChatId) return;

      if (updatedChats.length > 0) {
        await loadChatSession(updatedChats[0].id);
      } else {
        await createAndSelectNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const anyLoading = selectedModels.some((model) => isLoading[model] || isStreaming[model]);

  return (
    <div className={`flex h-screen ${theme.background} ${theme.textPrimary}`}>
      <Sidebar
        sidebarOpen={sidebarOpen}
        theme={theme}
        chats={chatList}
        activeChatId={activeChatId}
        onSelectChat={loadChatSession}
        onDeleteChat={handleDeleteChat}
        onNewChat={createAndSelectNewChat}
        isLoading={isChatListLoading || isChatLoading}
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
          isLoading={anyLoading || isChatLoading}
          chatboxHeight={chatboxHeight}
          resizeRef={resizeRef}
          handleResizeStart={handleResizeStart('global')}
          placeholder={activeChatId ? 'Message all selected models...' : 'Creating chat...'}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
