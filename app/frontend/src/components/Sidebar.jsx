import React from 'react';
import { Plus, Trash2, MessageSquare } from 'lucide-react';

const formatPreview = (chat) => {
  if (chat.preview && chat.preview.trim()) return chat.preview;
  return 'No messages yet';
};

const Sidebar = ({
  sidebarOpen,
  theme,
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  isLoading,
}) => (
  <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 ${theme.panel} border-r ${theme.border} flex flex-col overflow-hidden`}>
    <div className={`p-4 border-b ${theme.border}`}>
      <button
        onClick={onNewChat}
        className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-br ${theme.accent} transition-all duration-200 shadow-lg text-white`}
      >
        <Plus size={16} />
        New chat
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-3">
      {isLoading ? (
        <div className={`p-3 text-sm ${theme.textSecondary}`}>Loading chats...</div>
      ) : chats.length === 0 ? (
        <div className={`p-3 text-sm ${theme.textSecondary}`}>No chat history yet.</div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                className={`group rounded-xl border ${isActive ? 'border-emerald-500/60' : theme.border} ${theme.card} transition-all duration-200`}
              >
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className="w-full text-left p-3"
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare size={15} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium truncate ${theme.textPrimary}`}>
                        {chat.title || 'New chat'}
                      </div>
                      <div className={`text-xs mt-1 truncate ${theme.textSecondary}`}>
                        {formatPreview(chat)}
                      </div>
                    </div>
                  </div>
                </button>
                <div className="px-3 pb-2 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

export default Sidebar;
