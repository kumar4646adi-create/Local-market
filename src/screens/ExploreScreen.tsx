import React, { useState, useMemo } from 'react';
import { Store, CategoryType, UserLocation } from '../types';
import { GoogleMapView } from '../components/GoogleMapView';
import { calculateDistanceKm, formatDistance, getGoogleMapsDirectionsUrl } from '../utils/geo';

interface ExploreScreenProps {
  stores: Store[];
  userLocation: UserLocation;
  favoriteStoreIds?: Set<string>;
  onToggleFavorite?: (store: Store) => void;
  onViewStore: (store: Store) => void;
  onMessageStore: (store: Store) => void;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  stores,
  userLocation,
  favoriteStoreIds = new Set(),
  onToggleFavorite,
  onViewStore,
  onMessageStore,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [distanceRadiusKm, setDistanceRadiusKm] = useState<number>(5); // 1km, 3km, 5km, or 999 for All
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const categories: CategoryType[] = ['All', 'Grocery', 'Bakery', 'Pharmacy', 'Restaurants', 'Clothing'];

  // Calculate real distances and sort by closest merchant (Requirements 5 & 15)
  const sortedAndFilteredStores = useMemo(() => {
    return stores
      .map((store) => {
        const dist = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          store.latitude,
          store.longitude
        );
        return { ...store, dynamicDistanceKm: dist };
      })
      .filter((store) => {
        if (selectedCategory !== 'All' && store.category !== selectedCategory) return false;
        if (distanceRadiusKm !== 999 && store.dynamicDistanceKm > distanceRadiusKm) return false;
        return true;
      })
      .sort((a, b) => a.dynamicDistanceKm - b.dynamicDistanceKm);
  }, [stores, userLocation, selectedCategory, distanceRadiusKm]);

  return (
    <div className="pb-24 pt-3 text-left">
      {/* Top Title & View Mode Switcher */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#191c1d] tracking-tight">
            Explore Nearby Merchants
          </h1>
          <p className="text-xs text-[#717970] mt-0.5">
            Discover stores around <span className="font-semibold text-[#023616]">{userLocation.area}</span>
          </p>
        </div>

        <div className="flex bg-[#edeeef] p-1 rounded-xl">
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'map' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">map</span>
            <span>Map</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'list' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">view_list</span>
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Distance Radius Filter (Requirement 15) */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar py-1">
        <span className="text-[11px] font-bold text-[#717970] uppercase shrink-0 mr-1">
          Radius:
        </span>
        {[
          { label: 'Within 1 km', val: 1 },
          { label: 'Within 3 km', val: 3 },
          { label: 'Within 5 km', val: 5 },
          { label: 'All nearby stores', val: 999 },
        ].map((r) => (
          <button
            key={r.val}
            onClick={() => setDistanceRadiusKm(r.val)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              distanceRadiusKm === r.val
                ? 'bg-[#023616] text-white shadow-xs'
                : 'bg-white border border-[#edeeef] text-[#414941] hover:bg-[#f8f9fa]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3.5 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-[#023616] text-white shadow-xs'
                : 'bg-white border border-[#edeeef] text-[#414941] hover:bg-[#f8f9fa]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Real Google Map View (Requirement 6) */}
      {viewMode === 'map' ? (
        <div className="space-y-4">
          <GoogleMapView
            stores={sortedAndFilteredStores}
            userLocation={userLocation}
            onViewStore={onViewStore}
            onMessageStore={onMessageStore}
            height="380px"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-[#191c1d]">
                Closest Stores ({sortedAndFilteredStores.length})
              </h3>
              <span className="text-[11px] text-[#717970]">Sorted by distance</span>
            </div>

            <div className="space-y-2">
              {sortedAndFilteredStores.map((store) => {
                const directionsUrl = getGoogleMapsDirectionsUrl(
                  userLocation.latitude,
                  userLocation.longitude,
                  store.latitude,
                  store.longitude
                );

                return (
                  <div
                    key={store.id}
                    className="bg-white rounded-xl p-3 border border-[#edeeef] flex items-center justify-between hover:border-[#023616]/30 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <img
                        src={store.image}
                        alt={store.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-[#191c1d] truncate">
                          {store.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#717970] mt-0.5">
                          <span className="font-bold text-[#023616]">
                            📍 {formatDistance(store.dynamicDistanceKm)}
                          </span>
                          <span>·</span>
                          <span>{store.category}</span>
                          <span>·</span>
                          <span>★ {store.rating}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg bg-[#edeeef] hover:bg-[#e7e8e9] text-[#023616] flex items-center justify-center cursor-pointer"
                        title="Directions in Google Maps"
                      >
                        <span className="material-symbols-outlined text-sm font-bold text-[#fd8b00]">directions</span>
                      </a>
                      <button
                        onClick={() => onViewStore(store)}
                        className="bg-[#023616] text-white hover:bg-[#1e4d2b] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shadow-xs"
                      >
                        Store
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-[#191c1d]">
              Found {sortedAndFilteredStores.length} Stores Near You
            </h3>
            <span className="text-[11px] text-[#717970]">Real coordinates</span>
          </div>

          {sortedAndFilteredStores.map((store) => {
            const directionsUrl = getGoogleMapsDirectionsUrl(
              userLocation.latitude,
              userLocation.longitude,
              store.latitude,
              store.longitude
            );

            return (
              <div
                key={store.id}
                className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs flex flex-col gap-3"
              >
                <div className="flex gap-3 items-start">
                  <img
                    src={store.image}
                    alt={store.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="font-extrabold text-sm text-[#191c1d] truncate">
                        {store.name}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        {(store.totalRatings && store.totalRatings > 0) || (store.reviewsCount && store.reviewsCount > 0) ? (
                          <span className="bg-[#bbefc1]/40 text-[#00210b] px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                              star
                            </span>
                            <span>{(store.averageRating ?? store.rating).toFixed(1)}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#717970] bg-[#f3f4f5] px-1.5 py-0.5 rounded font-medium">
                            No ratings yet
                          </span>
                        )}

                        {onToggleFavorite && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(store);
                            }}
                            className="w-6 h-6 rounded-full bg-[#f8f9fa] hover:bg-red-50 flex items-center justify-center cursor-pointer transition-all border border-[#edeeef]"
                            title={favoriteStoreIds.has(store.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <span
                              className={`material-symbols-outlined text-sm ${
                                favoriteStoreIds.has(store.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                              }`}
                              style={{ fontVariationSettings: favoriteStoreIds.has(store.id) ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              favorite
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#414941] truncate mt-0.5">
                      {store.subcategories}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-[#717970] mt-1 font-semibold">
                      <span className="text-[#023616] font-bold">
                        📍 {formatDistance(store.dynamicDistanceKm)} away
                      </span>
                      <span>·</span>
                      <span>{store.area}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#edeeef]">
                  <button
                    onClick={() => onViewStore(store)}
                    className="flex-1 py-2 bg-[#edeeef] hover:bg-[#e7e8e9] text-[#191c1d] rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">storefront</span>
                    <span>View Store</span>
                  </button>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-[#023616] hover:bg-[#1e4d2b] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm font-bold text-[#fd8b00]">directions</span>
                    <span>Directions</span>
                  </a>
                  <button
                    onClick={() => onMessageStore(store)}
                    className="p-2 bg-[#edeeef] hover:bg-[#e7e8e9] text-[#191c1d] rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                    title="Message"
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
