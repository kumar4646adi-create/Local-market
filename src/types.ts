export type CategoryType = 
  | 'All'
  | 'Grocery'
  | 'Bakery'
  | 'Pharmacy'
  | 'Restaurants'
  | 'Clothing'
  | 'Electronics'
  | 'Organic';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  unit: string;
  inStock: boolean;
  category: string;
  image?: string;
  description: string;
  isBestSeller?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  averageRating?: number;
  totalRatings?: number;
}

export interface StoreLocation {
  latitude: number;
  longitude: number;
}

export interface Store {
  id: string;
  name: string;
  storeName?: string;
  category: CategoryType;
  subcategories: string;
  rating: number;
  reviewsCount: number;
  averageRating?: number;
  totalRatings?: number;
  distanceKm: number;
  isOpen: boolean;
  smartPickup: boolean;
  image: string;
  altText: string;
  description: string;
  address: string;
  area: string;
  city: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  location: StoreLocation;
  locationConfirmed: boolean;
  timing: string;
  phone: string;
  products: Product[];
  featured?: boolean;
  locationArea: string;
  isSampleStore?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  area: string;
  city: string;
  district: string;
  state: string;
  formattedAddress: string;
  source: 'gps' | 'manual' | 'map_pin';
}

export interface DeliveryAddress {
  house: string;
  area: string;
  landmark: string;
  town: string;
  district: string;
  state: string;
  latitude?: number;
  longitude?: number;
  formattedAddress: string;
}

export interface CartItem {
  storeId: string;
  storeName: string;
  product: Product;
  quantity: number;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'packing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  storeImage?: string;
  storeAddress: string;
  storeLocation?: StoreLocation;
  deliveryAddress?: DeliveryAddress;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: {
    product: Product;
    quantity: number;
  }[];
  subtotal?: number;
  deliveryFee?: number;
  platformFee?: number;
  totalAmount: number;
  status: OrderStatus;
  type: 'smart_pickup' | 'home_delivery';
  paymentMethod?: 'Cash on Pickup' | 'UPI / GPay' | 'Pay on Delivery' | 'Card' | string;
  paymentStatus?: 'Paid' | 'Pending' | 'Pay at Counter' | string;
  orderTime: string;
  estimatedReadyTime: string;
  pickupOtp: string;
  notes?: string;
  customerArrivedAtCounter?: boolean;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreReview {
  id?: string;
  storeId: string;
  storeName?: string;
  customerId: string;
  customerName?: string;
  orderId: string;
  rating: number; // 1-5
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReview {
  id?: string;
  productId: string;
  productName?: string;
  storeId: string;
  storeName?: string;
  customerId: string;
  customerName?: string;
  orderId: string;
  rating: number; // 1-5
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteStore {
  storeId: string;
  storeName: string;
  category: string;
  image: string;
  address: string;
  area: string;
  addedAt: string;
}

export interface StoreSearch {
  searchId: string;
  storeId: string;
  storeName: string;
  storeImage?: string;
  searchQuery: string;
  category?: string;
  searchedAt: string;
}

export interface RecentStore {
  storeId: string;
  storeName: string;
  storeImage?: string;
  category?: string;
  viewedAt: string;
}

export interface ChatMessage {
  id: string;
  storeId?: string;
  customerId?: string;
  sender: 'user' | 'merchant';
  text: string;
  timestamp: string;
  createdAt?: string;
}

export interface ChatConversation {
  storeId: string;
  storeName: string;
  storeImage: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  messages: ChatMessage[];
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'order' | 'discount' | 'store' | 'system';
  actionUrl?: string;
}

// ==========================================
// 14 AUTOMATION EVENT TYPES FOR MAKE.COM
// ==========================================
export type AutomationEventType =
  | 'order.created'
  | 'order.accepted'
  | 'order.preparing'
  | 'order.ready'
  | 'customer.arrived'
  | 'order.completed'
  | 'order.cancelled'
  | 'inventory.stock_low'
  | 'inventory.stock_zero'
  | 'merchant.approved'
  | 'message.received'
  | 'appointment.created'
  | 'appointment.reminder'
  | 'merchant.daily_sales_summary';

export interface AutomationEvent<T = any> {
  eventType: AutomationEventType;
  eventId: string;
  orderId: string | null;
  customerId: string | null;
  merchantId: string;
  timestamp: string; // ISO in Asia/Kolkata timezone with +05:30 offset
  status: 'pending' | 'emitted' | 'processed' | 'failed';
  payload: T;
  processed: boolean;
  processedAt: string | null;
}

export interface InventoryItem {
  id: string; // `${storeId}_${productId}`
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  price: number;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
  inStock: boolean;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  storeId: string;
  storeName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceType: string;
  date: string;
  timeSlot: string;
  notes?: string;
  status: 'scheduled' | 'reminded' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface DailySalesSummary {
  id: string; // `${storeId}_${date}`
  storeId: string;
  storeName: string;
  date: string; // YYYY-MM-DD (Asia/Kolkata)
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  pickupOrdersCount: number;
  deliveryOrdersCount: number;
  generatedAt: string;
}
