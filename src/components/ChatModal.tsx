import React, { useState, useEffect, useRef } from 'react';
import { Store, ChatMessage } from '../types';

interface ChatModalProps {
  store: Store;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (storeId: string, text: string) => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  store,
  onClose,
  messages,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Is fresh stock available right now?',
    'Can I pick up in 15 minutes?',
    'Please pack neatly for Smart Pickup',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    onSendMessage(store.id, text.trim());
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg h-[92vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-3.5 bg-[#023616] text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/10 active:scale-95 text-white transition-all cursor-pointer"
              aria-label="Back to store"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>

            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 shrink-0 border border-white/20">
              <img
                src={store.image}
                alt={store.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-sm text-white truncate max-w-[200px]">
                {store.name}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-[#bbefc1]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online · Verified Merchant</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <a
              href={`tel:${store.phone}`}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
              title="Call store"
            >
              <span className="material-symbols-outlined text-base">call</span>
            </a>
          </div>
        </div>

        {/* Security / local assurance banner */}
        <div className="bg-[#bbefc1]/25 px-4 py-1.5 border-b border-[#bbefc1]/40 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#00210b]">
          <span className="material-symbols-outlined text-xs">verified_user</span>
          <span>Direct chat with shop owner in Bharari Bazaar</span>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8f9fa]">
          {messages.map((msg) => {
            const isMe = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium shadow-2xs leading-relaxed ${
                    isMe
                      ? 'bg-[#023616] text-white rounded-br-xs'
                      : 'bg-white text-[#191c1d] border border-[#edeeef] rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-[#717970] mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt chips */}
        <div className="px-3 py-2 bg-white border-t border-[#edeeef] flex gap-2 overflow-x-auto no-scrollbar">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="text-[11px] font-semibold bg-[#f3f4f5] hover:bg-[#edeeef] text-[#191c1d] px-2.5 py-1.5 rounded-full whitespace-nowrap border border-[#edeeef] transition-colors cursor-pointer shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-3 bg-white border-t border-[#edeeef] flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
            placeholder="Type your message to shopkeeper..."
            className="flex-1 bg-[#f3f4f5] border border-transparent focus:border-[#023616]/40 focus:bg-white text-xs sm:text-sm text-[#191c1d] px-3.5 py-2.5 rounded-xl focus:outline-none transition-all"
          />
          <button
            onClick={() => handleSend(inputText)}
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-xl bg-[#023616] hover:bg-[#1e4d2b] active:scale-95 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
            aria-label="Send message"
          >
            <span className="material-symbols-outlined text-base">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
