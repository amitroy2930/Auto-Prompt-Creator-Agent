// app/frontend/src/components/hooks/useChatState.js

import { useState, useEffect } from 'react';

export const useChatState = () => {
  const [selectedModels, setSelectedModels] = useState(['gemini-2.5-pro']);
  const [modelMessages, setModelMessages] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [modelInputValues, setModelInputValues] = useState({});
  const [isLoading, setIsLoading] = useState({});
  const [isStreaming, setIsStreaming] = useState({});
  const [streamingMessageIds, setStreamingMessageIds] = useState({});
  const [copiedUserMsgId, setCopiedUserMsgId] = useState(null);

  // Initialize messages and input values for each selected model
  useEffect(() => {
    const initialMessage = {
      id: 1,
      type: 'assistant',
      content: "To use me in default mode, type **`start`**.\n\nTo use me as a prompt assistant, type **`prompt assistant`** or **`start prompt assistant`**.\n\nTo use me as an agent assistant, type **`agent assistant`** or **`start agent assistant`**.",
      timestamp: new Date()
    };

    const newModelMessages = {};
    const newModelInputValues = {};
    
    selectedModels.forEach(model => {
      if (!modelMessages[model]) {
        newModelMessages[model] = [initialMessage];
      } else {
        newModelMessages[model] = modelMessages[model];
      }
      if (!modelInputValues[model]) {
        newModelInputValues[model] = '';
      }
    });

    setModelMessages(newModelMessages);
    setModelInputValues(prev => ({ ...prev, ...newModelInputValues }));
  }, [selectedModels]);

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

  return {
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
  };
};