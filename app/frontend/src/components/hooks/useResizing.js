// app/frontend/src/components/hooks/useResizing.js

import { useState, useEffect } from 'react';

export const useResizing = () => {
  const [chatboxHeight, setChatboxHeight] = useState(30);
  const [modelChatboxHeights, setModelChatboxHeights] = useState({});
  const [isResizing, setIsResizing] = useState(false);
  const [resizingKey, setResizingKey] = useState(null);

  // Handle resizing functionality
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
  }, [isResizing, resizingKey]);

  const handleResizeStart = (key) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizingKey(key);
  };

  return {
    chatboxHeight,
    setChatboxHeight,
    modelChatboxHeights,
    setModelChatboxHeights,
    isResizing,
    setIsResizing,
    resizingKey,
    setResizingKey,
    handleResizeStart
  };
};