import React, { useState } from 'react';
import { CartItem, Order, UserLocation, Store, DeliveryAddress } from '../types';
import { calculateDistanceKm, formatDistance, estimateTravelMinutes, getGoogleMapsDirectionsUrl } from '../utils/geo';
import { GoogleMapsLocationPicker } from './GoogleMapsLocationPicker';

interface CartDrawerProps {
  cart: CartItem[];
  stores: Store[];
  userLocation: UserLocation;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  isGuest?: boolean;
  onRequireAuth?: () => void;
  onClose: () => void;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onClearCart: () => void;
  onOrderPlaced: (newOrder: Order) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  cart,
  stores,
  userLocation,
  customerId = 'cust-aditya-kumar',
  customerName = 'Aditya Kumar',
  customerPhone = '+91 98160 46460',
  isGuest = false,
  onRequireAuth,
  onClose,
  onUpdateQuantity,
  onClearCart,
  onOrderPlaced,
}) => {
  const [fulfillmentType, setFulfillmentType] = useState<'smart_pickup' | 'home_delivery'>('smart_pickup');
  const [pickupSlot, setPickupSlot] = useState<string>('Ready in 15 mins (Express)');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDeliveryMapPicker, setShowDeliveryMapPicker] = useState<boolean>(false);

  // Delivery Address Form (Requirement 20)
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    house: 'Aditya Home / Flat 3',
    area: userLocation.area || 'Bharari Bazaar',
    landmark: 'Near Main Market',
    town: userLocation.city || 'Ghumarwin',
    district: userLocation.district || 'Bilaspur',
    state: userLocation.state || 'Himachal Pradesh',
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    formattedAddress: `${userLocation.area}, ${userLocation.city}, ${userLocation.district}`,
  });

  const activeStore = stores.find((s) => s.id === cart[0]?.storeId);
  const storeLat = activeStore?.latitude || 31.4428;
  const storeLng = activeStore?.longitude || 76.7153;

  const realDistanceKm = calculateDistanceKm(
    userLocation.latitude,
    userLocation.longitude,
    storeLat,
    storeLng
  );

  const estimatedArrivalMins = estimateTravelMinutes(realDistanceKm);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = fulfillmentType === 'home_delivery' ? 25 : 0;
  const grandTotal = subtotal + deliveryFee;

  const directionsUrl = getGoogleMapsDirectionsUrl(
    userLocation.latitude,
    userLocation.longitude,
    storeLat,
    storeLng
  );

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (isGuest && onRequireAuth) {
      onRequireAuth();
      return;
    }
    setIsSubmitting(true);

    setTimeout(() => {
      const orderNum = Math.floor(1000 + Math.random() * 9000);
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: `#GW-${orderNum}`,
        storeId: cart[0]?.storeId || 'store-1',
        storeName: cart[0]?.storeName || 'Ghumarwin Local Store',
        storeImage: activeStore?.image || '',
        storeAddress: activeStore?.address || 'Bharari Bazaar Road, Ghumarwin',
        storeLocation: {
          latitude: storeLat,
          longitude: storeLng,
        },
        customerId,
        customerName,
        customerPhone,
        deliveryAddress: fulfillmentType === 'home_delivery' ? deliveryAddress : undefined,
        items: cart.map((i) => ({
          product: i.product,
          quantity: i.quantity,
        })),
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        platformFee: 0,
        totalAmount: grandTotal,
        paymentMethod: fulfillmentType === 'smart_pickup' ? 'Cash on Pickup' : 'Pay on Delivery',
        paymentStatus: 'Pending',
        status: 'placed',
        type: fulfillmentType,
        orderTime: 'Just now',
        createdAt: new Date().toISOString(),
        estimatedReadyTime: fulfillmentType === 'smart_pickup' ? `${estimatedArrivalMins} minutes` : '30-40 minutes',
        pickupOtp: otp,
        notes: notes || undefined,
        customerArrivedAtCounter: false,
      };

      onOrderPlaced(newOrder);
      onClearCart();
      setIsSubmitting(false);
      onClose();
    }, 700);
  };

  if (showDeliveryMapPicker) {
    return (
      <GoogleMapsLocationPicker
        initialLat={deliveryAddress.latitude || userLocation.latitude}
        initialLng={deliveryAddress.longitude || userLocation.longitude}
        title="Set Delivery Pin on Google Maps"
        confirmLabel="Confirm Delivery Location"
        onConfirmLocation={({ latitude, longitude, addressData }) => {
          setDeliveryAddress((prev) => ({
            ...prev,
            latitude,
            longitude,
            area: addressData.area,
            town: addressData.city,
            district: addressData.district,
            state: addressData.state,
            formattedAddress: addressData.formattedAddress,
          }));
          setShowDeliveryMapPicker(false);
        }}
        onCancel={() => setShowDeliveryMapPicker(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#edeeef] flex justify-between items-center bg-[#f8f9fa]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#023616] text-xl">shopping_basket</span>
            <div>
              <h3 className="font-extrabold text-base text-[#191c1d]">
                Smart Pickup & Checkout
              </h3>
              {cart.length > 0 && (
                <p className="text-xs text-[#717970] truncate max-w-[240px]">
                  Ordering from: <span className="font-semibold text-[#191c1d]">{cart[0].storeName}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#edeeef] hover:bg-[#e7e8e9] flex items-center justify-center text-[#414941] cursor-pointer"
            aria-label="Close cart"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-left">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-[#717970]">
              <span className="material-symbols-outlined text-5xl text-[#c1c9be] mb-2">
                shopping_bag
              </span>
              <p className="text-sm font-semibold">Your cart is empty</p>
              <p className="text-xs text-[#717970] mt-1">Browse stores in Ghumarwin to order ahead.</p>
            </div>
          ) : (
            <>
              {/* Delivery / Pickup Switcher */}
              <div className="grid grid-cols-2 gap-2 bg-[#f3f4f5] p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFulfillmentType('smart_pickup')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    fulfillmentType === 'smart_pickup'
                      ? 'bg-[#023616] text-white shadow-xs'
                      : 'text-[#414941] hover:text-[#191c1d]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  <span>Smart Pickup (FREE)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentType('home_delivery')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    fulfillmentType === 'home_delivery'
                      ? 'bg-[#023616] text-white shadow-xs'
                      : 'text-[#414941] hover:text-[#191c1d]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">two_wheeler</span>
                  <span>Home Delivery (₹25)</span>
                </button>
              </div>

              {/* Requirement 21 & 22: Smart Pickup Card */}
              {fulfillmentType === 'smart_pickup' && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-[#bbefc1]/30 to-[#f8f9fa] border border-[#bbefc1] space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[11px] font-bold text-[#023616] uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-[#fd8b00]">bolt</span>
                        <span>Pickup Location</span>
                      </div>
                      <div className="font-extrabold text-sm text-[#191c1d] mt-0.5">
                        📍 {cart[0].storeName}
                      </div>
                      <div className="text-xs text-[#414941] mt-0.5">
                        {activeStore?.address || 'Bharari Bazaar Road, Ghumarwin'}
                      </div>
                    </div>

                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-white text-[#023616] border border-[#023616] rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-[#bbefc1]/30 shadow-xs shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm font-bold text-[#fd8b00]">directions</span>
                      <span>Directions</span>
                    </a>
                  </div>

                  {/* Estimated distance & arrival time */}
                  <div className="flex items-center gap-4 pt-2 border-t border-[#bbefc1]/60 text-xs">
                    <div>
                      <span className="text-[#717970]">Distance: </span>
                      <span className="font-black text-[#023616]">{formatDistance(realDistanceKm)} away</span>
                    </div>
                    <div>
                      <span className="text-[#717970]">Estimated Arrival: </span>
                      <span className="font-black text-[#023616]">~{estimatedArrivalMins} mins</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Requirement 20: Delivery Address Details */}
              {fulfillmentType === 'home_delivery' && (
                <div className="p-3.5 rounded-2xl bg-[#f8f9fa] border border-[#edeeef] space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[#191c1d] flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[#023616]">home_pin</span>
                      <span>Delivery Address</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDeliveryMapPicker(true)}
                      className="text-xs font-bold text-[#023616] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">map</span>
                      <span>Choose on Map</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-[#717970] mb-0.5">
                        House / Flat / Shop Name *
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.house}
                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, house: e.target.value })}
                        placeholder="House: Aditya Home"
                        className="w-full p-2 rounded-lg border border-[#edeeef] bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#717970] mb-0.5">
                        Area / Bazaar *
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.area}
                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, area: e.target.value })}
                        placeholder="Bharari"
                        className="w-full p-2 rounded-lg border border-[#edeeef] bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-[#717970] mb-0.5">
                        Landmark
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress.landmark}
                        onChange={(e) => setDeliveryAddress({ ...deliveryAddress, landmark: e.target.value })}
                        placeholder="Near Main Market"
                        className="w-full p-2 rounded-lg border border-[#edeeef] bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#717970] mb-0.5">
                        Town / District
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={`${deliveryAddress.town}, ${deliveryAddress.district}`}
                        className="w-full p-2 rounded-lg border border-[#edeeef] bg-[#edeeef] text-[#717970] text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Items Card */}
              <div className="bg-[#f8f9fa] rounded-2xl p-3 border border-[#edeeef] divide-y divide-[#edeeef]">
                {cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-bold text-xs sm:text-sm text-[#191c1d] truncate">
                        {item.product.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-[#717970] mt-0.5">
                        <span>₹{item.product.price} each</span>
                        <span>·</span>
                        <span className="font-bold text-[#023616]">₹{item.product.price * item.quantity}</span>
                      </div>
                    </div>

                    <div className="flex items-center bg-white border border-[#c1c9be] rounded-lg overflow-hidden shadow-2xs">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-[#191c1d] hover:bg-[#f3f4f5] font-bold"
                        aria-label="Decrease quantity"
                      >
                        <span className="material-symbols-outlined text-xs">remove</span>
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-[#023616]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-[#191c1d] hover:bg-[#f3f4f5] font-bold"
                        aria-label="Increase quantity"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bill Details */}
              <div className="bg-[#f8f9fa] rounded-xl p-3 border border-[#edeeef] text-xs space-y-1.5">
                <div className="flex justify-between text-[#414941]">
                  <span>Item Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-[#414941]">
                  <span>Fulfillment ({fulfillmentType === 'smart_pickup' ? 'Smart Pickup' : 'Home Delivery'})</span>
                  <span className={deliveryFee === 0 ? 'text-[#023616] font-bold' : ''}>
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="border-t border-[#edeeef] pt-1.5 flex justify-between text-sm font-extrabold text-[#191c1d]">
                  <span>Total Amount</span>
                  <span className="text-[#023616]">₹{grandTotal}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Checkout Button */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-[#edeeef] bg-white">
            <button
              onClick={handleCheckout}
              disabled={isSubmitting}
              className="w-full bg-[#023616] hover:bg-[#1e4d2b] active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-between shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="text-left">
                <div className="text-[11px] text-[#bbefc1] uppercase font-semibold">
                  {fulfillmentType === 'smart_pickup' ? 'Counter Pickup' : 'Express Delivery'}
                </div>
                <div className="text-base font-extrabold">₹{grandTotal}</div>
              </div>

              <div className="flex items-center gap-1.5 bg-[#fd8b00] text-[#603100] px-3.5 py-1.5 rounded-lg text-xs font-black">
                <span>{isSubmitting ? 'Placing Order...' : 'Confirm Order'}</span>
                <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
