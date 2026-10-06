import React from 'react';
import { ChatConversation, Store } from '../types';

interface MessagesScreenProps {
  conversations: ChatConversation[];
  stores: Store[];
  onOpenChatWithStore: (store: Store) => void;
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({
  conversations,
  stores,
  onOpenChatWithStore,
}) => {
  return (
    <div className="pb-24 pt-3 text-left">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-[#191c1d] tracking-tight">
          Merchant Messages
        </h1>
        <p className="text-xs text-[#717970] mt-0.5">
          Ask questions about stock, timings, or custom pickup orders
        </p>
      </div>

      <div className="space-y-2.5">
        {conversations.map((conv) => {
          const store: Store = stores.find((s) => s.id === conv.storeId) || {
            id: conv.storeId,
            name: conv.storeName,
            storeName: conv.storeName,
            image: conv.storeImage,
            category: 'Grocery' as const,
            subcategories: 'Local Store',
            rating: 4.8,
            reviewsCount: 50,
            distanceKm: 0.8,
            isOpen: true,
            smartPickup: true,
            altText: conv.storeName,
            description: '',
            address: 'Ghumarwin, HP',
            area: 'Bharari Bazaar',
            city: 'Ghumarwin',
            district: 'Bilaspur',
            state: 'Himachal Pradesh',
            latitude: 31.4428,
            longitude: 76.7153,
            location: {
              latitude: 31.4428,
              longitude: 76.7153,
            },
            locationConfirmed: true,
            timing: '8:00 AM - 9:00 PM',
            phone: '+91 98160 00000',
            products: [],
            locationArea: 'Bharari Bazaar',
          };

          return (
            <div
              key={conv.storeId}
              onClick={() => onOpenChatWithStore(store)}
              className="bg-white rounded-2xl p-3.5 border border-[#edeeef] hover:border-[#023616]/40 transition-all shadow-xs cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="relative shrink-0">
                  <img
                    src={conv.storeImage}
                    alt={conv.storeName}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border border-[#edeeef]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {conv.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-[#191c1d] group-hover:text-[#023616] transition-colors truncate">
                      {conv.storeName}
                    </h3>
                  </div>

                  <p className="text-xs text-[#717970] truncate mt-0.5 font-medium max-w-[220px] sm:max-w-md">
                    {conv.lastMessage}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                <span className="text-[10px] text-[#717970] font-medium">
                  {conv.lastMessageTime}
                </span>

                {conv.unreadCount > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-[#023616] text-white text-[10px] font-extrabold flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-sm text-[#c1c9be]">
                    chevron_right
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Local Merchant Contact Tip */}
      <div className="mt-6 p-4 rounded-2xl bg-[#bbefc1]/20 border border-[#bbefc1]/50 text-xs text-[#00210b]">
        <div className="font-bold flex items-center gap-1.5 mb-1">
          <span className="material-symbols-outlined text-sm text-[#904d00]">storefront</span>
          <span>Hyperlocal Support Guarantee</span>
        </div>
        <p className="leading-relaxed text-[#21502e]">
          Every merchant on LocalMarket is a verified physical shop in Ghumarwin. Response times during business hours are typically under 5 minutes.
        </p>
      </div>
    </div>
  );
};
