// src/components/Header.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react';

/**
 * A responsive header component for a web application.
 * It includes a toggle for a sidebar, a title, a multi-select dropdown
 * for different models, and a theme toggle for dark/light mode.
 * @param {object} props - The component props.
 * @param {object} props.theme - An object containing Tailwind CSS classes for the current theme (e.g., panel, border, textPrimary).
 * @param {boolean} props.isDarkMode - A boolean indicating if the dark mode is currently active.
 * @param {function} props.setIsDarkMode - A function to toggle the dark mode state.
 * @param {boolean} props.sidebarOpen - A boolean indicating if the sidebar is currently open.
 * @param {function} props.setSidebarOpen - A function to toggle the sidebar state.
 * @param {Array<object>} props.modelOptions - An array of model objects with 'value' and 'label' properties.
 * @param {Array<string>} props.selectedModels - An array of strings representing the currently selected model values.
 * @param {function} props.setSelectedModels - A function to update the selected models array.
 */
const Header = ({
  theme,
  isDarkMode,
  setIsDarkMode,
  sidebarOpen,
  setSidebarOpen,
  modelOptions,
  selectedModels,
  setSelectedModels
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleModelToggle = (modelValue) => {
    const isSelected = selectedModels.includes(modelValue);
    let newSelectedModels;

    if (isSelected) {
      newSelectedModels = selectedModels.filter((model) => model !== modelValue);
    } else {
      newSelectedModels = [...selectedModels, modelValue];
    }
    setSelectedModels(newSelectedModels);
  };

  useEffect(() => {
    // Function to handle clicks outside the dropdown
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  return (
    <div className={`flex items-center justify-between px-6 py-3 border-b ${theme.border} ${theme.panel}`}>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`p-2 rounded-lg ${theme.card} transition-all duration-200 ${theme.textPrimary}`}
        >
          <Menu size={18} />
        </button>
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Prompt Assistant
        </h1>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border ${theme.surface} ${theme.border} ${theme.textPrimary}`}
          >
            <span>
              {selectedModels.length === 1
                ? modelOptions.find((opt) => opt.value === selectedModels[0])?.label
                : `${selectedModels.length} models selected`}
            </span>
          </button>

          {dropdownOpen && (
            <div className={`absolute right-0 top-full mt-2 w-64 ${theme.card} ${theme.border} border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto`}>
              <div className="p-3 border-b border-gray-700">
                <div className="text-sm font-medium text-gray-300">Select Models</div>
                <div className="text-xs text-gray-500 mt-1">{selectedModels.length} selected</div>
              </div>
              {modelOptions.map((option) => (
                <div key={option.value} className="p-1">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(option.value)}
                      onChange={() => handleModelToggle(option.value)}
                      className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm">{option.label}</span>
                    {selectedModels.includes(option.value) && selectedModels.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleModelToggle(option.value);
                        }}
                        className="ml-auto p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                        title="Remove model"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                </div>
              ))}
              <div className="p-3 border-t border-gray-700">
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white text-sm transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className={`p-2 rounded-lg ${theme.card} transition-all duration-200 ${theme.textSecondary}`}
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
};

export default Header;
