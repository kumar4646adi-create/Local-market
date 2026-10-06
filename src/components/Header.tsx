import React from 'react';
import { UserLocation } from '../types';

interface HeaderProps {
  userLocation: UserLocation;
  isGuest?: boolean;
  userDisplayName?: string;
  cartCount?: number;
  onOpenLocationModal: () => void;
  onOpenListShopModal: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenCart?: () => void;
  onOpenAuthModal?: () => void;
  unreadNotificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  userLocation,
  isGuest = true,
  userDisplayName,
  cartCount = 0,
  onOpenLocationModal,
  onOpenListShopModal,
  onOpenNotifications,
  onOpenProfile,
  onOpenCart,
  onOpenAuthModal,
  unreadNotificationsCount = 2,
}) => {
  return (
    <header className="sticky top-0 inset-x-0 z-40 bg-[#f8f9fa]/95 backdrop-blur-xl border-b border-[#edeeef]/80 pt-safe shadow-2xs">
      <div className="h-16 px-4 flex items-center justify-between max-w-4xl mx-auto w-full gap-2">
        {/* Brand Logo & Location Selector */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* LocalMarket Logo Badge */}
          <div className="w-9 h-9 rounded-xl bg-[#023616] text-[#bbefc1] flex items-center justify-center font-black shadow-xs shrink-0">
            <span className="material-symbols-outlined text-xl">storefront</span>
          </div>

          {/* Customer Location Selector */}
          <div 
            onClick={onOpenLocationModal}
            className="flex flex-col cursor-pointer group select-none text-left min-w-0"
            role="button"
            tabIndex={0}
            aria-label="Change location"
          >
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#023616] uppercase tracking-wider">
              <span>📍 Ghumarwin</span>
              {userLocation.source === 'gps' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" title="GPS active" />
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-xs sm:text-sm font-extrabold text-[#191c1d] group-hover:text-[#023616] transition-colors truncate max-w-[120px] sm:max-w-xs">
                {userLocation.area ? `${userLocation.area}` : userLocation.formattedAddress}
              </span>
              <span className="material-symbols-outlined text-[16px] text-[#717970] group-hover:translate-y-0.5 transition-transform shrink-0">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Action icons: List Shop, Cart, Notifications, Login / Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onOpenListShopModal}
            className="text-[11px] sm:text-xs font-bold bg-[#1e4d2b]/10 text-[#023616] px-2 py-1.5 rounded-lg hover:bg-[#1e4d2b]/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="List your shop in Ghumarwin"
          >
            <span className="material-symbols-outlined text-xs hidden sm:inline">storefront</span>
            <span>List Shop</span>
          </button>

          {/* Cart Icon in Header */}
          {onOpenCart && (
            <button
              onClick={onOpenCart}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#191c1d] hover:bg-[#edeeef] active:scale-95 transition-all relative cursor-pointer"
              aria-label="View cart"
              title="Cart"
            >
              <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#fd8b00] text-[#603100] text-[10px] font-black flex items-center justify-center ring-2 ring-[#f8f9fa]">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenNotifications}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#414941] hover:bg-[#edeeef] active:scale-95 transition-all relative cursor-pointer"
            aria-label="View notifications"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#fd8b00] ring-2 ring-[#f8f9fa]" />
            )}
          </button>

          {/* Login / Profile */}
          {isGuest ? (
            <button
              onClick={onOpenAuthModal || onOpenProfile}
              className="bg-[#023616] hover:bg-[#1e4d2b] active:scale-95 text-white px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
              title="Log In / Sign Up"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              <span className="hidden sm:inline">Log In</span>
            </button>
          ) : (
            <button
              onClick={onOpenProfile}
              className="w-9 h-9 rounded-full bg-[#023616] hover:bg-[#1e4d2b] text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs transition-all ring-1 ring-white"
              aria-label="View profile"
              title={userDisplayName || 'Account'}
            >
              {userDisplayName ? userDisplayName.slice(0, 1).toUpperCase() : (
                <span className="material-symbols-outlined text-[18px]">person</span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
