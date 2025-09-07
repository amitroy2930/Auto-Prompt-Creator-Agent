// app/frontend/src/components/hooks/usePaneResizing.js

import { useState, useEffect, useRef } from 'react';

export const usePaneResizing = (selectedModels) => {
  const [panelWidths, setPanelWidths] = useState([]);
  const panesContainerRef = useRef(null);

  // Initialize equal widths when selection changes
  useEffect(() => {
    const count = selectedModels.length || 1;
    const equal = Array(count).fill(100 / count);
    setPanelWidths(equal);
  }, [selectedModels]);

  return {
    panelWidths,
    setPanelWidths,
    panesContainerRef
  };
};