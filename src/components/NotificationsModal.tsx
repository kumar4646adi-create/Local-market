import React from 'react';
import { NotificationItem } from '../types';

interface NotificationsModalProps {
  notifications: NotificationItem[];
  onClose: () => void;
  onClearAll: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onClose,
  onClearAll,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-300"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 border-b border-[#edeeef] flex justify-between items-center bg-[#f8f9fa]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#023616] text-xl">notifications</span>
            <h3 className="font-extrabold text-base text-[#191c1d]">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-[#717970] hover:text-[#023616] font-semibold cursor-pointer"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#edeeef] hover:bg-[#e7e8e9] flex items-center justify-center text-[#414941] cursor-pointer"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-[#717970]">
              <span className="material-symbols-outlined text-4xl text-[#c1c9be] mb-2">
                notifications_off
              </span>
              <p className="text-xs font-semibold">No new notifications</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="p-3 rounded-xl bg-white border border-[#edeeef] hover:border-[#1e4d2b]/30 transition-all shadow-2xs text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#191c1d] flex items-center gap-1.5">
                    {n.type === 'order' && (
                      <span className="material-symbols-outlined text-sm text-[#023616]">bolt</span>
                    )}
                    {n.type === 'discount' && (
                      <span className="material-symbols-outlined text-sm text-[#fd8b00]">local_offer</span>
                    )}
                    <span>{n.title}</span>
                  </h4>
                  <span className="text-[10px] text-[#717970] whitespace-nowrap">{n.time}</span>
                </div>
                <p className="text-xs text-[#414941] mt-1 leading-relaxed">{n.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
