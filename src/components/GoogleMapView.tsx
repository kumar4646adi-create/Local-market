import React, { useState } from 'react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Store, UserLocation } from '../types';
import { calculateDistanceKm, formatDistance, getGoogleMapsDirectionsUrl } from '../utils/geo';

interface GoogleMapViewProps {
  stores: Store[];
  userLocation: UserLocation;
  onViewStore: (store: Store) => void;
  onMessageStore: (store: Store) => void;
  selectedStoreId?: string | null;
  height?: string;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  stores,
  userLocation,
  onViewStore,
  onMessageStore,
  selectedStoreId = null,
  height = '340px',
}) => {
  const [activeStore, setActiveStore] = useState<Store | null>(
    stores.find((s) => s.id === selectedStoreId) || null
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: userLocation.latitude,
    lng: userLocation.longitude,
  });

  const handleCenterOnUser = () => {
    setMapCenter({
      lat: userLocation.latitude,
      lng: userLocation.longitude,
    });
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-[#edeeef]" style={{ height }}>
      <Map
        id="explore-main-google-map"
        mapId="DEMO_MAP_ID"
        center={mapCenter}
        zoom={14}
        onCameraChanged={(ev) => setMapCenter(ev.detail.center)}
        gestureHandling="greedy"
        disableDefaultUI={false}
        zoomControl={true}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        {/* 🔵 Customer Location Marker */}
        <AdvancedMarker
          position={{
            lat: userLocation.latitude,
            lng: userLocation.longitude,
          }}
          title={`Your Location: ${userLocation.area}`}
        >
          <div className="flex flex-col items-center">
            <span className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white items-center justify-center text-[8px] text-white font-extrabold shadow-md">
                You
              </span>
            </span>
            <div className="bg-black/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm mt-0.5 whitespace-nowrap">
              {userLocation.area}
            </div>
          </div>
        </AdvancedMarker>

        {/* 📍 Merchant Store Markers with Real Coordinates */}
        {stores.map((store) => {
          const isSelected = activeStore?.id === store.id;
          const dist = calculateDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            store.latitude,
            store.longitude
          );

          return (
            <AdvancedMarker
              key={store.id}
              position={{
                lat: store.latitude,
                lng: store.longitude,
              }}
              onClick={() => setActiveStore(store)}
              title={`${store.name} (${formatDistance(dist)})`}
            >
              <div className="flex flex-col items-center cursor-pointer transform hover:scale-110 transition-transform">
                <Pin
                  background={isSelected ? '#fd8b00' : '#023616'}
                  glyphColor="#ffffff"
                  borderColor={isSelected ? '#603100' : '#bbefc1'}
                  scale={isSelected ? 1.25 : 1.0}
                />
                <div
                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-md mt-0.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#fd8b00] text-[#603100]'
                      : 'bg-[#023616] text-white'
                  }`}
                >
                  {store.name.split(' ')[0]}
                </div>
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>

      {/* Recenter button */}
      <button
        onClick={handleCenterOnUser}
        className="absolute top-3 right-3 bg-white hover:bg-[#f8f9fa] text-[#023616] p-2 rounded-xl shadow-md border border-[#edeeef] flex items-center gap-1 text-xs font-bold transition-all cursor-pointer z-10"
        title="Center on my location"
      >
        <span className="material-symbols-outlined text-sm">my_location</span>
        <span className="hidden sm:inline">My Location</span>
      </button>

      {/* Map Legend / Info tag */}
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-xs border border-[#edeeef] text-[10px] text-[#414941] font-bold flex items-center gap-2 z-10">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> You
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#023616] inline-block" /> Verified Stores
        </span>
      </div>

      {/* Active Merchant Store Card Overlay (Section 6) */}
      {activeStore && (
        <div className="absolute bottom-3 inset-x-3 bg-white rounded-2xl p-3.5 shadow-xl border border-[#023616]/30 z-20 animate-in slide-in-from-bottom-2 duration-200 text-left">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-[#191c1d] truncate">
                  {activeStore.name}
                </h4>
                <div className="flex items-center bg-[#bbefc1]/40 text-[#00210b] px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                  <span>★ {activeStore.rating.toFixed(1)}</span>
                </div>
              </div>

              <p className="text-[11px] text-[#414941] truncate mt-0.5">
                {activeStore.subcategories}
              </p>

              <div className="flex items-center gap-2 text-[11px] text-[#414941] mt-1 font-medium">
                <span className="text-[#023616] font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-xs">near_me</span>
                  {formatDistance(
                    calculateDistanceKm(
                      userLocation.latitude,
                      userLocation.longitude,
                      activeStore.latitude,
                      activeStore.longitude
                    )
                  )}
                </span>
                <span>·</span>
                <span className="text-emerald-700 font-semibold">
                  {activeStore.isOpen ? 'Open Now' : 'Closed'}
                </span>
                <span>·</span>
                <span className="truncate max-w-[120px]">{activeStore.area}</span>
              </div>
            </div>

            <button
              onClick={() => setActiveStore(null)}
              className="p-1 rounded-full hover:bg-[#edeeef] text-[#717970] shrink-0"
              aria-label="Close store details"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* Action Buttons: [ View Store ] [ Directions ] [ Message ] */}
          <div className="flex gap-2 mt-3 pt-2.5 border-t border-[#edeeef]">
            <button
              onClick={() => onViewStore(activeStore)}
              className="flex-1 bg-[#023616] hover:bg-[#1e4d2b] active:scale-95 text-white py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">storefront</span>
              <span>View Store</span>
            </button>

            <a
              href={getGoogleMapsDirectionsUrl(
                userLocation.latitude,
                userLocation.longitude,
                activeStore.latitude,
                activeStore.longitude
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#fd8b00] hover:brightness-105 active:scale-95 text-[#603100] py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-sm font-bold">directions</span>
              <span>Directions</span>
            </a>

            <button
              onClick={() => onMessageStore(activeStore)}
              className="bg-[#edeeef] hover:bg-[#e7e8e9] active:scale-95 text-[#191c1d] py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              <span className="hidden sm:inline">Message</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
