import React from 'react';

interface HeroBannerProps {
  onExploreClick: () => void;
  onPickupClick: () => void;
  isPickupFilterActive?: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreClick,
  onPickupClick,
  isPickupFilterActive,
}) => {
  return (
    <div className="relative w-full bg-[#1e4d2b] text-[#8bbd92] rounded-2xl p-5 sm:p-6 mb-6 overflow-hidden shadow-md">
      {/* Background glow circle */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-[#023616]/40 blur-2xl pointer-events-none" />

      {/* Storefront watermark icon */}
      <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 opacity-25 pointer-events-none select-none">
        <span className="material-symbols-outlined text-[100px] sm:text-[130px] text-white">
          storefront
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-start max-w-[85%] sm:max-w-[75%]">
        <span className="bg-[#fd8b00] text-[#603100] text-[11px] font-bold px-2.5 py-1 rounded-full mb-2 uppercase tracking-wider inline-block">
          Local Advantage
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 leading-tight tracking-tight">
          Shop Local.
          <br />
          Get It Your Way.
        </h1>

        <p className="text-xs sm:text-sm text-[#8bbd92] mb-4 opacity-95 leading-relaxed font-medium">
          Support your favorite Ghumarwin merchants with instant home delivery or ultra-fast curbside pickup.
        </p>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onExploreClick}
            className="bg-[#fd8b00] text-[#603100] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Explore Nearby Shops</span>
            <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
          </button>

          <button
            onClick={onPickupClick}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer backdrop-blur-md flex items-center gap-1.5 ${
              isPickupFilterActive
                ? 'bg-white text-[#023616] font-bold shadow-sm'
                : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
            }`}
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>{isPickupFilterActive ? 'Showing Pickup Only ✓' : 'Order for Pickup'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
