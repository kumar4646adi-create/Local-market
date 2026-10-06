import React, { useState } from 'react';
import { BANNER_PROMO_IMAGE } from '../data/mockData';

interface SmartPickupBannerProps {
  onTrySmartPickup: () => void;
}

export const SmartPickupBanner: React.FC<SmartPickupBannerProps> = ({ onTrySmartPickup }) => {
  const [imageLoaded, setImageLoaded] = useState(true);

  return (
    <div className="bg-[#f3f4f5] rounded-2xl p-4 mb-6 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-center gap-4 border border-[#edeeef]/80">
      {/* Promotional Image slot */}
      <div className="w-full sm:w-1/3 h-36 sm:h-32 rounded-xl bg-cover bg-center flex-shrink-0 relative overflow-hidden bg-[#e1e3e4]">
        {imageLoaded ? (
          <img
            src={BANNER_PROMO_IMAGE}
            alt="A warm, inviting storefront in a Himalayan town market with wooden accents, fresh organic apples in wicker baskets, and a cheerful shopkeeper arranging goods under the afternoon sun."
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
            onError={() => setImageLoaded(false)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-[#1e4d2b] to-[#023616] flex items-center justify-center p-3 text-white">
            <span className="material-symbols-outlined text-4xl text-[#fd8b00]">bolt</span>
          </div>
        )}
      </div>

      {/* Copy and CTA */}
      <div className="flex flex-col flex-1 w-full text-left">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="material-symbols-outlined text-[#904d00] text-sm"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            bolt
          </span>
          <span className="text-[11px] font-bold text-[#904d00] uppercase tracking-wider">
            Smart Pickup
          </span>
        </div>

        <h3 className="text-base font-bold text-[#191c1d] mb-1 tracking-tight">
          Order Before You Arrive
        </h3>

        <p className="text-xs text-[#414941] mb-3 leading-relaxed">
          Skip the queue entirely. Your order is packed and waiting at the counter the moment you walk in.
        </p>

        <button
          onClick={onTrySmartPickup}
          className="self-start bg-[#023616] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#1e4d2b] active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          <span>Try Smart Pickup</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
};
