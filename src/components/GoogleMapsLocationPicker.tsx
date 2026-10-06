import React, { useState, useEffect } from 'react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { reverseGeocode, geocodeAddress, GeocodedAddress } from '../utils/geo';

interface GoogleMapsLocationPickerProps {
  initialLat: number;
  initialLng: number;
  onConfirmLocation: (location: {
    latitude: number;
    longitude: number;
    addressData: GeocodedAddress;
  }) => void;
  onCancel: () => void;
  title?: string;
  confirmLabel?: string;
}

export const GoogleMapsLocationPicker: React.FC<GoogleMapsLocationPickerProps> = ({
  initialLat,
  initialLng,
  onConfirmLocation,
  onCancel,
  title = 'Choose your location',
  confirmLabel = 'Confirm Location',
}) => {
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [addressData, setAddressData] = useState<GeocodedAddress | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isConfirmedStep, setIsConfirmedStep] = useState(false);

  // Reverse geocode when coordinates change
  useEffect(() => {
    let isCancelled = false;
    async function fetchAddress() {
      setIsLoadingAddress(true);
      try {
        const data = await reverseGeocode(lat, lng);
        if (!isCancelled) {
          setAddressData(data);
        }
      } catch (err) {
        console.error('Reverse geocode failed', err);
      } finally {
        if (!isCancelled) setIsLoadingAddress(false);
      }
    }

    fetchAddress();
    return () => {
      isCancelled = true;
    };
  }, [lat, lng]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        setMapCenter({ lat: newLat, lng: newLng });
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setGpsError('Location permission was denied. You can select manually on the map.');
        } else {
          setGpsError('Unable to determine location. Please search or tap on the map.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const result = await geocodeAddress(searchQuery.trim());
    setIsSearching(false);

    if (result) {
      setLat(result.lat);
      setLng(result.lng);
      setMapCenter({ lat: result.lat, lng: result.lng });
      setAddressData(result.addressData);
      setGpsError(null);
    } else {
      setGpsError(`Could not find "${searchQuery}". Tap on the map to place a pin.`);
    }
  };

  const handleDropPinAtCenter = () => {
    setLat(mapCenter.lat);
    setLng(mapCenter.lng);
  };

  const handleConfirm = () => {
    if (!addressData) return;
    onConfirmLocation({
      latitude: lat,
      longitude: lng,
      addressData,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-xl h-full sm:h-[88vh] sm:max-h-[700px] rounded-none sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#edeeef] flex justify-between items-center bg-[#f8f9fa] shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#023616] text-xl">map</span>
            <h3 className="font-extrabold text-base text-[#191c1d]">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-[#edeeef] hover:bg-[#e7e8e9] flex items-center justify-center text-[#414941] cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Search bar inside map selector */}
        <div className="p-3 bg-white border-b border-[#edeeef] shrink-0 space-y-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 flex items-center bg-[#f3f4f5] rounded-xl px-3 py-2 text-xs focus-within:bg-white focus-within:ring-2 focus-within:ring-[#023616]/20 border border-transparent focus-within:border-[#023616]">
              <span className="material-symbols-outlined text-sm text-[#717970] mr-2">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area, town, or landmark (e.g. Bharari Bazaar)"
                className="bg-transparent w-full focus:outline-none text-[#191c1d]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[#717970] hover:text-[#191c1d]"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="bg-[#023616] hover:bg-[#1e4d2b] disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              {isSearching ? 'Finding...' : 'Search'}
            </button>
          </form>

          {/* Quick Action Buttons */}
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#bbefc1]/30 hover:bg-[#bbefc1]/50 text-[#00210b] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#bbefc1]"
            >
              <span className="material-symbols-outlined text-sm text-[#023616]">
                {isLocating ? 'sync' : 'my_location'}
              </span>
              <span>{isLocating ? 'Locating...' : 'Use Current Location'}</span>
            </button>

            <button
              type="button"
              onClick={handleDropPinAtCenter}
              className="py-1.5 px-3 rounded-lg bg-[#edeeef] hover:bg-[#e7e8e9] text-[#191c1d] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">push_pin</span>
              <span>Drop Pin Here</span>
            </button>
          </div>

          {gpsError && (
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-amber-700">info</span>
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        {/* Real Interactive Google Map */}
        <div className="flex-1 w-full relative bg-[#e8ece9] overflow-hidden min-h-[260px]">
          <Map
            id="location-picker-map"
            mapId="DEMO_MAP_ID"
            center={mapCenter}
            zoom={15}
            onCameraChanged={(ev) => setMapCenter(ev.detail.center)}
            onClick={(ev) => {
              if (ev.detail.latLng) {
                setLat(ev.detail.latLng.lat);
                setLng(ev.detail.latLng.lng);
              }
            }}
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <AdvancedMarker
              position={{ lat, lng }}
              draggable={true}
              onDragEnd={(e) => {
                if (e.latLng) {
                  setLat(e.latLng.lat);
                  setLng(e.latLng.lng);
                }
              }}
              title="Drag pin to set exact location"
            >
              <Pin
                background="#023616"
                glyphColor="#ffffff"
                borderColor="#fd8b00"
                scale={1.2}
              />
            </AdvancedMarker>
          </Map>

          {/* Hint Overlay */}
          <div className="absolute top-2 left-2 right-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-[#edeeef] text-[11px] text-[#414941] flex items-center justify-between pointer-events-none">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-[#023616]">touch_app</span>
              Tap map or drag pin to position
            </span>
            <span className="text-[10px] font-bold text-[#717970]">
              Ghumarwin, HP
            </span>
          </div>
        </div>

        {/* Selected Address Display & Confirmation Box */}
        <div className="p-4 bg-white border-t border-[#edeeef] shrink-0 text-left">
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#023616] text-white flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-sm">location_on</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-[#717970] uppercase tracking-wider flex items-center gap-1.5">
                <span>Selected Location</span>
                {isLoadingAddress && (
                  <span className="text-[10px] text-[#023616] font-semibold animate-pulse">
                    (Resolving address...)
                  </span>
                )}
              </div>

              <div className="font-extrabold text-sm text-[#191c1d] mt-0.5 truncate">
                {addressData?.area || 'Ghumarwin'}
              </div>

              <div className="text-xs text-[#414941] mt-0.5 leading-relaxed line-clamp-2">
                {addressData?.formattedAddress || 'Ghumarwin, Bilaspur, Himachal Pradesh'}
              </div>
            </div>
          </div>

          {/* Two-step Confirmation if requested for high accuracy */}
          {isConfirmedStep ? (
            <div className="space-y-2 p-3 bg-[#bbefc1]/20 rounded-xl border border-[#bbefc1]">
              <div className="text-xs font-bold text-[#00210b] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-[#023616]">verified</span>
                <span>Confirm this exact location?</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmedStep(false)}
                  className="flex-1 py-2 bg-white text-[#414941] rounded-lg text-xs font-bold border border-[#c1c9be] cursor-pointer"
                >
                  Change Location
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 py-2 bg-[#023616] text-white rounded-lg text-xs font-bold cursor-pointer shadow-sm hover:bg-[#1e4d2b]"
                >
                  Yes, Save Location
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="py-2.5 px-4 bg-[#edeeef] hover:bg-[#e7e8e9] text-[#191c1d] rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmedStep(true)}
                disabled={isLoadingAddress || !addressData}
                className="flex-1 py-2.5 px-4 bg-[#023616] hover:bg-[#1e4d2b] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <span>{confirmLabel}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
