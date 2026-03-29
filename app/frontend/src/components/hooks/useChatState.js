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

  // Ensure state keys exist for all currently selected models
  useEffect(() => {
    setModelMessages(prev => {
      const next = { ...prev };
      selectedModels.forEach(model => {
        if (!next[model]) next[model] = [];
      });
      return next;
    });

    setModelInputValues(prev => {
      const next = { ...prev };
      selectedModels.forEach(model => {
        if (next[model] === undefined) next[model] = '';
      });
      return next;
    });
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