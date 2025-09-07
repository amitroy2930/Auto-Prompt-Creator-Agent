// app/frontend/src/components/PaneResizer.jsx

import React, { useRef } from 'react';

const PaneResizer = ({ 
  index, 
  selectedModels, 
  panelWidths, 
  setPanelWidths, 
  panesContainerRef, 
  theme 
}) => {
  const isDraggingRef = useRef(false);
  const dragIndexRef = useRef(null);
  const startXRef = useRef(0);
  const startWidthsRef = useRef([]);

  const handleMouseDown = (e) => {
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
  };

  return (
    <div
      onMouseDown={handleMouseDown}
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
  );
};

export default PaneResizer;