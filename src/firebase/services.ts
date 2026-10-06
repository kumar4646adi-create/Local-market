import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './config';
import {
  Store,
  Order,
  StoreReview,
  ProductReview,
  FavoriteStore,
  StoreSearch,
  RecentStore,
} from '../types';
import {
  emitOrderCreatedEvent,
  emitOrderAcceptedEvent,
  emitOrderPreparingEvent,
  emitOrderReadyEvent,
  emitCustomerArrivedEvent,
  emitOrderCompletedEvent,
  emitOrderCancelledEvent,
  emitMerchantApprovedEvent,
} from './automation';
import { getAsiaKolkataISOString } from '../utils/timezone';
import { sendOrderCreatedWebhook } from '../services/makeWebhook';

const RETAILERS_COLLECTION = 'retailers';
const ORDERS_COLLECTION = 'orders';
const STORE_REVIEWS_COLLECTION = 'storeReviews';
const PRODUCT_REVIEWS_COLLECTION = 'productReviews';
const PRODUCTS_COLLECTION = 'products';
const CUSTOMERS_COLLECTION = 'customers';

/**
 * Auth subscriptions and helpers
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.warn('Google sign-in popup error:', err);
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

/**
 * Saves or updates a confirmed merchant in Firestore
 */
export async function saveRetailerToFirestore(store: Store): Promise<void> {
  const path = `${RETAILERS_COLLECTION}/${store.id}`;
  try {
    const retailerDoc = {
      id: store.id,
      name: store.name,
      storeName: store.storeName || store.name,
      category: store.category,
      subcategories: store.subcategories,
      address: store.address,
      area: store.area,
      city: store.city,
      district: store.district,
      state: store.state,
      latitude: store.latitude,
      longitude: store.longitude,
      locationConfirmed: store.locationConfirmed ?? true,
      phone: store.phone,
      timing: store.timing,
      smartPickup: store.smartPickup,
      isOpen: store.isOpen,
      rating: store.rating,
      reviewsCount: store.reviewsCount,
      approvalStatus: store.approvalStatus || 'approved',
      approvedAt: store.approvedAt || getAsiaKolkataISOString(),
    };
    await setDoc(doc(db, RETAILERS_COLLECTION, store.id), retailerDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Approves a pending merchant account and emits merchant.approved event
 */
export async function approveMerchantInFirestore(store: Store): Promise<void> {
  const path = `${RETAILERS_COLLECTION}/${store.id}`;
  const approvedAt = getAsiaKolkataISOString();
  try {
    await updateDoc(doc(db, RETAILERS_COLLECTION, store.id), {
      approvalStatus: 'approved',
      approvedAt,
    });
    const updatedStore = {
      ...store,
      approvalStatus: 'approved' as const,
      approvedAt,
    };
    await emitMerchantApprovedEvent(updatedStore);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Updates a merchant's confirmed location in Firestore
 */
export async function updateRetailerLocationInFirestore(
  storeId: string,
  latitude: number,
  longitude: number,
  address: string
): Promise<void> {
  const path = `${RETAILERS_COLLECTION}/${storeId}`;
  try {
    await updateDoc(doc(db, RETAILERS_COLLECTION, storeId), {
      latitude,
      longitude,
      address,
      locationConfirmed: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Saves a new order to Firestore and emits order.created event
 */
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const path = `${ORDERS_COLLECTION}/${order.id}`;
  try {
    const orderDoc = {
      id: order.id,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      storeName: order.storeName,
      storeImage: order.storeImage || '',
      storeAddress: order.storeAddress,
      customerId: order.customerId || 'cust-aditya-kumar',
      customerName: order.customerName || 'Aditya Kumar',
      customerPhone: order.customerPhone || '+91 98160 46460',
      items: order.items || [],
      subtotal: order.subtotal ?? order.totalAmount,
      deliveryFee: order.deliveryFee ?? 0,
      platformFee: order.platformFee ?? 0,
      totalAmount: order.totalAmount,
      status: order.status,
      type: order.type,
      paymentMethod: order.paymentMethod || (order.type === 'smart_pickup' ? 'Cash on Pickup' : 'Cash on Delivery'),
      paymentStatus: order.paymentStatus || 'Pending',
      orderTime: order.orderTime,
      estimatedReadyTime: order.estimatedReadyTime,
      pickupOtp: order.pickupOtp,
      customerArrivedAtCounter: order.customerArrivedAtCounter ?? false,
      notes: order.notes || '',
      cancellationReason: order.cancellationReason || '',
      createdAt: order.createdAt || getAsiaKolkataISOString(),
      updatedAt: getAsiaKolkataISOString(),
    };
    // 1. Save order to Firestore
    await setDoc(doc(db, ORDERS_COLLECTION, order.id), orderDoc);
    
    // 2. Automation Event in Firestore
    const { event } = await emitOrderCreatedEvent(order);

    // 3. Make.com HTTPS POST Webhook with retry handling and idempotency
    sendOrderCreatedWebhook(order, event.eventId).catch((webhookErr) => {
      console.warn('[Make.com Webhook] Dispatch warning:', webhookErr);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Updates order status in Firestore and emits corresponding automation events
 */
export async function updateOrderStatusInFirestore(
  order: Order,
  newStatus: Order['status'],
  customerArrivedAtCounter?: boolean
): Promise<void> {
  const path = `${ORDERS_COLLECTION}/${order.id}`;
  try {
    const updateData: any = { status: newStatus };
    if (customerArrivedAtCounter !== undefined) {
      updateData.customerArrivedAtCounter = customerArrivedAtCounter;
    }
    await updateDoc(doc(db, ORDERS_COLLECTION, order.id), updateData);

    const updatedOrder: Order = {
      ...order,
      status: newStatus,
      customerArrivedAtCounter:
        customerArrivedAtCounter !== undefined
          ? customerArrivedAtCounter
          : order.customerArrivedAtCounter,
    };

    // Emit event depending on the status transition
    if (customerArrivedAtCounter === true) {
      // 5. Customer taps "I'm Here"
      await emitCustomerArrivedEvent(updatedOrder);
    } else if (newStatus === 'confirmed') {
      // 2. Retailer accepts order
      await emitOrderAcceptedEvent(updatedOrder);
    } else if (newStatus === 'packing') {
      // 3. Retailer starts preparing order
      await emitOrderPreparingEvent(updatedOrder);
    } else if (newStatus === 'ready') {
      // 4. Order ready for pickup
      await emitOrderReadyEvent(updatedOrder);
    } else if (newStatus === 'completed') {
      // 6. Order completed
      await emitOrderCompletedEvent(updatedOrder);
    } else if (newStatus === 'cancelled') {
      // 7. Order cancelled
      await emitOrderCancelledEvent(updatedOrder);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Subscribes to live retailers
 */
export function subscribeToRetailers(
  onData: (stores: Partial<Store>[]) => void
): () => void {
  const path = RETAILERS_COLLECTION;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const liveStores = snapshot.docs.map((docSnap) => docSnap.data() as Partial<Store>);
      onData(liveStores);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Subscribes to live orders
 */
export function subscribeToOrders(
  onData: (orders: Order[]) => void
): () => void {
  const path = ORDERS_COLLECTION;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const liveOrders = snapshot.docs.map((docSnap) => docSnap.data() as Order);
      onData(liveOrders);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Subscribes to orders for a specific customer
 */
export function subscribeToCustomerOrders(
  customerId: string,
  onData: (orders: Order[]) => void
): () => void {
  const path = ORDERS_COLLECTION;
  const q = query(collection(db, path), where('customerId', '==', customerId));
  return onSnapshot(
    q,
    (snapshot) => {
      const liveOrders = snapshot.docs.map((docSnap) => docSnap.data() as Order);
      onData(liveOrders);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Submits or edits a customer store review and automatically recalculates average store rating
 */
export async function submitOrUpdateStoreReview(reviewData: {
  storeId: string;
  storeName?: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  rating: number;
  review?: string;
}): Promise<{ averageRating: number; totalRatings: number }> {
  const reviewId = `${reviewData.orderId}_store`;
  const path = `${STORE_REVIEWS_COLLECTION}/${reviewId}`;
  const now = getAsiaKolkataISOString();

  try {
    const existingSnap = await getDoc(doc(db, STORE_REVIEWS_COLLECTION, reviewId));
    const createdAt = existingSnap.exists() ? existingSnap.data().createdAt || now : now;

    const reviewPayload: StoreReview = {
      id: reviewId,
      storeId: reviewData.storeId,
      storeName: reviewData.storeName || '',
      orderId: reviewData.orderId,
      customerId: reviewData.customerId,
      customerName: reviewData.customerName || 'Customer',
      rating: reviewData.rating,
      review: reviewData.review?.trim() || '',
      createdAt,
      updatedAt: now,
    };

    await setDoc(doc(db, STORE_REVIEWS_COLLECTION, reviewId), reviewPayload);

    // Recalculate average rating for this store across all reviews
    const reviewsSnap = await getDocs(
      query(collection(db, STORE_REVIEWS_COLLECTION), where('storeId', '==', reviewData.storeId))
    );
    const allReviews = reviewsSnap.docs.map((d) => d.data() as StoreReview);
    const totalRatings = allReviews.length;
    const sum = allReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const averageRating = totalRatings > 0 ? Number((sum / totalRatings).toFixed(1)) : 0;

    // Update retailer document in Firestore
    const storeRef = doc(db, RETAILERS_COLLECTION, reviewData.storeId);
    try {
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        await updateDoc(storeRef, {
          averageRating,
          totalRatings,
          rating: averageRating,
          reviewsCount: totalRatings,
        });
      } else {
        await setDoc(
          storeRef,
          {
            averageRating,
            totalRatings,
            rating: averageRating,
            reviewsCount: totalRatings,
          },
          { merge: true }
        );
      }
    } catch (storeErr) {
      console.warn('Store doc rating update warning:', storeErr);
    }

    return { averageRating, totalRatings };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to live reviews for a specific store
 */
export function subscribeToStoreReviews(
  storeId: string,
  onData: (reviews: StoreReview[]) => void
): () => void {
  const path = STORE_REVIEWS_COLLECTION;
  const q = query(collection(db, path), where('storeId', '==', storeId));
  return onSnapshot(
    q,
    (snapshot) => {
      const reviews = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StoreReview));
      onData(reviews);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Subscribes to all store reviews created by a customer
 */
export function subscribeToCustomerStoreReviews(
  customerId: string,
  onData: (reviews: StoreReview[]) => void
): () => void {
  const path = STORE_REVIEWS_COLLECTION;
  const q = query(collection(db, path), where('customerId', '==', customerId));
  return onSnapshot(
    q,
    (snapshot) => {
      const reviews = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StoreReview));
      onData(reviews);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Submits or edits a customer product review for a purchased product
 */
export async function submitOrUpdateProductReview(reviewData: {
  productId: string;
  productName?: string;
  storeId: string;
  storeName?: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  rating: number;
  review?: string;
}): Promise<{ averageRating: number; totalRatings: number }> {
  const reviewId = `${reviewData.orderId}_${reviewData.productId}`;
  const path = `${PRODUCT_REVIEWS_COLLECTION}/${reviewId}`;
  const now = getAsiaKolkataISOString();

  try {
    const existingSnap = await getDoc(doc(db, PRODUCT_REVIEWS_COLLECTION, reviewId));
    const createdAt = existingSnap.exists() ? existingSnap.data().createdAt || now : now;

    const reviewPayload: ProductReview = {
      id: reviewId,
      productId: reviewData.productId,
      productName: reviewData.productName || '',
      storeId: reviewData.storeId,
      storeName: reviewData.storeName || '',
      orderId: reviewData.orderId,
      customerId: reviewData.customerId,
      customerName: reviewData.customerName || 'Customer',
      rating: reviewData.rating,
      review: reviewData.review?.trim() || '',
      createdAt,
      updatedAt: now,
    };

    await setDoc(doc(db, PRODUCT_REVIEWS_COLLECTION, reviewId), reviewPayload);

    // Recalculate average rating for this product
    const reviewsSnap = await getDocs(
      query(collection(db, PRODUCT_REVIEWS_COLLECTION), where('productId', '==', reviewData.productId))
    );
    const allReviews = reviewsSnap.docs.map((d) => d.data() as ProductReview);
    const totalRatings = allReviews.length;
    const sum = allReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const averageRating = totalRatings > 0 ? Number((sum / totalRatings).toFixed(1)) : 0;

    // Save product aggregate document
    await setDoc(
      doc(db, PRODUCTS_COLLECTION, reviewData.productId),
      {
        productId: reviewData.productId,
        storeId: reviewData.storeId,
        averageRating,
        totalRatings,
        updatedAt: now,
      },
      { merge: true }
    );

    // Also update product entry inside retailer's products list if available
    try {
      const storeRef = doc(db, RETAILERS_COLLECTION, reviewData.storeId);
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        const storeData = storeSnap.data();
        if (Array.isArray(storeData.products)) {
          const updatedProducts = storeData.products.map((p: any) =>
            p.id === reviewData.productId
              ? { ...p, averageRating, totalRatings }
              : p
          );
          await updateDoc(storeRef, { products: updatedProducts });
        }
      }
    } catch (storeErr) {
      console.warn('Store product array update warning:', storeErr);
    }

    return { averageRating, totalRatings };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to all product reviews written by a customer
 */
export function subscribeToCustomerProductReviews(
  customerId: string,
  onData: (reviews: ProductReview[]) => void
): () => void {
  const path = PRODUCT_REVIEWS_COLLECTION;
  const q = query(collection(db, path), where('customerId', '==', customerId));
  return onSnapshot(
    q,
    (snapshot) => {
      const reviews = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProductReview));
      onData(reviews);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Toggles a store in customer's favorites list in Firestore
 */
export async function toggleCustomerFavoriteStore(
  customerId: string,
  store: Store
): Promise<boolean> {
  const path = `${CUSTOMERS_COLLECTION}/${customerId}/favoriteStores/${store.id}`;
  try {
    const favDocRef = doc(db, CUSTOMERS_COLLECTION, customerId, 'favoriteStores', store.id);
    const favSnap = await getDoc(favDocRef);
    if (favSnap.exists()) {
      await deleteDoc(favDocRef);
      return false; // Removed
    } else {
      const favData: FavoriteStore = {
        storeId: store.id,
        storeName: store.name,
        category: store.category,
        image: store.image,
        address: store.address,
        area: store.area,
        addedAt: getAsiaKolkataISOString(),
      };
      await setDoc(favDocRef, favData);
      return true; // Added
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to customer favorite stores from Firestore
 */
export function subscribeToCustomerFavoriteStores(
  customerId: string,
  onData: (favorites: FavoriteStore[]) => void
): () => void {
  const path = `${CUSTOMERS_COLLECTION}/${customerId}/favoriteStores`;
  return onSnapshot(
    collection(db, CUSTOMERS_COLLECTION, customerId, 'favoriteStores'),
    (snapshot) => {
      const favs = snapshot.docs.map((d) => d.data() as FavoriteStore);
      onData(favs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Records a store search in Firestore for an authenticated customer
 */
export async function recordCustomerStoreSearch(
  customerId: string,
  store: Store,
  searchQuery: string
): Promise<void> {
  if (!customerId || !store?.id) return;
  const searchId = store.id;
  const path = `${CUSTOMERS_COLLECTION}/${customerId}/storeSearchHistory/${searchId}`;
  const now = getAsiaKolkataISOString();
  const searchData: StoreSearch = {
    searchId,
    storeId: store.id,
    storeName: store.name,
    storeImage: store.image || '',
    searchQuery: searchQuery ? searchQuery.trim() : store.name,
    category: store.category,
    searchedAt: now,
  };

  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customerId, 'storeSearchHistory', searchId);
    await setDoc(docRef, searchData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to customer store search history from Firestore (newest first, max 10)
 */
export function subscribeToCustomerStoreSearchHistory(
  customerId: string,
  onData: (searches: StoreSearch[]) => void
): () => void {
  if (!customerId) {
    onData([]);
    return () => {};
  }
  const path = `${CUSTOMERS_COLLECTION}/${customerId}/storeSearchHistory`;
  return onSnapshot(
    collection(db, CUSTOMERS_COLLECTION, customerId, 'storeSearchHistory'),
    (snapshot) => {
      const searches = snapshot.docs.map((d) => d.data() as StoreSearch);
      searches.sort(
        (a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime()
      );
      onData(searches.slice(0, 10));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Clears search history for a customer
 */
export async function clearCustomerSearchHistory(customerId: string): Promise<void> {
  if (!customerId) return;
  const path = `${CUSTOMERS_COLLECTION}/${customerId}/storeSearchHistory`;
  try {
    const collRef = collection(db, CUSTOMERS_COLLECTION, customerId, 'storeSearchHistory');
    const snap = await getDocs(collRef);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Records recently viewed store in Firestore for an authenticated customer
 */
export async function recordCustomerRecentStore(
  customerId: string,
  store: Store
): Promise<void> {
  if (!customerId || !store?.id) return;
  const storeId = store.id;
  const path = `${CUSTOMERS_COLLECTION}/${customerId}/recentStores/${storeId}`;
  const now = getAsiaKolkataISOString();
  const recentData: RecentStore = {
    storeId: store.id,
    storeName: store.name,
    storeImage: store.image || '',
    category: store.category,
    viewedAt: now,
  };

  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customerId, 'recentStores', storeId);
    await setDoc(docRef, recentData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to customer recently viewed stores (newest first, max 10)
 */
export function subscribeToCustomerRecentStores(
  customerId: string,
  onData: (recentStores: RecentStore[]) => void
): () => void {
  if (!customerId) {
    onData([]);
    return () => {};
  }
  const path = `${CUSTOMERS_COLLECTION}/${customerId}/recentStores`;
  return onSnapshot(
    collection(db, CUSTOMERS_COLLECTION, customerId, 'recentStores'),
    (snapshot) => {
      const recents = snapshot.docs.map((d) => d.data() as RecentStore);
      recents.sort(
        (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
      );
      onData(recents.slice(0, 10));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
