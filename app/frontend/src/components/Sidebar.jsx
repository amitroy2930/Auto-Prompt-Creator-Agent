import React from 'react';

const Sidebar = ({ sidebarOpen, theme, sampleConversations, modelOptions, selectedModel, setSelectedModel }) => (
  <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ${theme.panel} border-r ${theme.border} flex flex-col overflow-hidden`}>
    <div className={`p-4 border-b ${theme.border}`}>
      <button className={`w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br ${theme.accent} transition-all duration-200 shadow-lg text-white`}>
        New chat
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-2">
        {sampleConversations.map((conv, index) => (
          <div key={index} className={`flex items-center gap-3 p-3 rounded-xl ${theme.card} cursor-pointer transition-all duration-200 group`}>
            <span className={`text-sm truncate ${theme.textSecondary} group-hover:${theme.textPrimary}`}>{conv}</span>
          </div>
        ))}
      </div>
    </div>
    <div className={`p-4 border-t ${theme.border} space-y-2`}>
      <div className={`w-full flex items-center gap-3 p-3 rounded-xl ${theme.card} transition-all duration-200 group`}>
        Settings
      </div>
      <div className={`w-full flex items-center gap-3 p-3 rounded-xl ${theme.card} transition-all duration-200 group`}>
        Help & FAQ
      </div>
    </div>
  </div>
);

export default Sidebar;
