// app/frontend/src/components/api.js

const API_BASE_URL = 'http://localhost:8001';

export const startSession = async (threadId, modelKey, isPromptAssistant) => {
  const response = await fetch(`${API_BASE_URL}/api/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      thread_id: threadId,
      is_first_turn: isPromptAssistant,
      llm_name: modelKey
    }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};

export const sendMessage = async (message, threadId) => {
  const response = await fetch(`${API_BASE_URL}/api/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: message,
      thread_id: threadId
    }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  // Check if response is streaming (event-stream)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/event-stream')) {
    return response; // Return the response object for streaming
  } else {
    return await response.json(); // Return JSON for non-streaming
  }
};

export const sendMessageStream = async (message, threadId, onChunk, onComplete, onError) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        thread_id: threadId
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Check if response is streaming
    const contentType = response.headers.get('content-type');
    console.log('Response content type:', contentType);
    
    if (contentType && contentType.includes('text/event-stream')) {
      console.log('Processing streaming response...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      try {
        let chunkCount = 0;
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // console.log(`Stream completed after ${chunkCount} chunks`);
            onComplete();
            break;
          }
          
          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          chunkCount++;
          
          console.log(`Chunk ${chunkCount}:`, JSON.stringify(chunk)); // Better logging
          
          // Send each chunk directly to the UI (even if empty, for debugging)
          if (chunk !== undefined && chunk !== null) {
            onChunk(chunk);
          }
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // Handle non-streaming response
      console.log('Processing non-streaming response...');
      const data = await response.json();
      const content = data.message || data.response || data.content || 'No response received';
      console.log('Non-streaming content:', content);
      onChunk(content);
      onComplete();
    }
  } catch (error) {
    console.error('Streaming error:', error);
    onError(error);
  }
};

export const endSession = async (threadId) => {
  const response = await fetch(`${API_BASE_URL}/api/end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      thread_id: threadId
    }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
};