import React, { useState } from 'react';
import { Store, UserLocation } from '../types';
import { calculateDistanceKm, formatDistance, getGoogleMapsDirectionsUrl } from '../utils/geo';

interface StoreCardProps {
  store: Store;
  userLocation: UserLocation;
  isFavorite?: boolean;
  onToggleFavorite?: (store: Store) => void;
  onViewStore: (store: Store) => void;
  onMessageStore: (store: Store) => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  userLocation,
  isFavorite = false,
  onToggleFavorite,
  onViewStore,
  onMessageStore,
}) => {
  const [imageError, setImageError] = useState(false);

  // Calculate actual distance from customer's current coordinates
  const realDistanceKm = calculateDistanceKm(
    userLocation.latitude,
    userLocation.longitude,
    store.latitude,
    store.longitude
  );

  const directionsUrl = getGoogleMapsDirectionsUrl(
    userLocation.latitude,
    userLocation.longitude,
    store.latitude,
    store.longitude
  );

  const ratingCount = store.totalRatings ?? store.reviewsCount ?? 0;
  const displayRating = store.averageRating ?? store.rating;
  const hasRatings = ratingCount > 0 && displayRating > 0;

  return (
    <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm hover:shadow-md transition-all border border-[#edeeef]/90 text-left relative">
      <div className="flex gap-3.5 items-start">
        {/* Store Thumbnail */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#e1e3e4] shrink-0 relative shadow-inner">
          {!imageError ? (
            <img
              src={store.image}
              alt={store.altText || store.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-[#1e4d2b]/10 flex items-center justify-center text-[#023616]">
              <span className="material-symbols-outlined text-3xl">storefront</span>
            </div>
          )}
        </div>

        {/* Store Details */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex justify-between items-start gap-1">
            <h3 
              onClick={() => onViewStore(store)}
              className="font-bold text-[15px] text-[#191c1d] truncate cursor-pointer hover:text-[#023616] transition-colors"
            >
              {store.name}
            </h3>

            <div className="flex items-center gap-1.5 shrink-0">
              {hasRatings ? (
                <div className="flex items-center bg-[#bbefc1]/40 text-[#00210b] px-2 py-0.5 rounded-full text-xs font-bold shrink-0">
                  <span
                    className="material-symbols-outlined text-[13px] mr-0.5 text-[#00210b]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <span>{displayRating.toFixed(1)}</span>
                  <span className="text-[10px] text-[#414941] ml-0.5 font-normal">
                    ({ratingCount})
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-[#717970] font-semibold bg-[#f3f4f5] px-2 py-0.5 rounded-full">
                  No ratings yet
                </span>
              )}

              {/* Favorite / Heart Button */}
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(store);
                  }}
                  className="w-7 h-7 rounded-full bg-[#f8f9fa] hover:bg-red-50 flex items-center justify-center transition-all cursor-pointer border border-[#edeeef]"
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  title={isFavorite ? 'Remove from favorite stores' : 'Add to favorite stores'}
                >
                  <span
                    className={`material-symbols-outlined text-base transition-colors ${
                      isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                    }`}
                    style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </span>
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-[#414941] truncate mb-1.5 font-medium">
            {store.subcategories}
          </p>

          {/* Real Distance & Status (Requirement 5) */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#414941] mb-1">
            <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#023616]">
              <span className="material-symbols-outlined text-xs text-[#023616]">near_me</span>
              📍 {formatDistance(realDistanceKm)}
            </span>

            <span className="w-1 h-1 rounded-full bg-[#c1c9be]" />

            <span className="text-[#023616] font-bold text-[11px] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#023616] inline-block" />
              {store.isOpen ? 'Open Now' : 'Closed'}
            </span>

            {store.smartPickup && (
              <>
                <span className="w-1 h-1 rounded-full bg-[#c1c9be]" />
                <span className="bg-[#ffdcc3] text-[#2f1500] text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-tight">
                  Smart Pickup
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions (Requirement 6 & 7) */}
      <div className="flex gap-2 pt-3 mt-3 border-t border-[#edeeef]">
        <button
          onClick={() => onViewStore(store)}
          className="flex-1 bg-[#edeeef] hover:bg-[#e7e8e9] active:scale-98 text-[#191c1d] py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">storefront</span>
          <span>View Store</span>
        </button>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white hover:bg-[#f8f9fa] border border-[#c1c9be] text-[#023616] px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
          title="Open Google Maps Directions"
        >
          <span className="material-symbols-outlined text-base font-bold text-[#fd8b00]">directions</span>
          <span className="hidden sm:inline">Directions</span>
        </a>

        <button
          onClick={() => onMessageStore(store)}
          className="flex-1 bg-[#023616] hover:bg-[#1e4d2b] active:scale-98 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm"
        >
          <span
            className="material-symbols-outlined text-base"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            chat
          </span>
          <span>Message</span>
        </button>
      </div>
    </div>
  );
};
