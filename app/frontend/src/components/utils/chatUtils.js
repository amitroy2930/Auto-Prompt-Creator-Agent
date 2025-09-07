// app/frontend/src/components/utils/chatUtils.js

export const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
};

export const handleCopyToClipboard = async (content, onSuccess, onError) => {
  try {
    await navigator.clipboard.writeText(content);
    onSuccess?.();
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      onSuccess?.();
    } catch (fallbackErr) {
      onError?.(fallbackErr);
    }
    document.body.removeChild(textArea);
  }
};

// Enhanced copy function specifically for code blocks
export const copyCodeToClipboard = async (code, onSuccess, onError) => {
  // Clean the code by removing any extra whitespace or formatting
  const cleanCode = code.trim();
  
  try {
    await navigator.clipboard.writeText(cleanCode);
    onSuccess?.();
  } catch (err) {
    // Fallback method
    const textArea = document.createElement('textarea');
    textArea.value = cleanCode;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        onSuccess?.();
      } else {
        onError?.(new Error('Copy command failed'));
      }
    } catch (fallbackErr) {
      onError?.(fallbackErr);
    }
    
    document.body.removeChild(textArea);
  }
};

export const resetTextareaHeight = (textareaRef, height = '30px') => {
  if (textareaRef?.current) {
    textareaRef.current.style.height = height;
  }
};

export const modelOptions = [
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

export const sampleConversations = [
  "Explain quantum computing",
  "Write a Python script",
  "Plan a weekend trip",
  "Brainstorm business ideas",
  "Help with math homework"
];
