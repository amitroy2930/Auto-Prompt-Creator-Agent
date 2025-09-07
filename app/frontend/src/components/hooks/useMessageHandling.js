// app/frontend/src/components/hooks/useMessageHandling.js

import { useRef } from 'react';
import { sendMessageStream, endSession, startSession } from '../api';

export const useMessageHandling = ({
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
}) => {
  const streamingAbortControllerRefs = useRef({});

  const sendToModel = async (model, messageContent) => {
    const command = messageContent.trim().toLowerCase();
    const exitCommands = ['exit', 'quit', 'clear', 'end'];
    const startCommands = ['start', 'start prompt assistant', 'prompt assistant', 'start agent assistant', 'agent assistant'];

    if (startCommands.includes(command)) {
      const isPromptAssistant =
        command === 'start' ? null :
        (command === 'start prompt assistant' || command === 'prompt assistant') ? true :
        false;
      
      setIsLoading(prev => ({ ...prev, [model]: true }));

      try {
        await startSession(`${thread_id_1}_${model}`, model, isPromptAssistant);
        setModelMessages(prev => ({
          ...prev,
          [model]: [...(prev[model] || []), {
            id: Date.now() + Math.random(),
            type: 'assistant',
            content: `Session started. Mode: ${isPromptAssistant === null ? 'Default' : isPromptAssistant ? 'Prompt Assistant' : 'Agent Assistant'}.`,
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

  return {
    sendToModel,
    streamingAbortControllerRefs
  };
};