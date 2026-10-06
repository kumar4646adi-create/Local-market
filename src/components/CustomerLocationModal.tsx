import React, { useState } from 'react';
import { UserLocation } from '../types';
import { reverseGeocode, geocodeAddress, GeocodedAddress } from '../utils/geo';
import { GHUMARWIN_PRESETS } from '../data/mockData';
import { GoogleMapsLocationPicker } from './GoogleMapsLocationPicker';

interface CustomerLocationModalProps {
  currentLocation: UserLocation;
  onUpdateLocation: (newLocation: UserLocation) => void;
  onClose: () => void;
}

export const CustomerLocationModal: React.FC<CustomerLocationModalProps> = ({
  currentLocation,
  onUpdateLocation,
  onClose,
}) => {
  const [viewState, setViewState] = useState<'main' | 'map_picker' | 'manual_picker'>('main');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    lat: number;
    lng: number;
    addressData: GeocodedAddress;
  } | null>(null);

  // Manual Town/Area Form State for Tier-2/3 accuracy
  const [manualArea, setManualArea] = useState('Bharari Bazaar');
  const [manualTown, setManualTown] = useState('Ghumarwin');
  const [manualDistrict, setManualDistrict] = useState('Bilaspur');
  const [manualState, setManualState] = useState('Himachal Pradesh');

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setStatusMessage('Finding your location...');
    setPermissionDenied(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const addressData = await reverseGeocode(latitude, longitude);
          const newLoc: UserLocation = {
            latitude,
            longitude,
            area: addressData.area,
            city: addressData.city,
            district: addressData.district,
            state: addressData.state,
            formattedAddress: addressData.formattedAddress,
            source: 'gps',
          };
          onUpdateLocation(newLoc);
          setIsLocating(false);
          setStatusMessage('Location updated successfully');
          setTimeout(() => onClose(), 600);
        } catch (err) {
          setIsLocating(false);
          setStatusMessage('Unable to resolve address. Please choose on map.');
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === 1) {
          setPermissionDenied(true);
          setStatusMessage('Location permission is disabled.');
        } else {
          setStatusMessage('Unable to determine your location.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setStatusMessage(null);
    const result = await geocodeAddress(searchQuery.trim());
    setIsSearching(false);

    if (result) {
      setSearchResults(result);
    } else {
      setStatusMessage(`No results found for "${searchQuery}". Please select on map.`);
    }
  };

  const applySearchResult = (res: { lat: number; lng: number; addressData: GeocodedAddress }) => {
    const newLoc: UserLocation = {
      latitude: res.lat,
      longitude: res.lng,
      area: res.addressData.area,
      city: res.addressData.city,
      district: res.addressData.district,
      state: res.addressData.state,
      formattedAddress: res.addressData.formattedAddress,
      source: 'manual',
    };
    onUpdateLocation(newLoc);
    onClose();
  };

  const handlePresetSelect = (preset: typeof GHUMARWIN_PRESETS[0]) => {
    const newLoc: UserLocation = {
      latitude: preset.latitude,
      longitude: preset.longitude,
      area: preset.area,
      city: 'Ghumarwin',
      district: 'Bilaspur',
      state: 'Himachal Pradesh',
      formattedAddress: `${preset.name}, Bilaspur, Himachal Pradesh`,
      source: 'manual',
    };
    onUpdateLocation(newLoc);
    onClose();
  };

  const handleManualFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = `${manualArea}, ${manualTown}, ${manualDistrict}, ${manualState}`;
    setIsSearching(true);
    const result = await geocodeAddress(query);
    setIsSearching(false);

    const lat = result?.lat || 31.4428;
    const lng = result?.lng || 76.7153;

    const newLoc: UserLocation = {
      latitude: lat,
      longitude: lng,
      area: manualArea,
      city: manualTown,
      district: manualDistrict,
      state: manualState,
      formattedAddress: `${manualArea}, ${manualTown}, ${manualDistrict}, ${manualState}`,
      source: 'manual',
    };
    onUpdateLocation(newLoc);
    onClose();
  };

  // If user opens the full Map Picker
  if (viewState === 'map_picker') {
    return (
      <GoogleMapsLocationPicker
        initialLat={currentLocation.latitude}
        initialLng={currentLocation.longitude}
        title="Choose your location on Google Maps"
        confirmLabel="Confirm Location"
        onConfirmLocation={({ latitude, longitude, addressData }) => {
          onUpdateLocation({
            latitude,
            longitude,
            area: addressData.area,
            city: addressData.city,
            district: addressData.district,
            state: addressData.state,
            formattedAddress: addressData.formattedAddress,
            source: 'map_pin',
          });
          onClose();
        }}
        onCancel={() => setViewState('main')}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#edeeef] flex justify-between items-center bg-[#f8f9fa] shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#023616] text-xl">near_me</span>
            <div>
              <h3 className="font-extrabold text-base text-[#191c1d]">📍 Your Location</h3>
              <p className="text-xs text-[#717970]">Find merchants delivering to your doorstep</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#edeeef] hover:bg-[#e7e8e9] flex items-center justify-center text-[#414941] cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Current Active Location Display */}
        <div className="p-4 bg-gradient-to-r from-[#bbefc1]/20 to-white border-b border-[#edeeef] text-left shrink-0">
          <div className="text-[11px] font-bold text-[#717970] uppercase tracking-wider">
            Current Selected Address
          </div>
          <div className="text-base font-extrabold text-[#023616] mt-0.5">
            📍 {currentLocation.area}, {currentLocation.city}
          </div>
          <div className="text-xs text-[#414941] mt-0.5 leading-relaxed truncate">
            {currentLocation.district}, {currentLocation.state}
          </div>
        </div>

        {/* Location Permission UX Banner if denied */}
        {permissionDenied && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-950 text-xs shrink-0 text-left space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <span className="material-symbols-outlined text-base text-amber-600">location_off</span>
              <span>Location access is off</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Browser location permission was not granted. You can search your town, pick from local markets, or drop a pin on Google Maps.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setViewState('manual_picker')}
                className="bg-white border border-amber-300 text-amber-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-amber-100/50 cursor-pointer"
              >
                Choose Location Manually
              </button>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="bg-amber-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-amber-900 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && !permissionDenied && (
          <div className="px-4 py-2 bg-[#f3f4f5] text-xs font-semibold text-[#023616] border-b border-[#edeeef] text-left flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Body Options */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-left">
          {viewState === 'main' ? (
            <>
              {/* Primary 3 Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="p-3 rounded-xl bg-[#023616] hover:bg-[#1e4d2b] disabled:opacity-50 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer transition-all active:scale-98"
                >
                  <span className="material-symbols-outlined text-xl">
                    {isLocating ? 'sync' : 'my_location'}
                  </span>
                  <span>{isLocating ? 'Finding...' : 'Use Current Location'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewState('map_picker')}
                  className="p-3 rounded-xl bg-[#edeeef] hover:bg-[#e7e8e9] text-[#191c1d] font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-98 border border-[#c1c9be]"
                >
                  <span className="material-symbols-outlined text-xl text-[#023616]">map</span>
                  <span>Select on Map</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewState('manual_picker')}
                  className="p-3 rounded-xl bg-[#edeeef] hover:bg-[#e7e8e9] text-[#191c1d] font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-98 border border-[#c1c9be]"
                >
                  <span className="material-symbols-outlined text-xl text-[#fd8b00]">edit_location_alt</span>
                  <span>Manual Selection</span>
                </button>
              </div>

              {/* Search Location Form */}
              <div>
                <label className="block text-xs font-bold text-[#191c1d] mb-1">
                  Search Location
                </label>
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="flex-1 flex items-center bg-[#f3f4f5] rounded-xl px-3 py-2 text-xs border border-transparent focus-within:border-[#023616] focus-within:bg-white">
                    <span className="material-symbols-outlined text-sm text-[#717970] mr-2">search</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type village, bazaar, or road in Ghumarwin..."
                      className="bg-transparent w-full focus:outline-none text-[#191c1d]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-[#023616] hover:bg-[#1e4d2b] disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isSearching ? '...' : 'Search'}
                  </button>
                </form>

                {searchResults && (
                  <div className="mt-2 p-3 bg-[#bbefc1]/20 border border-[#bbefc1] rounded-xl flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-xs text-[#00210b]">Found: {searchResults.addressData.area}</div>
                      <div className="text-[11px] text-[#21502e] truncate">{searchResults.addressData.formattedAddress}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applySearchResult(searchResults)}
                      className="bg-[#023616] text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer shadow-xs"
                    >
                      Use This
                    </button>
                  </div>
                )}
              </div>

              {/* Popular Localities / Presets in Bilaspur District */}
              <div>
                <div className="text-[11px] font-bold text-[#717970] uppercase tracking-wider mb-2">
                  Popular Markets & Localities (Ghumarwin)
                </div>
                <div className="space-y-2">
                  {GHUMARWIN_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className="w-full p-2.5 rounded-xl border border-[#edeeef] hover:border-[#023616]/40 hover:bg-[#f8f9fa] flex items-center justify-between text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#edeeef] text-[#023616] flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-sm">storefront</span>
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#191c1d]">{preset.name}</div>
                          <div className="text-[10px] text-[#717970]">{preset.storesCount} verified stores with Smart Pickup</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[#c1c9be]">chevron_right</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Manual Selection Form (Requirement 16) */
            <form onSubmit={handleManualFormSubmit} className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-[#191c1d]">Manual Area Details</span>
                <button
                  type="button"
                  onClick={() => setViewState('main')}
                  className="text-xs text-[#023616] font-semibold hover:underline"
                >
                  ← Back to options
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#717970] mb-1">
                  Area / Bazaar Lane / Village *
                </label>
                <input
                  type="text"
                  required
                  value={manualArea}
                  onChange={(e) => setManualArea(e.target.value)}
                  placeholder="e.g. Bharari Bazaar, Gandhi Chowk, Dakra"
                  className="w-full text-xs p-2.5 rounded-xl border border-[#edeeef] bg-[#f8f9fa] focus:bg-white focus:outline-none focus:border-[#023616]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#717970] mb-1">
                    Town / Tehsil *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualTown}
                    onChange={(e) => setManualTown(e.target.value)}
                    placeholder="Ghumarwin"
                    className="w-full text-xs p-2.5 rounded-xl border border-[#edeeef] bg-[#f8f9fa] focus:bg-white focus:outline-none focus:border-[#023616]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#717970] mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualDistrict}
                    onChange={(e) => setManualDistrict(e.target.value)}
                    placeholder="Bilaspur"
                    className="w-full text-xs p-2.5 rounded-xl border border-[#edeeef] bg-[#f8f9fa] focus:bg-white focus:outline-none focus:border-[#023616]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#717970] mb-1">
                  State
                </label>
                <input
                  type="text"
                  readOnly
                  value={manualState}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#edeeef] bg-[#edeeef] text-[#414941]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#023616] hover:bg-[#1e4d2b] text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer mt-2"
              >
                Set Location & Show Nearby Stores
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
