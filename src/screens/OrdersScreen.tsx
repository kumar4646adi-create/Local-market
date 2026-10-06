import React, { useState } from 'react';
import { Order, UserLocation, Store, StoreReview, ProductReview } from '../types';
import { calculateDistanceKm, formatDistance, estimateTravelMinutes, getGoogleMapsDirectionsUrl } from '../utils/geo';

interface OrdersScreenProps {
  orders: Order[];
  userLocation: UserLocation;
  stores?: Store[];
  storeReviews?: Record<string, StoreReview>; // orderId -> review
  productReviews?: Record<string, ProductReview>; // `${orderId}_${productId}` -> review
  isGuest?: boolean;
  onOpenAuthModal?: () => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onCustomerArrived: (orderId: string) => void;
  onExploreMore: () => void;
  onSelectOrder?: (order: Order) => void;
  onRateStore?: (order: Order) => void;
  onRateProducts?: (order: Order) => void;
  onReorder?: (order: Order) => void;
}

export function formatOrderStatus(status: Order['status']): string {
  switch (status) {
    case 'placed':
      return 'PLACED';
    case 'confirmed':
      return 'ACCEPTED';
    case 'packing':
      return 'PREPARING';
    case 'ready':
      return 'READY';
    case 'out_for_delivery':
      return 'OUT_FOR_DELIVERY';
    case 'completed':
      return 'COMPLETED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return String(status).toUpperCase();
  }
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  orders,
  userLocation,
  stores = [],
  storeReviews = {},
  isGuest = false,
  onOpenAuthModal,
  onUpdateOrderStatus,
  onCustomerArrived,
  onExploreMore,
  onSelectOrder,
  onRateStore,
  onRateProducts,
  onReorder,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const activeOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

  const displayedOrders =
    filter === 'ACTIVE'
      ? activeOrders
      : filter === 'COMPLETED'
      ? completedOrders
      : filter === 'CANCELLED'
      ? cancelledOrders
      : orders;

  const getStatusBadgeClass = (status: Order['status']) => {
    switch (status) {
      case 'ready':
        return 'bg-[#bbefc1] text-[#00210b] ring-1 ring-[#023616]/30 animate-pulse';
      case 'packing':
        return 'bg-amber-100 text-amber-900 border border-amber-300';
      case 'confirmed':
        return 'bg-indigo-100 text-indigo-900 border border-indigo-200';
      case 'placed':
        return 'bg-blue-100 text-blue-900 border border-blue-200';
      case 'out_for_delivery':
        return 'bg-teal-100 text-teal-900 border border-teal-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-900 border border-red-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="pb-24 pt-3 text-left">
      {/* Guest Mode Banner (Requirement 9) */}
      {isGuest && (
        <div className="mb-4 p-3.5 bg-gradient-to-r from-emerald-50 to-[#bbefc1]/30 rounded-2xl border border-[#bbefc1] flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#023616] text-xl">account_circle</span>
            <div>
              <p className="text-xs font-bold text-[#191c1d]">Browsing as a Guest</p>
              <p className="text-[11px] text-[#414941]">Log in to track your personal Smart Pickup and delivery orders across devices.</p>
            </div>
          </div>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="bg-[#023616] hover:bg-[#1e4d2b] text-white px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 shadow-xs cursor-pointer"
            >
              Log In
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#191c1d] tracking-tight">
            Order History
          </h1>
          <p className="text-xs text-[#717970] mt-0.5">
            Real-time Smart Pickup & local Ghumarwin store orders
          </p>
        </div>

        {/* 4 Tabs: ALL, ACTIVE, COMPLETED, CANCELLED */}
        <div className="flex bg-[#edeeef] p-1 rounded-2xl text-xs font-bold overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              filter === 'ALL' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
            }`}
          >
            ALL ({orders.length})
          </button>
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              filter === 'ACTIVE' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
            }`}
          >
            ACTIVE ({activeOrders.length})
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              filter === 'COMPLETED' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
            }`}
          >
            COMPLETED ({completedOrders.length})
          </button>
          <button
            onClick={() => setFilter('CANCELLED')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              filter === 'CANCELLED' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
            }`}
          >
            CANCELLED ({cancelledOrders.length})
          </button>
        </div>
      </div>

      {/* Requirement 7: If there are no orders: Display: "No orders yet" */}
      {displayedOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#edeeef] shadow-xs my-6">
          <div className="w-16 h-16 rounded-full bg-[#f3f4f5] text-[#717970] flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-4xl">receipt_long</span>
          </div>
          <h3 className="font-extrabold text-base text-[#191c1d]">No orders yet</h3>
          <p className="text-xs text-[#717970] mt-1 max-w-xs mx-auto">
            {filter === 'ALL'
              ? 'Order ahead from your favorite Ghumarwin shops to skip the line with zero wait time.'
              : `No orders in ${filter.toLowerCase()} status.`}
          </p>
          <button
            onClick={onExploreMore}
            className="mt-4 bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <span>Explore Local Shops</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map((order) => {
            const isActive = order.status !== 'completed' && order.status !== 'cancelled';
            const isCompleted = order.status === 'completed';
            const isCancelled = order.status === 'cancelled';
            const storeObj = stores.find((s) => s.id === order.storeId);
            const storeImage = order.storeImage || storeObj?.image;

            const storeLat = order.storeLocation?.latitude || storeObj?.latitude || 31.4428;
            const storeLng = order.storeLocation?.longitude || storeObj?.longitude || 76.7153;

            const realDist = calculateDistanceKm(
              userLocation.latitude,
              userLocation.longitude,
              storeLat,
              storeLng
            );

            const travelMins = estimateTravelMinutes(realDist);
            const directionsUrl = getGoogleMapsDirectionsUrl(
              userLocation.latitude,
              userLocation.longitude,
              storeLat,
              storeLng
            );

            const existingStoreRev = storeReviews[order.id];

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder?.(order)}
                className={`bg-white rounded-3xl p-4 border transition-all shadow-xs cursor-pointer hover:border-[#023616]/40 hover:shadow-md ${
                  isActive ? 'border-[#023616]/40 shadow-sm' : 'border-[#edeeef]'
                }`}
              >
                {/* Header: Store Image, Store Name, Order ID, Date & Status */}
                <div className="flex gap-3 items-start pb-3 border-b border-[#edeeef]">
                  {/* Store Image/Logo */}
                  <div className="w-12 h-12 rounded-xl bg-[#edeeef] overflow-hidden shrink-0 border border-[#c1c9be]/40 relative">
                    {storeImage ? (
                      <img
                        src={storeImage}
                        alt={order.storeName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#023616]">
                        <span className="material-symbols-outlined text-xl">storefront</span>
                      </div>
                    )}
                  </div>

                  {/* Store Details and Order ID */}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <h3 className="font-extrabold text-sm text-[#191c1d] truncate">
                          {order.storeName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#717970] mt-0.5">
                          <span className="font-mono font-bold text-[#023616]">{order.orderNumber}</span>
                          <span>·</span>
                          <span>{order.orderTime}</span>
                        </div>
                      </div>

                      {/* Current Order Status Badge */}
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${getStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {formatOrderStatus(order.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pickup / Delivery & Payment Meta Strip */}
                <div className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-[#edeeef]/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-[#f3f4f5] text-[#414941]">
                      {order.type === 'smart_pickup' ? '⚡ Smart Pickup' : '🚚 Home Delivery'}
                    </span>
                    <span className="text-[11px] text-[#717970]">
                      Payment: <span className="font-semibold text-[#191c1d]">{order.paymentMethod || 'Cash on Pickup'}</span>
                    </span>
                  </div>

                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {order.paymentStatus || (isCompleted ? 'PAID' : 'PAY AT COUNTER')}
                  </span>
                </div>

                {/* Smart Pickup OTP Card if Active */}
                {isActive && order.type === 'smart_pickup' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="my-3 p-3 bg-gradient-to-tr from-[#bbefc1]/25 to-[#f8f9fa] rounded-2xl border border-[#bbefc1] space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[11px] font-bold text-[#023616] uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-[#fd8b00]">storefront</span>
                          <span>Pickup Counter Details</span>
                        </div>
                        <div className="text-xs text-[#414941] mt-0.5 truncate">
                          📍 {order.storeAddress}
                        </div>
                      </div>

                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-white text-[#023616] border border-[#023616] rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs hover:bg-[#bbefc1]/30 shrink-0"
                      >
                        <span className="material-symbols-outlined text-sm text-[#fd8b00]">directions</span>
                        <span>Directions</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-3 text-xs pt-1 border-t border-[#bbefc1]/60">
                      <span className="font-bold text-[#023616]">
                        {formatDistance(realDist)} away
                      </span>
                      <span>·</span>
                      <span className="text-[#414941]">
                        Arrival: ~{travelMins} min
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#717970]">Pickup OTP:</span>
                        <div className="text-xl font-black text-[#023616] tracking-wider">
                          OTP {order.pickupOtp}
                        </div>
                      </div>

                      {order.customerArrivedAtCounter ? (
                        <span className="bg-[#bbefc1] text-[#00210b] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">notifications_active</span>
                          <span>Merchant Notified</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onCustomerArrived(order.id)}
                          className="bg-[#fd8b00] hover:brightness-105 active:scale-95 text-[#603100] px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1 shadow-md cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">hail</span>
                          <span>I'm Here!</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Cancelled Order Reason Banner */}
                {isCancelled && (
                  <div className="my-2.5 p-2.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-base text-red-600 shrink-0 mt-0.5">info</span>
                    <div>
                      <span className="font-bold">Cancellation Reason: </span>
                      <span>{order.cancellationReason || 'Merchant unable to fulfill item. No amount charged.'}</span>
                    </div>
                  </div>
                )}

                {/* Ordered Items summary */}
                <div className="py-2.5 space-y-1 text-xs text-[#414941]">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="truncate pr-2">
                        <span className="font-bold text-[#191c1d]">{it.quantity}x</span> {it.product.name}
                      </span>
                      <span className="font-semibold text-[#191c1d] shrink-0">
                        ₹{it.product.price * it.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer: Total Amount & Action Buttons */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="pt-3 border-t border-[#edeeef] flex flex-wrap justify-between items-center gap-2"
                >
                  <div>
                    <span className="text-[11px] text-[#717970]">Total: </span>
                    <span className="text-base font-extrabold text-[#023616]">
                      ₹{order.totalAmount}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {order.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                        className="bg-[#023616] hover:bg-[#1e4d2b] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        <span>Confirm Collected</span>
                      </button>
                    )}

                    {isCompleted && (
                      <>
                        {/* Rate Store Button */}
                        <button
                          type="button"
                          onClick={() => onRateStore?.(order)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            existingStoreRev
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-sm text-amber-500"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            star
                          </span>
                          <span>{existingStoreRev ? `Rated (${existingStoreRev.rating}★)` : 'Rate Store'}</span>
                        </button>

                        {/* Rate Products Button */}
                        <button
                          type="button"
                          onClick={() => onRateProducts?.(order)}
                          className="bg-[#f8f9fa] hover:bg-[#edeeef] text-[#191c1d] border border-[#c1c9be] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm text-[#023616]">rate_review</span>
                          <span>Rate Items</span>
                        </button>

                        {/* Reorder Button */}
                        <button
                          type="button"
                          onClick={() => onReorder?.(order)}
                          className="bg-[#023616] hover:bg-[#1e4d2b] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-sm">repeat</span>
                          <span>Reorder</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectOrder?.(order)}
                      className="bg-[#edeeef] hover:bg-[#e1e3e4] text-[#191c1d] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Details</span>
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
