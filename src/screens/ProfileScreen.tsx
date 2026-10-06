import React, { useState } from 'react';
import {
  UserLocation,
  Store,
  Order,
  Product,
  InventoryItem,
  Appointment,
  StoreReview,
  ProductReview,
  FavoriteStore,
} from '../types';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { GoogleMapsLocationPicker } from '../components/GoogleMapsLocationPicker';
import { getGoogleMapsDirectionsUrl } from '../utils/geo';
import {
  saveInventoryItemToFirestore,
  triggerAppointmentReminder,
  generateMerchantDailySummary,
} from '../firebase/automation';
import { approveMerchantInFirestore, updateOrderStatusInFirestore } from '../firebase/services';
import { getAsiaKolkataDateString, formatAsiaKolkataDateTime } from '../utils/timezone';
import { formatOrderStatus } from './OrdersScreen';

interface ProfileScreenProps {
  userLocation: UserLocation;
  stores: Store[];
  orders: Order[];
  favoriteStores?: FavoriteStore[];
  customerStoreReviews?: StoreReview[];
  customerProductReviews?: ProductReview[];
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  currentUser?: any;
  onOpenListShop: () => void;
  onOpenLocation: () => void;
  onUpdateStoreLocation: (storeId: string, lat: number, lng: number, address: string) => void;
  onViewStore: (store: Store) => void;
  onOpenAutomationDrawer: () => void;
  onOpenContacts?: () => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  onToggleFavorite?: (store: Store) => void;
  onSelectOrder?: (order: Order) => void;
  onRateStore?: (order: Order) => void;
  onRateProducts?: (order: Order) => void;
  onReorder?: (order: Order) => void;
  onEditStoreReview?: (review: StoreReview) => void;
  onEditProductReview?: (review: ProductReview) => void;
  onSignInWithGoogle?: () => void;
  onSignOut?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userLocation,
  stores,
  orders,
  favoriteStores = [],
  customerStoreReviews = [],
  customerProductReviews = [],
  customerId = 'cust-aditya-kumar',
  customerName = 'Aditya Kumar',
  customerEmail = 'kumar4646adi@gmail.com',
  currentUser,
  onOpenListShop,
  onOpenLocation,
  onUpdateStoreLocation,
  onViewStore,
  onOpenAutomationDrawer,
  onOpenContacts,
  onUpdateOrder,
  onToggleFavorite,
  onSelectOrder,
  onRateStore,
  onRateProducts,
  onReorder,
  onEditStoreReview,
  onEditProductReview,
  onSignInWithGoogle,
  onSignOut,
}) => {
  const [profileTab, setProfileTab] = useState<'customer' | 'merchant' | 'admin'>('customer');
  const [customerSubTab, setCustomerSubTab] = useState<
    'orders' | 'favorites' | 'storeReviews' | 'productReviews' | 'account'
  >('orders');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [merchantSubTab, setMerchantSubTab] = useState<'location' | 'orders' | 'inventory' | 'appointments' | 'summary'>('orders');
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [selectedAdminStore, setSelectedAdminStore] = useState<Store | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Selected merchant store for the dashboard (e.g. Sonu Kiryana Store)
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || 'store-1');
  const myMerchantStore = stores.find((s) => s.id === selectedStoreId) || stores[0];

  // Real inventory state for this store
  const [inventoryStock, setInventoryStock] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    myMerchantStore?.products.forEach((p, idx) => {
      // Realistic starting inventory: some ample, one low (4), one out of stock
      initial[p.id] = idx === 0 ? 12 : idx === 1 ? 4 : idx === 2 ? 8 : 15;
    });
    return initial;
  });

  // Real store appointments state
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 'apt-init-1',
      storeId: myMerchantStore.id,
      storeName: myMerchantStore.name,
      customerId: 'cust-aditya-kumar',
      customerName: 'Aditya Kumar',
      customerPhone: '+91 98160 46460',
      serviceType: 'Special Dairy Reserve & Tasting',
      date: getAsiaKolkataDateString(),
      timeSlot: '04:30 PM - 05:00 PM',
      notes: 'Please pack 2kg fresh paneer ahead of time.',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    },
  ]);

  const showNotification = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Merchant orders for this store
  const merchantOrders = orders.filter((o) => o.storeId === myMerchantStore.id);

  // Status progression action handlers (Emits automation events 2, 3, 4, 6, 7)
  const handleOrderStatusChange = async (order: Order, newStatus: Order['status']) => {
    try {
      await updateOrderStatusInFirestore(order, newStatus);
      const updated = { ...order, status: newStatus };
      onUpdateOrder(updated);
      showNotification(`Order ${order.orderNumber} status updated to ${newStatus} (Event dispatched!)`);
    } catch (err) {
      console.error('Failed to update order status:', err);
      showNotification('Failed to update order in Firestore');
    }
  };

  // Stock quantity adjuster (Emits automation events 8 and 9)
  const handleStockAdjustment = async (product: Product, delta: number) => {
    const current = inventoryStock[product.id] ?? 10;
    const nextQty = Math.max(0, current + delta);
    setInventoryStock((prev) => ({ ...prev, [product.id]: nextQty }));

    const invItem: InventoryItem = {
      id: `${myMerchantStore.id}_${product.id}`,
      storeId: myMerchantStore.id,
      storeName: myMerchantStore.name,
      productId: product.id,
      productName: product.name,
      price: product.price,
      unit: product.unit,
      stockQuantity: nextQty,
      lowStockThreshold: 5,
      inStock: nextQty > 0,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveInventoryItemToFirestore(invItem);
      if (nextQty === 0) {
        showNotification(`Event 9: stock_zero emitted for ${product.name}!`);
      } else if (nextQty <= 5) {
        showNotification(`Event 8: stock_low emitted (${nextQty} remaining)!`);
      } else {
        showNotification(`Stock updated for ${product.name}: ${nextQty} ${product.unit}`);
      }
    } catch (err) {
      console.error('Failed to update inventory:', err);
    }
  };

  // Trigger appointment reminder (Emits automation event 13)
  const handleSendReminder = async (apt: Appointment) => {
    try {
      await triggerAppointmentReminder(apt);
      setAppointments((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, status: 'reminded' } : a))
      );
      showNotification(`Event 13: appointment.reminder emitted for ${apt.customerName}!`);
    } catch (err) {
      console.error('Failed to send reminder:', err);
    }
  };

  // Generate daily sales summary (Emits automation event 14)
  const handleGenerateSummary = async () => {
    try {
      const summary = await generateMerchantDailySummary(
        myMerchantStore.id,
        myMerchantStore.name,
        orders
      );
      showNotification(
        `Event 14: daily_sales_summary emitted (Total Revenue: ₹${summary.totalRevenue}, Orders: ${summary.totalOrders})`
      );
    } catch (err) {
      console.error('Failed to generate daily summary:', err);
    }
  };

  // Approve merchant account in Admin view (Emits automation event 10)
  const handleApproveStore = async (store: Store) => {
    try {
      await approveMerchantInFirestore(store);
      store.approvalStatus = 'approved';
      showNotification(`Event 10: merchant.approved emitted for ${store.name}!`);
    } catch (err) {
      console.error('Failed to approve merchant:', err);
    }
  };

  return (
    <div className="pb-24 pt-3 text-left space-y-4">
      {/* Top Banner with Make.com Automation Events Inspector Trigger */}
      <div className="bg-gradient-to-r from-[#023616] to-[#1e4d2b] rounded-2xl p-3 text-white flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-300 text-lg">bolt</span>
          </div>
          <div>
            <div className="font-extrabold text-xs text-white">Event-Driven Automation Ready</div>
            <div className="text-[11px] text-[#bbefc1]">14 Events in Firestore · Asia/Kolkata timezone</div>
          </div>
        </div>

        <button
          onClick={onOpenAutomationDrawer}
          className="bg-[#fd8b00] hover:brightness-105 active:scale-95 text-[#603100] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-md cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-sm">hub</span>
          <span>View Make.com Stream</span>
        </button>
      </div>

      {actionFeedback && (
        <div className="bg-[#bbefc1] text-[#00210b] p-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs border border-[#023616]/20 animate-in fade-in">
          <span>✓ {actionFeedback}</span>
          <span className="text-[10px] font-mono">{formatAsiaKolkataDateTime()}</span>
        </div>
      )}

      {/* Profile Role Switcher (Customer / Merchant / Admin) */}
      <div className="flex bg-[#edeeef] p-1 rounded-2xl text-xs font-bold">
        <button
          onClick={() => setProfileTab('customer')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
            profileTab === 'customer' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
          }`}
        >
          Customer Profile
        </button>
        <button
          onClick={() => setProfileTab('merchant')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
            profileTab === 'merchant' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
          }`}
        >
          Merchant Dashboard
        </button>
        <button
          onClick={() => setProfileTab('admin')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
            profileTab === 'admin' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
          }`}
        >
          Admin & Approvals
        </button>
      </div>

      {/* CUSTOMER TAB */}
      {profileTab === 'customer' && (
        <div className="space-y-4">
          {/* Customer Sub-Navigation Menu (Requirement 5) */}
          <div className="flex bg-[#edeeef] p-1 rounded-2xl text-xs font-bold overflow-x-auto no-scrollbar gap-1">
            <button
              onClick={() => setCustomerSubTab('orders')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                customerSubTab === 'orders' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              <span>My Orders ({orders.length})</span>
            </button>
            <button
              onClick={() => setCustomerSubTab('favorites')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                customerSubTab === 'favorites' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                favorite
              </span>
              <span>Favorite Stores ({favoriteStores.length})</span>
            </button>
            <button
              onClick={() => setCustomerSubTab('storeReviews')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                customerSubTab === 'storeReviews' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                star
              </span>
              <span>My Store Reviews ({customerStoreReviews.length})</span>
            </button>
            <button
              onClick={() => setCustomerSubTab('productReviews')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                customerSubTab === 'productReviews' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">rate_review</span>
              <span>My Product Reviews ({customerProductReviews.length})</span>
            </button>
            <button
              onClick={() => setCustomerSubTab('account')}
              className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                customerSubTab === 'account' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">person</span>
              <span>Account Details</span>
            </button>
          </div>

          {/* SUB-SECTION 1: MY ORDERS */}
          {customerSubTab === 'orders' && (
            <div className="space-y-3">
              {/* Filter chips: ALL, ACTIVE, COMPLETED, CANCELLED */}
              <div className="flex justify-between items-center bg-white p-2.5 rounded-2xl border border-[#edeeef] shadow-xs">
                <span className="text-xs font-extrabold text-[#191c1d]">Filter:</span>
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((st) => {
                    const count =
                      st === 'ALL'
                        ? orders.length
                        : st === 'ACTIVE'
                        ? orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length
                        : st === 'COMPLETED'
                        ? orders.filter((o) => o.status === 'completed').length
                        : orders.filter((o) => o.status === 'cancelled').length;

                    return (
                      <button
                        key={st}
                        onClick={() => setOrderFilter(st)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                          orderFilter === st
                            ? 'bg-[#023616] text-white shadow-xs'
                            : 'bg-[#f3f4f5] text-[#414941] hover:text-[#191c1d]'
                        }`}
                      >
                        {st} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order Cards List */}
              {(() => {
                const activeOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
                const completedOrders = orders.filter((o) => o.status === 'completed');
                const cancelledOrders = orders.filter((o) => o.status === 'cancelled');
                const filtered =
                  orderFilter === 'ACTIVE'
                    ? activeOrders
                    : orderFilter === 'COMPLETED'
                    ? completedOrders
                    : orderFilter === 'CANCELLED'
                    ? cancelledOrders
                    : orders;

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white rounded-3xl p-8 text-center border border-[#edeeef]">
                      <span className="material-symbols-outlined text-4xl text-[#c1c9be]">receipt_long</span>
                      <p className="font-extrabold text-sm text-[#191c1d] mt-2">No orders yet</p>
                      <p className="text-xs text-[#717970] mt-1">
                        Order ahead from local Ghumarwin stores to skip the line with Smart Pickup.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filtered.map((ord) => {
                      const isComp = ord.status === 'completed';
                      const isCanc = ord.status === 'cancelled';
                      const stObj = stores.find((s) => s.id === ord.storeId);
                      const stImg = ord.storeImage || stObj?.image;

                      return (
                        <div
                          key={ord.id}
                          onClick={() => onSelectOrder?.(ord)}
                          className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs hover:border-[#023616]/40 transition-all cursor-pointer space-y-2.5"
                        >
                          <div className="flex gap-3 items-start">
                            <div className="w-12 h-12 rounded-xl bg-[#edeeef] overflow-hidden shrink-0 border border-[#c1c9be]/30 relative">
                              {stImg ? (
                                <img
                                  src={stImg}
                                  alt={ord.storeName}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#023616]">
                                  <span className="material-symbols-outlined text-lg">storefront</span>
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between items-start gap-1">
                                <div>
                                  <h4 className="font-extrabold text-sm text-[#191c1d] truncate">
                                    {ord.storeName}
                                  </h4>
                                  <div className="flex items-center gap-1.5 text-[11px] text-[#717970] mt-0.5">
                                    <span className="font-mono font-bold text-[#023616]">{ord.orderNumber}</span>
                                    <span>·</span>
                                    <span>{ord.orderTime}</span>
                                  </div>
                                </div>

                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-[#f3f4f5] text-[#191c1d]">
                                  {formatOrderStatus(ord.status)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Items and metadata */}
                          <div className="bg-[#f8f9fa] p-2 rounded-xl text-xs space-y-1 text-[#414941]">
                            {ord.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="truncate pr-2">
                                  <span className="font-bold text-[#191c1d]">{it.quantity}x</span> {it.product.name}
                                </span>
                                <span className="font-semibold text-[#191c1d]">
                                  ₹{it.product.price * it.quantity}
                                </span>
                              </div>
                            ))}
                          </div>

                          {isCanc && ord.cancellationReason && (
                            <div className="text-xs text-red-700 bg-red-50 p-2 rounded-lg">
                              Reason: {ord.cancellationReason}
                            </div>
                          )}

                          {/* Total and actions */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-2 border-t border-[#edeeef] flex justify-between items-center"
                          >
                            <div>
                              <span className="text-[11px] text-[#717970]">Total: </span>
                              <span className="text-sm font-extrabold text-[#023616]">₹{ord.totalAmount}</span>
                            </div>

                            <div className="flex gap-2">
                              {isComp && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onRateStore?.(ord)}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-xs text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                                      star
                                    </span>
                                    <span>Rate Store</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRateProducts?.(ord)}
                                    className="bg-[#f8f9fa] hover:bg-[#edeeef] text-[#191c1d] border border-[#c1c9be] text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                                  >
                                    Rate Items
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onReorder?.(ord)}
                                    className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer shadow-xs"
                                  >
                                    Reorder
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => onSelectOrder?.(ord)}
                                className="bg-[#edeeef] hover:bg-[#e1e3e4] text-[#191c1d] text-xs font-bold px-2 py-1 rounded-lg cursor-pointer"
                              >
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* SUB-SECTION 2: FAVORITE STORES */}
          {customerSubTab === 'favorites' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-sm text-[#191c1d]">
                  Your Favorite Stores
                </h4>
                <span className="text-xs text-[#717970]">
                  Synced with Firestore
                </span>
              </div>

              {favoriteStores.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-[#edeeef] shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-2">
                    <span className="material-symbols-outlined text-3xl">favorite_border</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#191c1d]">
                    You haven't added any favorite stores yet.
                  </h4>
                  <p className="text-xs text-[#717970] mt-1 max-w-xs mx-auto">
                    Tap the heart icon on any store card or store page to save it to your favorites.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favoriteStores.map((fav) => {
                    const fullStore = stores.find((s) => s.id === fav.storeId) || {
                      id: fav.storeId,
                      name: fav.storeName,
                      category: fav.category as any,
                      image: fav.image,
                      address: fav.address,
                      area: fav.area,
                      isOpen: true,
                      rating: 0,
                      reviewsCount: 0,
                      totalRatings: 0,
                    };

                    const storeRating = (fullStore as any).averageRating ?? fullStore.rating;
                    const ratingTotal = (fullStore as any).totalRatings ?? fullStore.reviewsCount ?? 0;

                    return (
                      <div
                        key={fav.storeId}
                        className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs flex items-center justify-between gap-3 text-left hover:border-[#023616]/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#edeeef] shrink-0 border border-[#c1c9be]/30 relative">
                            <img
                              src={fav.image || fullStore.image}
                              alt={fav.storeName}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-sm text-[#191c1d] truncate">
                                {fav.storeName}
                              </h5>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#f3f4f5] text-[#414941]">
                                {fav.category}
                              </span>
                            </div>

                            <p className="text-xs text-[#717970] truncate mt-0.5">
                              📍 {fav.area || fullStore.area}
                            </p>

                            <div className="flex items-center gap-2 mt-1 text-xs">
                              {ratingTotal > 0 ? (
                                <span className="flex items-center gap-0.5 font-bold text-[#00210b] bg-[#bbefc1]/40 px-1.5 py-0.2 rounded text-[11px]">
                                  <span className="material-symbols-outlined text-[12px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    star
                                  </span>
                                  <span>{storeRating.toFixed(1)}</span>
                                  <span className="text-[#414941] font-normal">({ratingTotal})</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#717970] bg-[#f3f4f5] px-1.5 py-0.2 rounded font-medium">
                                  No ratings yet
                                </span>
                              )}

                              <span className="text-[10px] font-bold text-[#023616]">
                                {fullStore.isOpen ? '● Open Now' : '○ Closed'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Heart toggle button */}
                          <button
                            type="button"
                            onClick={() => onToggleFavorite?.(fullStore as Store)}
                            className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center cursor-pointer transition-all"
                            title="Remove from favorites"
                          >
                            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                              favorite
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onViewStore(fullStore as Store)}
                            className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer shadow-xs"
                          >
                            Open Store
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-SECTION 3: MY STORE REVIEWS */}
          {customerSubTab === 'storeReviews' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-sm text-[#191c1d]">
                  Your Store Reviews ({customerStoreReviews.length})
                </h4>
                <span className="text-xs text-[#717970]">
                  Editable anytime
                </span>
              </div>

              {customerStoreReviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-[#edeeef] shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2">
                    <span className="material-symbols-outlined text-3xl">star</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#191c1d]">
                    No store reviews yet
                  </h4>
                  <p className="text-xs text-[#717970] mt-1 max-w-xs mx-auto">
                    You can rate and review any store from your completed orders to share your local shopping experience.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerStoreReviews.map((rev) => (
                    <div
                      key={rev.id || `${rev.orderId}_store`}
                      className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-2 text-left"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-extrabold text-sm text-[#191c1d]">
                            {rev.storeName || 'Merchant Store'}
                          </h5>
                          <span className="text-[11px] text-[#717970]">
                            Order ID: <span className="font-mono text-[#023616] font-bold">{rev.orderId}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onEditStoreReview?.(rev)}
                          className="text-xs font-bold text-[#023616] bg-[#bbefc1]/40 hover:bg-[#bbefc1]/70 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">edit</span>
                          <span>Edit</span>
                        </button>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            className={`material-symbols-outlined text-base ${
                              s <= rev.rating ? 'text-amber-400' : 'text-gray-300'
                            }`}
                            style={{ fontVariationSettings: s <= rev.rating ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            star
                          </span>
                        ))}
                        <span className="text-xs font-bold text-[#191c1d] ml-1">
                          {rev.rating} / 5
                        </span>
                      </div>

                      {rev.review && (
                        <p className="text-xs text-[#414941] bg-[#f8f9fa] p-2.5 rounded-xl border border-[#edeeef]">
                          "{rev.review}"
                        </p>
                      )}

                      <div className="text-[10px] text-[#717970] pt-1">
                        Updated: {formatAsiaKolkataDateTime(rev.updatedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-SECTION 4: MY PRODUCT REVIEWS */}
          {customerSubTab === 'productReviews' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-sm text-[#191c1d]">
                  Your Product Reviews ({customerProductReviews.length})
                </h4>
                <span className="text-xs text-[#717970]">
                  Purchased items
                </span>
              </div>

              {customerProductReviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-[#edeeef] shadow-xs">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                    <span className="material-symbols-outlined text-3xl">rate_review</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#191c1d]">
                    No product reviews yet
                  </h4>
                  <p className="text-xs text-[#717970] mt-1 max-w-xs mx-auto">
                    Rate products you purchased in your completed orders to help Ghumarwin neighbors pick the best groceries.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerProductReviews.map((rev) => (
                    <div
                      key={rev.id || `${rev.orderId}_${rev.productId}`}
                      className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-2 text-left"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-extrabold text-sm text-[#191c1d]">
                            {rev.productName || 'Purchased Product'}
                          </h5>
                          <span className="text-[11px] text-[#717970]">
                            Store: <span className="font-semibold text-[#191c1d]">{rev.storeName || 'Local Store'}</span> · Order: <span className="font-mono text-[#023616] font-bold">{rev.orderId}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onEditProductReview?.(rev)}
                          className="text-xs font-bold text-[#023616] bg-[#bbefc1]/40 hover:bg-[#bbefc1]/70 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">edit</span>
                          <span>Edit</span>
                        </button>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            className={`material-symbols-outlined text-base ${
                              s <= rev.rating ? 'text-amber-400' : 'text-gray-300'
                            }`}
                            style={{ fontVariationSettings: s <= rev.rating ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            star
                          </span>
                        ))}
                        <span className="text-xs font-bold text-[#191c1d] ml-1">
                          {rev.rating} / 5
                        </span>
                      </div>

                      {rev.review && (
                        <p className="text-xs text-[#414941] bg-[#f8f9fa] p-2.5 rounded-xl border border-[#edeeef]">
                          "{rev.review}"
                        </p>
                      )}

                      <div className="text-[10px] text-[#717970] pt-1">
                        Updated: {formatAsiaKolkataDateTime(rev.updatedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-SECTION 5: ACCOUNT DETAILS */}
          {customerSubTab === 'account' && (
            <div className="space-y-4">
              {/* Profile Header Card */}
              <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full bg-[#023616] text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
                  {customerName ? customerName.slice(0, 2).toUpperCase() : 'AK'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-extrabold text-base text-[#191c1d] truncate">
                      {customerName}
                    </h2>
                    <span className="material-symbols-outlined text-sm text-[#023616]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                  </div>
                  <p className="text-xs text-[#717970] truncate mt-0.5">
                    {customerEmail} · +91 98160 46460
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-[#023616] font-bold mt-1">
                    <span className="material-symbols-outlined text-xs">location_on</span>
                    <span className="truncate">{userLocation.formattedAddress}</span>
                  </div>
                </div>
              </div>

              {/* Google Authentication Account Card */}
              <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black text-base shrink-0">
                    G
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-xs text-[#191c1d]">Google Authentication</h4>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        Firebase Auth
                      </span>
                    </div>
                    <p className="text-[11px] text-[#717970] mt-0.5 truncate">
                      {currentUser?.email ? `Signed in as ${currentUser.email}` : 'Sign in to sync favorites & reviews across devices'}
                    </p>
                  </div>
                </div>

                {currentUser ? (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="bg-[#edeeef] hover:bg-[#e1e3e4] text-[#191c1d] text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer shrink-0 ml-2"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSignInWithGoogle}
                    className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer shadow-xs shrink-0 ml-2"
                  >
                    Sign In
                  </button>
                )}
              </div>

              {/* Location Management Card */}
              <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#191c1d] flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-[#023616]">near_me</span>
                    <span>Active Customer Location</span>
                  </span>
                  <button
                    onClick={onOpenLocation}
                    className="text-xs font-bold text-[#023616] hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                <p className="text-xs text-[#414941]">
                  📍 {userLocation.formattedAddress}
                </p>
                <div className="text-[11px] text-[#717970]">
                  Coordinate Source: <span className="font-semibold text-[#023616] uppercase">{userLocation.source}</span>
                </div>
              </div>

              {/* Google Contacts Workspace Integration Card */}
              <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">contacts</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-xs text-[#191c1d]">Google Contacts</h4>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                        Workspace
                      </span>
                    </div>
                    <p className="text-[11px] text-[#717970] mt-0.5">
                      Sync Ghumarwin merchants, store phone numbers & pickup contacts
                    </p>
                  </div>
                </div>

                {onOpenContacts && (
                  <button
                    type="button"
                    onClick={onOpenContacts}
                    className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer shadow-xs shrink-0 ml-2"
                  >
                    Manage
                  </button>
                )}
              </div>

              {/* Smart Pickup Pass Card */}
              <div className="bg-gradient-to-tr from-[#1e4d2b] to-[#023616] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-[#fd8b00] text-[#603100] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Ghumarwin Citizen Club
                    </span>
                    <span className="text-xs font-mono tracking-wider opacity-80">PASS #HP-2309</span>
                  </div>

                  <h3 className="font-extrabold text-lg text-white mb-1">
                    Zero-Queue Smart Pickup
                  </h3>
                  <p className="text-xs text-[#8bbd92] max-w-xs leading-relaxed">
                    Free instant order packing at verified Bharari Bazaar & Gandhi Chowk merchants.
                  </p>
                </div>
              </div>

              {/* Register Shop Card */}
              <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-[#bbefc1] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#00210b]">
                    Own a Shop in Ghumarwin?
                  </h4>
                  <p className="text-[11px] text-[#21502e] mt-0.5">
                    Register your storefront on Google Maps with confirmed coordinates.
                  </p>
                </div>
                <button
                  onClick={onOpenListShop}
                  className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs shrink-0 ml-2"
                >
                  List Shop
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MERCHANT DASHBOARD */}
      {profileTab === 'merchant' && (
        <div className="space-y-4">
          {/* Active Retailer Selector */}
          <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs flex justify-between items-center">
            <div>
              <span className="bg-[#bbefc1]/40 text-[#00210b] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Managing Retailer
              </span>
              <h3 className="font-extrabold text-base text-[#191c1d] mt-1">
                {myMerchantStore.name}
              </h3>
              <p className="text-xs text-[#717970] mt-0.5">
                📍 {myMerchantStore.area}, {myMerchantStore.city} · ID: {myMerchantStore.id}
              </p>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-[#f8f9fa] border border-[#edeeef] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#191c1d] cursor-pointer"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onViewStore(myMerchantStore)}
                className="bg-[#edeeef] hover:bg-[#e7e8e9] text-[#191c1d] text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Storefront
              </button>
            </div>
          </div>

          {/* Sub tabs in Merchant Dashboard */}
          <div className="flex bg-[#f3f4f5] p-1 rounded-xl text-[11px] font-bold overflow-x-auto">
            <button
              onClick={() => setMerchantSubTab('orders')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                merchantSubTab === 'orders' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
              }`}
            >
              Live Orders ({merchantOrders.length})
            </button>
            <button
              onClick={() => setMerchantSubTab('inventory')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                merchantSubTab === 'inventory' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
              }`}
            >
              Stock & Inventory
            </button>
            <button
              onClick={() => setMerchantSubTab('appointments')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                merchantSubTab === 'appointments' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
              }`}
            >
              Appointments ({appointments.length})
            </button>
            <button
              onClick={() => setMerchantSubTab('summary')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                merchantSubTab === 'summary' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
              }`}
            >
              Daily Sales (IST)
            </button>
            <button
              onClick={() => setMerchantSubTab('location')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                merchantSubTab === 'location' ? 'bg-[#023616] text-white shadow-xs' : 'text-[#414941]'
              }`}
            >
              GPS Map
            </button>
          </div>

          {/* SUB-TAB 1: LIVE ORDERS WORKFLOW */}
          {merchantSubTab === 'orders' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-sm text-[#191c1d]">
                  Order Fulfillment & Counter Pickup
                </h4>
                <span className="text-[11px] text-[#717970]">
                  Triggers Events #2, #3, #4, #6, #7
                </span>
              </div>

              {merchantOrders.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#edeeef]">
                  <span className="material-symbols-outlined text-4xl text-[#c1c9be]">
                    receipt_long
                  </span>
                  <p className="font-bold text-xs text-[#191c1d] mt-2">No orders placed yet for this store</p>
                  <p className="text-[11px] text-[#717970] mt-1">
                    Place an order as customer to test live merchant fulfillment!
                  </p>
                </div>
              ) : (
                merchantOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[#191c1d]">
                            {ord.orderNumber}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#f3f4f5] text-[#414941]">
                            {ord.type === 'smart_pickup' ? '⚡ Smart Pickup' : '🚚 Home Delivery'}
                          </span>
                        </div>
                        <div className="text-xs text-[#717970] mt-0.5">
                          Customer: <span className="font-bold text-[#191c1d]">{ord.customerName || 'Aditya Kumar'}</span> ({ord.customerPhone || '+91 98160 46460'})
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-[#023616] block">
                          ₹{ord.totalAmount}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                            ord.status === 'ready'
                              ? 'bg-[#bbefc1] text-[#00210b]'
                              : ord.status === 'packing'
                              ? 'bg-amber-100 text-amber-900'
                              : ord.status === 'placed'
                              ? 'bg-blue-100 text-blue-900'
                              : ord.status === 'completed'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                    </div>

                    {/* Customer arrived banner (Event 5) */}
                    {ord.customerArrivedAtCounter && ord.status !== 'completed' && (
                      <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-1.5 text-xs text-amber-950 font-black">
                          <span className="material-symbols-outlined text-sm text-amber-600">notifications_active</span>
                          <span>Customer is at your Counter right now!</span>
                        </div>
                        <span className="text-xs font-mono font-black text-[#023616] bg-white px-2 py-0.5 rounded border border-amber-200">
                          OTP: {ord.pickupOtp}
                        </span>
                      </div>
                    )}

                    {/* Ordered Items summary */}
                    <div className="bg-[#f8f9fa] p-2.5 rounded-xl border border-[#edeeef] text-xs space-y-1">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{it.quantity}x {it.product.name}</span>
                          <span className="font-bold">₹{it.product.price * it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons progression */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-[#edeeef]">
                      {ord.status === 'placed' && (
                        <button
                          onClick={() => handleOrderStatusChange(ord, 'confirmed')}
                          className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-sm">thumb_up</span>
                          <span>Accept Order (Event #2)</span>
                        </button>
                      )}

                      {(ord.status === 'placed' || ord.status === 'confirmed') && (
                        <button
                          onClick={() => handleOrderStatusChange(ord, 'packing')}
                          className="bg-[#fd8b00] hover:brightness-105 text-[#603100] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-sm">inventory_2</span>
                          <span>Start Packing / Preparing (Event #3)</span>
                        </button>
                      )}

                      {ord.status === 'packing' && (
                        <button
                          onClick={() => handleOrderStatusChange(ord, 'ready')}
                          className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-sm">verified</span>
                          <span>Mark Ready for Pickup (Event #4)</span>
                        </button>
                      )}

                      {ord.status === 'ready' && (
                        <button
                          onClick={() => handleOrderStatusChange(ord, 'completed')}
                          className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          <span>Verify OTP & Complete (Event #6)</span>
                        </button>
                      )}

                      {ord.status !== 'completed' && ord.status !== 'cancelled' && (
                        <button
                          onClick={() => handleOrderStatusChange(ord, 'cancelled')}
                          className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          <span>Cancel Order (Event #7)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUB-TAB 2: INVENTORY & STOCK MANAGEMENT */}
          {merchantSubTab === 'inventory' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-sm text-[#191c1d]">
                    Live Stock Inventory Control
                  </h4>
                  <p className="text-[11px] text-[#717970]">
                    Triggers Event #8 (stock_low when ≤ 5) & Event #9 (stock_zero when 0)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {myMerchantStore.products.map((prod) => {
                  const qty = inventoryStock[prod.id] ?? 10;
                  const isLow = qty > 0 && qty <= 5;
                  const isZero = qty === 0;

                  return (
                    <div
                      key={prod.id}
                      className="bg-white rounded-2xl p-3 border border-[#edeeef] shadow-xs flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-extrabold text-xs text-[#191c1d] truncate">
                            {prod.name}
                          </h5>
                          {isZero ? (
                            <span className="bg-red-100 text-red-900 text-[10px] font-black px-1.5 py-0.2 rounded uppercase">
                              Zero Stock (Out)
                            </span>
                          ) : isLow ? (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-1.5 py-0.2 rounded uppercase">
                              Low Stock Alert
                            </span>
                          ) : (
                            <span className="bg-[#bbefc1]/40 text-[#00210b] text-[10px] font-bold px-1.5 py-0.2 rounded">
                              In Stock
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#717970] mt-0.5">
                          ₹{prod.price} · {prod.unit}
                        </div>
                      </div>

                      {/* Stock Stepper */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleStockAdjustment(prod, -1)}
                          className="w-7 h-7 rounded-lg bg-[#edeeef] hover:bg-[#e7e8e9] font-black text-sm flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <div className="w-10 text-center font-mono font-extrabold text-sm text-[#023616]">
                          {qty}
                        </div>
                        <button
                          onClick={() => handleStockAdjustment(prod, 1)}
                          className="w-7 h-7 rounded-lg bg-[#edeeef] hover:bg-[#e7e8e9] font-black text-sm flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: APPOINTMENTS */}
          {merchantSubTab === 'appointments' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-sm text-[#191c1d]">
                    Customer Consultations & Appointments
                  </h4>
                  <p className="text-[11px] text-[#717970]">
                    Triggers Event #12 (created) and Event #13 (reminder)
                  </p>
                </div>
              </div>

              {appointments.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#edeeef]">
                  <span className="material-symbols-outlined text-4xl text-[#c1c9be]">
                    calendar_month
                  </span>
                  <p className="font-bold text-xs text-[#191c1d] mt-2">No appointments scheduled</p>
                </div>
              ) : (
                appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#bbefc1]/40 text-[#00210b]">
                          {apt.serviceType}
                        </span>
                        <h5 className="font-extrabold text-sm text-[#191c1d] mt-1">
                          {apt.customerName}
                        </h5>
                        <p className="text-xs text-[#717970] mt-0.5">
                          📞 {apt.customerPhone} · 📅 {apt.date} at {apt.timeSlot}
                        </p>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-50 text-blue-800">
                        {apt.status}
                      </span>
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-[#414941] bg-[#f8f9fa] p-2 rounded-lg border border-[#edeeef]">
                        Note: {apt.notes}
                      </p>
                    )}

                    <div className="pt-2 border-t border-[#edeeef] flex justify-end">
                      <button
                        onClick={() => handleSendReminder(apt)}
                        className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">notifications</span>
                        <span>Send Reminder (Event #13)</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUB-TAB 4: DAILY SALES SUMMARY */}
          {merchantSubTab === 'summary' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#191c1d]">
                      Daily Merchant Sales Summary
                    </h4>
                    <p className="text-xs text-[#717970]">
                      Timezone: <span className="font-mono text-[#023616]">Asia/Kolkata</span> · Date: {getAsiaKolkataDateString()}
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateSummary}
                    className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">analytics</span>
                    <span>Generate Summary (Event #14)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#edeeef]">
                    <div className="text-[10px] uppercase font-bold text-[#717970]">Total Orders</div>
                    <div className="text-lg font-black text-[#191c1d] mt-0.5">{merchantOrders.length}</div>
                  </div>
                  <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#edeeef]">
                    <div className="text-[10px] uppercase font-bold text-[#717970]">Completed</div>
                    <div className="text-lg font-black text-[#023616] mt-0.5">
                      {merchantOrders.filter((o) => o.status === 'completed').length}
                    </div>
                  </div>
                  <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#edeeef]">
                    <div className="text-[10px] uppercase font-bold text-[#717970]">Pickup vs Delivery</div>
                    <div className="text-xs font-extrabold text-[#414941] mt-1">
                      {merchantOrders.filter((o) => o.type === 'smart_pickup').length} Pickup / {merchantOrders.filter((o) => o.type === 'home_delivery').length} Del
                    </div>
                  </div>
                  <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#edeeef]">
                    <div className="text-[10px] uppercase font-bold text-[#717970]">Total Revenue</div>
                    <div className="text-lg font-black text-[#023616] mt-0.5">
                      ₹{merchantOrders.filter((o) => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 5: GPS MAP */}
          {merchantSubTab === 'location' && (
            <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-extrabold text-[#191c1d] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#023616]">pin_drop</span>
                    <span>Your Store Location</span>
                  </h4>
                  <p className="text-xs text-[#717970] mt-0.5">
                    📍 {myMerchantStore.name} · {myMerchantStore.area}, {myMerchantStore.city}
                  </p>
                </div>

                <button
                  onClick={() => setEditingStore(myMerchantStore)}
                  className="bg-[#023616] hover:bg-[#1e4d2b] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">edit_location</span>
                  <span>Edit Location</span>
                </button>
              </div>

              {/* Embedded Google Map */}
              <div className="h-44 w-full rounded-xl overflow-hidden border border-[#edeeef] relative">
                <Map
                  id="merchant-dash-map"
                  mapId="DEMO_MAP_ID"
                  defaultCenter={{
                    lat: myMerchantStore.latitude,
                    lng: myMerchantStore.longitude,
                  }}
                  defaultZoom={15}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  zoomControl={true}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  <AdvancedMarker
                    position={{
                      lat: myMerchantStore.latitude,
                      lng: myMerchantStore.longitude,
                    }}
                    title={myMerchantStore.name}
                  >
                    <Pin
                      background="#023616"
                      glyphColor="#ffffff"
                      borderColor="#fd8b00"
                      scale={1.2}
                    />
                  </AdvancedMarker>
                </Map>
              </div>

              <div className="flex items-center justify-between text-xs text-[#414941] bg-[#f8f9fa] p-2.5 rounded-xl border border-[#edeeef]">
                <div>
                  <span className="font-bold text-[#191c1d]">Exact Coordinates: </span>
                  <span className="font-mono text-[11px] text-[#023616]">
                    {myMerchantStore.latitude.toFixed(4)}° N, {myMerchantStore.longitude.toFixed(4)}° E
                  </span>
                </div>
                <span className="bg-[#bbefc1] text-[#00210b] text-[10px] font-extrabold px-2 py-0.5 rounded">
                  Confirmed ✓
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN VIEW & MERCHANT APPROVALS (Event 10) */}
      {profileTab === 'admin' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-base text-[#191c1d]">
                Merchant Approvals & Governance
              </h3>
              <p className="text-xs text-[#717970] mt-0.5">
                Approving a merchant emits Event #10: <code className="font-mono text-[#023616]">merchant.approved</code>
              </p>
            </div>

            <button
              onClick={onOpenAutomationDrawer}
              className="bg-[#023616] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">hub</span>
              <span>Event Stream</span>
            </button>
          </div>

          <div className="space-y-3">
            {stores.map((store) => {
              const isApproved = store.approvalStatus === 'approved';

              return (
                <div
                  key={store.id}
                  className="bg-white rounded-2xl p-4 border border-[#edeeef] shadow-xs space-y-2.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#191c1d]">
                          {store.name}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isApproved
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-amber-100 text-amber-900 animate-pulse'
                          }`}
                        >
                          {isApproved ? 'Approved ✓' : 'Pending Approval'}
                        </span>
                      </div>
                      <div className="text-xs text-[#414941] mt-0.5">
                        📍 {store.address}, {store.area} · Category: {store.category}
                      </div>
                    </div>

                    {!isApproved && (
                      <button
                        onClick={() => handleApproveStore(store)}
                        className="bg-[#023616] hover:bg-[#1e4d2b] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        <span>Approve Merchant (Event #10)</span>
                      </button>
                    )}
                  </div>

                  {/* Internal coordinate inspection */}
                  <div className="bg-[#f8f9fa] p-2.5 rounded-xl border border-[#edeeef] text-xs font-mono text-[#023616] flex justify-between items-center">
                    <span>Lat: {store.latitude.toFixed(6)} | Lng: {store.longitude.toFixed(6)}</span>
                    <span className="text-[10px] font-sans font-bold text-[#717970]">
                      retailers/{store.id}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <a
                      href={getGoogleMapsDirectionsUrl(
                        userLocation.latitude,
                        userLocation.longitude,
                        store.latitude,
                        store.longitude
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 bg-[#edeeef] hover:bg-[#e7e8e9] text-[#191c1d] rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm text-[#fd8b00]">directions</span>
                      <span>View on Google Maps</span>
                    </a>
                    <button
                      onClick={() => setSelectedAdminStore(store)}
                      className="flex-1 py-1.5 bg-[#023616] hover:bg-[#1e4d2b] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">map</span>
                      <span>Inspect Pin</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inspect Pin modal in Admin view */}
          {selectedAdminStore && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
              <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-sm text-[#191c1d]">
                    Store Location: {selectedAdminStore.name}
                  </h4>
                  <button
                    onClick={() => setSelectedAdminStore(null)}
                    className="w-7 h-7 rounded-full bg-[#edeeef] flex items-center justify-center text-[#414941]"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <div className="h-56 w-full rounded-xl overflow-hidden border border-[#edeeef]">
                  <Map
                    id="admin-inspect-map"
                    mapId="DEMO_MAP_ID"
                    defaultCenter={{ lat: selectedAdminStore.latitude, lng: selectedAdminStore.longitude }}
                    defaultZoom={15}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    zoomControl={true}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <AdvancedMarker
                      position={{ lat: selectedAdminStore.latitude, lng: selectedAdminStore.longitude }}
                      title={selectedAdminStore.name}
                    >
                      <Pin background="#023616" glyphColor="#ffffff" borderColor="#fd8b00" />
                    </AdvancedMarker>
                  </Map>
                </div>
                <div className="text-xs text-[#414941]">
                  {selectedAdminStore.address}, {selectedAdminStore.city}, {selectedAdminStore.district}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Location Picker for Merchant Edit Location */}
      {editingStore && (
        <GoogleMapsLocationPicker
          initialLat={editingStore.latitude}
          initialLng={editingStore.longitude}
          title={`Update Location: ${editingStore.name}`}
          confirmLabel="Save Updated Coordinates"
          onConfirmLocation={({ latitude, longitude, addressData }) => {
            onUpdateStoreLocation(
              editingStore.id,
              latitude,
              longitude,
              addressData.formattedAddress
            );
            setEditingStore(null);
          }}
          onCancel={() => setEditingStore(null)}
        />
      )}
    </div>
  );
};
