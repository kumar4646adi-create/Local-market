import React from 'react';

export type TabType = 'home' | 'explore' | 'orders' | 'messages' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  activeOrdersCount?: number;
  unreadMessagesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  activeOrdersCount = 1,
  unreadMessagesCount = 1,
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: 'home' },
    { id: 'explore' as TabType, label: 'Explore', icon: 'explore' },
    { 
      id: 'orders' as TabType, 
      label: 'Orders', 
      icon: 'receipt_long',
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
    },
    { 
      id: 'messages' as TabType, 
      label: 'Messages', 
      icon: 'chat',
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { id: 'profile' as TabType, label: 'Profile', icon: 'person' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-[#f8f9fa]/95 backdrop-blur-xl border-t border-[#edeeef] shadow-lg">
      <div className="flex justify-around items-center h-16 max-w-4xl mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-all cursor-pointer relative ${
                isActive
                  ? 'text-[#023616] font-bold'
                  : 'text-[#414941] hover:text-[#191c1d] font-medium'
              }`}
            >
              <div className="relative">
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : { fontVariationSettings: "'FILL' 0" }}
                >
                  {tab.icon}
                </span>

                {tab.badge && (
                  <span className="absolute -top-1 -right-2 bg-[#fd8b00] text-[#603100] text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] tracking-tight leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
