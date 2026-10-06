import React from 'react';
import { Order, Store, StoreReview, ProductReview } from '../types';
import { getGoogleMapsDirectionsUrl } from '../utils/geo';

interface OrderDetailsModalProps {
  order: Order;
  store?: Store;
  storeReview?: StoreReview | null;
  productReviews?: Record<string, ProductReview>; // productId -> review
  onClose: () => void;
  onRateStore: (order: Order) => void;
  onRateProducts: (order: Order) => void;
  onReorder: (order: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  store,
  storeReview,
  productReviews = {},
  onClose,
  onRateStore,
  onRateProducts,
  onReorder,
}) => {
  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';

  // Status timeline stages mapping
  const timelineStages = [
    { key: 'placed', label: 'Placed', icon: 'receipt_long' },
    { key: 'confirmed', label: 'Accepted', icon: 'thumb_up' },
    { key: 'packing', label: 'Preparing', icon: 'inventory_2' },
    { key: 'ready', label: 'Ready', icon: 'verified' },
    { key: 'completed', label: 'Completed', icon: 'check_circle' },
  ];

  const getStageIndex = (status: Order['status']) => {
    switch (status) {
      case 'placed':
        return 0;
      case 'confirmed':
        return 1;
      case 'packing':
        return 2;
      case 'ready':
      case 'out_for_delivery':
        return 3;
      case 'completed':
        return 4;
      case 'cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(order.status);

  // Fallback financial computations
  const subtotal = order.subtotal ?? order.items.reduce((acc, it) => acc + it.product.price * it.quantity, 0);
  const deliveryFee = order.deliveryFee ?? (order.type === 'home_delivery' ? 30 : 0);
  const platformFee = order.platformFee ?? 0;
  const total = order.totalAmount ?? (subtotal + deliveryFee + platformFee);

  const directionsUrl = getGoogleMapsDirectionsUrl(
    31.4428,
    76.7153,
    order.storeLocation?.latitude || store?.latitude || 31.4428,
    order.storeLocation?.longitude || store?.longitude || 76.7153
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-lg max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border border-[#edeeef] flex flex-col text-left animate-in slide-in-from-bottom-4 duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-[#023616] p-4 text-white flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider text-white">
                Order {order.orderNumber}
              </span>
              <span className="text-[10px] bg-white/20 text-[#bbefc1] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {order.type === 'smart_pickup' ? '⚡ Smart Pickup' : '🚚 Delivery'}
              </span>
            </div>
            <p className="text-xs text-[#8bbd92] mt-0.5">
              Ordered: {order.orderTime}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Order Status Timeline */}
          {!isCancelled ? (
            <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-[#edeeef]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-[#191c1d]">Order Status Timeline</span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider bg-[#bbefc1]/50 text-[#00210b]">
                  {order.status.toUpperCase()}
                </span>
              </div>

              {/* Progress Stepper */}
              <div className="flex items-center justify-between relative px-2">
                {/* Connecting track line */}
                <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-[#c1c9be]/40 -z-0" />
                <div
                  className="absolute top-3.5 left-4 h-0.5 bg-[#023616] transition-all duration-500 -z-0"
                  style={{
                    width: `${Math.min(100, (currentStageIndex / (timelineStages.length - 1)) * 100)}%`,
                  }}
                />

                {timelineStages.map((stage, idx) => {
                  const isDone = currentStageIndex >= idx;
                  const isCurrent = currentStageIndex === idx;

                  return (
                    <div key={stage.key} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                          isCurrent
                            ? 'bg-[#023616] text-white ring-4 ring-[#bbefc1] scale-110 shadow-sm'
                            : isDone
                            ? 'bg-[#023616] text-white'
                            : 'bg-white border-2 border-[#c1c9be] text-[#717970]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{stage.icon}</span>
                      </div>
                      <span
                        className={`text-[10px] mt-1 font-bold whitespace-nowrap ${
                          isCurrent ? 'text-[#023616]' : isDone ? 'text-[#191c1d]' : 'text-[#717970]'
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Cancelled Order Banner */
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-900">
              <div className="flex items-center gap-2 font-black text-sm text-red-800">
                <span className="material-symbols-outlined text-lg">cancel</span>
                <span>Order Cancelled</span>
              </div>
              <p className="text-xs text-red-700 mt-1">
                Reason: {order.cancellationReason || 'Merchant could not fulfill at this time. Refund processed.'}
              </p>
            </div>
          )}

          {/* Store Info Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <span className="text-[10px] uppercase font-bold text-[#717970]">Merchant</span>
              <h4 className="font-extrabold text-sm text-[#191c1d] truncate mt-0.5">
                {order.storeName}
              </h4>
              <p className="text-xs text-[#414941] truncate mt-0.5">
                📍 {order.storeAddress}
              </p>
            </div>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#f8f9fa] hover:bg-[#edeeef] text-[#023616] border border-[#c1c9be] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-sm text-[#fd8b00]">directions</span>
              <span>Map</span>
            </a>
          </div>

          {/* Pickup / Delivery Information */}
          <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-[#191c1d] uppercase tracking-wider">
              {order.type === 'smart_pickup' ? 'Smart Pickup Information' : 'Delivery Information'}
            </h4>

            {order.type === 'smart_pickup' ? (
              <div className="bg-[#bbefc1]/20 p-3 rounded-xl border border-[#bbefc1] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[#023616]">Counter Verification OTP</div>
                  <div className="text-xl font-black text-[#023616] tracking-wider mt-0.5">
                    OTP {order.pickupOtp}
                  </div>
                  <div className="text-[10px] text-[#414941]">Show OTP to merchant counter at pickup</div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#717970]">Ready By</span>
                  <div className="text-xs font-extrabold text-[#191c1d]">
                    {order.estimatedReadyTime}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#414941] space-y-1">
                <div>
                  <span className="font-bold text-[#191c1d]">Customer Name: </span>
                  {order.customerName || 'Aditya Kumar'} ({order.customerPhone || '+91 98160 46460'})
                </div>
                {order.deliveryAddress && (
                  <div>
                    <span className="font-bold text-[#191c1d]">Address: </span>
                    {order.deliveryAddress.house}, {order.deliveryAddress.area}, {order.deliveryAddress.town}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Complete Item List */}
          <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-[#191c1d] uppercase tracking-wider">
              Ordered Items ({order.items.reduce((acc, it) => acc + it.quantity, 0)})
            </h4>

            <div className="divide-y divide-[#edeeef]">
              {order.items.map((it, idx) => {
                const prodRev = productReviews[it.product.id];

                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#191c1d]">
                          {it.quantity}x
                        </span>
                        <span className="font-semibold text-xs text-[#191c1d] truncate">
                          {it.product.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#717970] mt-0.5">
                        ₹{it.product.price} each · {it.product.unit}
                      </div>

                      {/* Display Product Review if already rated */}
                      {prodRev && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 font-bold">
                          <span className="material-symbols-outlined text-xs text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                            star
                          </span>
                          <span>Rated {prodRev.rating}/5</span>
                          {prodRev.review && (
                            <span className="text-[#717970] font-normal truncate max-w-[200px]">
                              - "{prodRev.review}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-black text-[#191c1d] shrink-0">
                      ₹{it.product.price * it.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-2">
            <h4 className="text-xs font-bold text-[#191c1d] uppercase tracking-wider">
              Payment & Bill Breakdown
            </h4>

            <div className="space-y-1.5 text-xs text-[#414941]">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[#191c1d]">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery / Packaging Fee</span>
                <span className="font-semibold text-[#191c1d]">
                  {deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE (Smart Pickup)'}
                </span>
              </div>
              {platformFee > 0 && (
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span className="font-semibold text-[#191c1d]">₹{platformFee}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#edeeef] flex justify-between items-center text-sm font-extrabold text-[#023616]">
                <span>Total Amount</span>
                <span>₹{total}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#edeeef] flex justify-between items-center text-xs">
              <div>
                <span className="text-[#717970]">Payment Method: </span>
                <span className="font-bold text-[#191c1d]">{order.paymentMethod || 'Cash on Pickup'}</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded uppercase bg-emerald-100 text-emerald-900">
                {order.paymentStatus || (isCompleted ? 'PAID' : 'PAY AT COUNTER')}
              </span>
            </div>
          </div>

          {/* Store Review Badge if rated */}
          {storeReview && (
            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span>Your Store Rating: {storeReview.rating} / 5</span>
                </span>
                <span className="text-[10px] text-amber-700">Verified Review</span>
              </div>
              {storeReview.review && (
                <p className="text-xs text-amber-800 italic mt-1">"{storeReview.review}"</p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-[#f8f9fa] border-t border-[#edeeef] shrink-0 flex flex-wrap gap-2">
          {isCompleted && (
            <>
              <button
                type="button"
                onClick={() => onRateStore(order)}
                className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <span className="material-symbols-outlined text-sm text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                <span>{storeReview ? 'Edit Store Rating' : 'Rate Store'}</span>
              </button>

              <button
                type="button"
                onClick={() => onRateProducts(order)}
                className="flex-1 py-2.5 bg-[#f3f4f5] hover:bg-[#e7e8e9] border border-[#c1c9be] text-[#191c1d] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-sm text-[#023616]">rate_review</span>
                <span>Rate Products</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onReorder(order)}
            className="flex-1 py-2.5 bg-[#023616] hover:bg-[#1e4d2b] active:scale-98 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <span className="material-symbols-outlined text-sm">repeat</span>
            <span>Reorder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
