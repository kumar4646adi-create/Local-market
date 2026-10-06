import React, { useState } from 'react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Store, Product, CartItem, UserLocation } from '../types';
import { calculateDistanceKm, formatDistance, getGoogleMapsDirectionsUrl } from '../utils/geo';
import { BookAppointmentModal } from './BookAppointmentModal';

interface StoreDetailModalProps {
  store: Store;
  userLocation: UserLocation;
  isFavorite?: boolean;
  onToggleFavorite?: (store: Store) => void;
  onClose: () => void;
  onMessageStore: (store: Store) => void;
  cart: CartItem[];
  onAddToCart: (store: Store, product: Product) => void;
  onUpdateCartQuantity: (productId: string, quantity: number) => void;
  onOpenCart: () => void;
  onOpenContacts?: () => void;
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({
  store,
  userLocation,
  isFavorite = false,
  onToggleFavorite,
  onClose,
  onMessageStore,
  cart,
  onAddToCart,
  onUpdateCartQuantity,
  onOpenCart,
  onOpenContacts,
}) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All');
  const [showInAppMap, setShowInAppMap] = useState<boolean>(false);
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);

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
  const hasStoreRatings = ratingCount > 0 && displayRating > 0;

  // Extract unique subcategories from products
  const productCategories = ['All', ...Array.from(new Set(store.products.map((p) => p.category)))];

  const filteredProducts = selectedSubcategory === 'All'
    ? store.products
    : store.products.filter((p) => p.category === selectedSubcategory);

  const storeCartItems = cart.filter((item) => item.storeId === store.id);
  const cartItemCount = storeCartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const cartSubtotal = storeCartItems.reduce(
    (acc, curr) => acc + curr.product.price * curr.quantity,
    0
  );

  const getItemQuantity = (productId: string) => {
    const item = storeCartItems.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Hero Header with Store Cover */}
        <div className="relative h-48 sm:h-52 bg-[#1e4d2b] shrink-0">
          <img
            src={store.image}
            alt={store.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover brightness-90"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

          {/* Close & Action buttons */}
          <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
              aria-label="Close store details"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex gap-2 items-center">
              {/* Favorite Button */}
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={() => onToggleFavorite(store)}
                  className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  title={isFavorite ? 'Remove from favorite stores' : 'Add to favorite stores'}
                >
                  <span
                    className={`material-symbols-outlined text-xl transition-colors ${
                      isFavorite ? 'text-red-500' : 'text-white hover:text-red-400'
                    }`}
                    style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </span>
                </button>
              )}

              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-full bg-[#fd8b00] text-[#603100] text-xs font-black flex items-center gap-1.5 shadow-md hover:brightness-105"
              >
                <span className="material-symbols-outlined text-sm font-bold">directions</span>
                <span>Get Directions</span>
              </a>

              <button
                onClick={() => onMessageStore(store)}
                className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  chat
                </span>
                <span>Chat</span>
              </button>
            </div>
          </div>

          {/* Store Title in Header */}
          <div className="absolute bottom-3 inset-x-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#fd8b00] text-[#603100] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {store.category}
              </span>
              {store.smartPickup && (
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-[#fd8b00]">bolt</span>
                  Smart Pickup Ready
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate drop-shadow-sm">
              {store.name}
            </h2>

            <div className="flex items-center gap-2.5 text-xs text-white/90 mt-0.5 font-medium">
              {hasStoreRatings ? (
                <span className="flex items-center gap-0.5 font-bold text-[#bbefc1]">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  {displayRating.toFixed(1)} ({ratingCount} ratings)
                </span>
              ) : (
                <span className="text-[11px] text-white/80 font-semibold bg-white/10 px-2 py-0.5 rounded-full">
                  No ratings yet
                </span>
              )}
              <span>·</span>
              <span className="font-bold text-white">📍 {formatDistance(realDistanceKm)} from you</span>
              <span>·</span>
              <span className="text-emerald-300 font-bold">{store.isOpen ? 'Open Now' : 'Closed'}</span>
            </div>
          </div>
        </div>

        {/* Store Location Strip with View on Map & Get Directions (Requirement 11) */}
        <div className="bg-[#f8f9fa] px-4 py-3 border-b border-[#edeeef] flex flex-col gap-2 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 text-xs text-[#191c1d]">
              <span className="material-symbols-outlined text-sm text-[#023616] shrink-0 mt-0.5">location_on</span>
              <div>
                <span className="font-bold">📍 Store Location: </span>
                <span className="text-[#414941]">{store.address}, {store.area}, {store.city}, {store.district}</span>
              </div>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              <a
                href={`tel:${store.phone}`}
                className="text-[#023616] font-bold text-xs hover:underline flex items-center gap-1 shrink-0 ml-1"
              >
                <span className="material-symbols-outlined text-sm">call</span>
                <span>Call</span>
              </a>
              {onOpenContacts && (
                <button
                  type="button"
                  onClick={onOpenContacts}
                  className="text-blue-800 font-bold text-xs hover:underline flex items-center gap-1 shrink-0 ml-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg"
                >
                  <span className="material-symbols-outlined text-sm">contacts</span>
                  <span>Save Contact</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsBookingOpen(true)}
                className="text-[#023616] font-bold text-xs hover:underline flex items-center gap-1 shrink-0 ml-1 cursor-pointer bg-[#bbefc1]/30 px-2.5 py-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                <span>Book Appointment</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowInAppMap((v) => !v)}
              className="flex-1 py-1.5 px-3 rounded-lg bg-white border border-[#c1c9be] text-[#023616] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#edeeef] cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">map</span>
              <span>{showInAppMap ? 'Hide Map' : 'View on Map'}</span>
            </button>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-1.5 px-3 rounded-lg bg-[#023616] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#1e4d2b] shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">directions</span>
              <span>Get Directions</span>
            </a>
          </div>
        </div>

        {/* In-App Map Centered on Merchant Coordinates (Requirement 11) */}
        {showInAppMap && (
          <div className="h-48 w-full border-b border-[#edeeef] relative shrink-0">
            <Map
              id={`store-map-${store.id}`}
              mapId="DEMO_MAP_ID"
              defaultCenter={{ lat: store.latitude, lng: store.longitude }}
              defaultZoom={15}
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Store Marker */}
              <AdvancedMarker
                position={{ lat: store.latitude, lng: store.longitude }}
                title={store.name}
              >
                <Pin
                  background="#023616"
                  glyphColor="#ffffff"
                  borderColor="#fd8b00"
                  scale={1.2}
                />
              </AdvancedMarker>

              {/* Customer Marker */}
              <AdvancedMarker
                position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
                title="Your current location"
              >
                <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md" />
              </AdvancedMarker>
            </Map>

            <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 rounded text-[10px] font-bold text-[#191c1d] shadow-xs border border-[#edeeef]">
              📍 {store.name} · {formatDistance(realDistanceKm)} from you
            </div>
          </div>
        )}

        {/* Category Filter Pills inside store */}
        <div className="px-4 py-2.5 flex gap-2 overflow-x-auto border-b border-[#edeeef] shrink-0 no-scrollbar">
          {productCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedSubcategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubcategory === cat
                  ? 'bg-[#023616] text-white shadow-xs'
                  : 'bg-[#edeeef] text-[#414941] hover:text-[#191c1d]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-[#191c1d]">
              Catalog ({filteredProducts.length} items)
            </h3>
            <span className="text-[11px] text-[#717970]">
              Instant Smart Pickup available
            </span>
          </div>

          {filteredProducts.map((product) => {
            const quantity = getItemQuantity(product.id);
            return (
              <div
                key={product.id}
                className="bg-white border border-[#edeeef] rounded-xl p-3 flex gap-3 items-center justify-between hover:border-[#1e4d2b]/30 transition-all shadow-xs"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-[#191c1d] truncate">
                      {product.name}
                    </h4>
                    {product.isBestSeller && (
                      <span className="bg-[#fd8b00]/15 text-[#904d00] text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0">
                        Popular
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#717970] line-clamp-1 mt-0.5">
                    {product.description}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm font-extrabold text-[#023616]">
                      ₹{product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs text-[#717970] line-through">
                        ₹{product.originalPrice}
                      </span>
                    )}
                    <span className="text-[11px] text-[#414941] bg-[#f3f4f5] px-1.5 py-0.5 rounded">
                      {product.unit}
                    </span>

                    {/* Product Rating */}
                    {product.totalRatings && product.totalRatings > 0 && product.averageRating ? (
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#00210b] bg-[#bbefc1]/40 px-1.5 py-0.5 rounded">
                        <span className="material-symbols-outlined text-[12px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                        <span>{product.averageRating.toFixed(1)}</span>
                        <span className="text-[10px] text-[#414941] font-normal">
                          ({product.totalRatings})
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#717970] font-medium bg-[#f3f4f5] px-1.5 py-0.5 rounded">
                        No ratings yet
                      </span>
                    )}
                  </div>
                </div>

                {/* Add to Cart / Quantity Stepper */}
                <div className="shrink-0">
                  {quantity === 0 ? (
                    <button
                      onClick={() => onAddToCart(store, product)}
                      className="bg-[#023616] hover:bg-[#1e4d2b] active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      <span>Add</span>
                    </button>
                  ) : (
                    <div className="flex items-center bg-[#f3f4f5] border border-[#c1c9be] rounded-lg overflow-hidden shadow-inner">
                      <button
                        onClick={() => onUpdateCartQuantity(product.id, quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-[#191c1d] hover:bg-[#e1e3e4] active:scale-90 transition-all font-bold"
                        aria-label="Decrease quantity"
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-[#023616]">
                        {quantity}
                      </span>
                      <button
                        onClick={() => onUpdateCartQuantity(product.id, quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-[#191c1d] hover:bg-[#e1e3e4] active:scale-90 transition-all font-bold"
                        aria-label="Increase quantity"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Bottom Cart CTA if items added */}
        {cartItemCount > 0 && (
          <div className="p-3 bg-white border-t border-[#edeeef] shrink-0 shadow-lg">
            <button
              onClick={onOpenCart}
              className="w-full bg-[#023616] hover:bg-[#1e4d2b] text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-between shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#fd8b00] text-[#603100] text-xs font-black flex items-center justify-center">
                  {cartItemCount}
                </span>
                <span>View Smart Pickup Cart</span>
              </div>
              <div className="flex items-center gap-1 font-extrabold text-base text-[#bbefc1]">
                <span>₹{cartSubtotal}</span>
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </div>
            </button>
          </div>
        )}
        {/* Book Appointment Modal */}
        {isBookingOpen && (
          <BookAppointmentModal
            store={store}
            onClose={() => setIsBookingOpen(false)}
            onAppointmentBooked={() => {
              setIsBookingOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
