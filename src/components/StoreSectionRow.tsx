import React from 'react';
import { Store, UserLocation } from '../types';
import { calculateDistanceKm, formatDistance } from '../utils/geo';

interface StoreSectionRowProps {
  title: string;
  subtitle?: string;
  icon?: string;
  stores: Store[];
  userLocation: UserLocation;
  favoriteStoreIds: Set<string>;
  onSelectStore: (store: Store) => void;
  onToggleFavorite: (store: Store) => void;
  onSeeAll?: () => void;
}

export const StoreSectionRow: React.FC<StoreSectionRowProps> = ({
  title,
  subtitle,
  icon,
  stores,
  userLocation,
  favoriteStoreIds,
  onSelectStore,
  onToggleFavorite,
  onSeeAll,
}) => {
  if (stores.length === 0) return null;

  return (
    <div className="mb-6 text-left">
      <div className="flex justify-between items-baseline mb-2.5">
        <div>
          <h3 className="text-base font-extrabold text-[#191c1d] tracking-tight flex items-center gap-1.5">
            {icon && (
              <span className="material-symbols-outlined text-base text-[#023616]">
                {icon}
              </span>
            )}
            <span>{title}</span>
          </h3>
          {subtitle && <p className="text-[11px] text-[#717970] mt-0.5">{subtitle}</p>}
        </div>

        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-xs font-bold text-[#023616] hover:underline cursor-pointer"
          >
            See all
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1.5 -mx-1 px-1">
        {stores.map((store) => {
          const distanceKm = calculateDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            store.latitude,
            store.longitude
          );
          const isFav = favoriteStoreIds.has(store.id);
          const ratingCount = store.totalRatings ?? store.reviewsCount ?? 0;
          const displayRating = store.averageRating ?? store.rating;
          const hasRatings = ratingCount > 0 && displayRating > 0;

          return (
            <div
              key={store.id}
              onClick={() => onSelectStore(store)}
              className="w-48 shrink-0 bg-white rounded-2xl border border-[#edeeef] hover:border-[#023616]/40 shadow-2xs hover:shadow-sm p-3 flex flex-col justify-between cursor-pointer transition-all group text-left relative"
            >
              <div>
                {/* Store Thumbnail with Favorite Button */}
                <div className="w-full h-28 rounded-xl overflow-hidden bg-[#e1e3e4] relative mb-2.5">
                  <img
                    src={store.image}
                    alt={store.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Favorite Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(store);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white backdrop-blur-xs flex items-center justify-center shadow-xs transition-all cursor-pointer"
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <span
                      className={`material-symbols-outlined text-sm ${
                        isFav ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                      }`}
                      style={{ fontVariationSettings: isFav ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      favorite
                    </span>
                  </button>

                  {store.smartPickup && (
                    <span className="absolute bottom-2 left-2 bg-[#fd8b00] text-[#603100] text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-2xs">
                      ⚡ Smart Pickup
                    </span>
                  )}
                </div>

                {/* Store Details */}
                <h4 className="font-extrabold text-xs text-[#191c1d] truncate group-hover:text-[#023616] transition-colors">
                  {store.name}
                </h4>

                <p className="text-[10px] text-[#717970] truncate mt-0.5">
                  {store.category} · {store.area}
                </p>
              </div>

              {/* Bottom Meta */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#edeeef]/60 text-[10px]">
                <span className="font-bold text-[#023616]">
                  📍 {formatDistance(distanceKm)}
                </span>

                {hasRatings ? (
                  <span className="flex items-center gap-0.5 font-bold text-[#00210b] bg-[#bbefc1]/40 px-1.5 py-0.2 rounded">
                    <span
                      className="material-symbols-outlined text-[11px] text-amber-500"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span>{displayRating.toFixed(1)}</span>
                  </span>
                ) : (
                  <span className="text-[#717970]">No ratings yet</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
