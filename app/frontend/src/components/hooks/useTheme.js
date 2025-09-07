// app/frontend/src/components/hooks/useTheme.js

import { useState } from 'react';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const themeClasses = {
    dark: {
      background: "bg-[#0d1117]",
      panel: "bg-[#010409]",
      card: "bg-[#161b22]",
      surface: "bg-[#0d1117]",
      textPrimary: "text-gray-100",
      textSecondary: "text-gray-300",
      muted: "text-gray-400",
      border: "border-gray-800",
      accent: "from-emerald-500 to-teal-500"
    },
    light: {
        background: "bg-[#F4F3EE]",     // soft, elegant background
        panel: "bg-white",              // clean white panels
        card: "bg-white",               // cards match panel
        surface: "bg-[#F4F3EE]",        // consistent with background
        textPrimary: "text-gray-900",   // strong contrast
        textSecondary: "text-gray-700", // balanced readability
        muted: "text-[#B1ADA1]",        // custom muted tone from palette
        border: "border-gray-200",      // subtle borders
        accent: "from-[#C15F3C] to-[#B1ADA1]" // warm gradient using palette
    }
  };

  const theme = isDarkMode ? themeClasses.dark : themeClasses.light;

  return {
    isDarkMode,
    setIsDarkMode,
    theme
  };
};