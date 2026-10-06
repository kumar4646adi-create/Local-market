import { useState, useEffect, useMemo } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { User } from 'firebase/auth';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { HeroBanner } from './components/HeroBanner';
import { CategoriesScroll } from './components/CategoriesScroll';
import { SmartPickupBanner } from './components/SmartPickupBanner';
import { StoreCard } from './components/StoreCard';
import { BottomNav, TabType } from './components/BottomNav';
import { StoreDetailModal } from './components/StoreDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { ChatModal } from './components/ChatModal';
import { ListShopModal } from './components/ListShopModal';
import { CustomerLocationModal } from './components/CustomerLocationModal';
import { NotificationsModal } from './components/NotificationsModal';
import { FilterDrawer, FilterOptions } from './components/FilterDrawer';
import { AutomationEventsDrawer } from './components/AutomationEventsDrawer';
import { GoogleContactsDrawer } from './components/GoogleContactsDrawer';
import { RatingModal } from './components/RatingModal';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { AuthModal } from './components/AuthModal';
import { StoreSectionRow } from './components/StoreSectionRow';
import { ExploreScreen } from './screens/ExploreScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import {
  STORES_DATA,
  INITIAL_ORDERS,
  INITIAL_CHATS,
  INITIAL_NOTIFICATIONS,
  DEFAULT_USER_LOCATION,
} from './data/mockData';
import {
  Store,
  Product,
  CartItem,
  Order,
  CategoryType,
  ChatMessage,
  UserLocation,
  AutomationEvent,
  StoreReview,
  ProductReview,
  FavoriteStore,
  StoreSearch,
  RecentStore,
} from './types';
import { calculateDistanceKm } from './utils/geo';
import {
  saveRetailerToFirestore,
  updateRetailerLocationInFirestore,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
  subscribeToRetailers,
  subscribeToOrders,
  subscribeToAuth,
  signInWithGoogle,
  signOutUser,
  toggleCustomerFavoriteStore,
  subscribeToCustomerFavoriteStores,
  subscribeToCustomerStoreReviews,
  subscribeToCustomerProductReviews,
  recordCustomerStoreSearch,
  subscribeToCustomerStoreSearchHistory,
  clearCustomerSearchHistory,
  recordCustomerRecentStore,
  subscribeToCustomerRecentStores,
} from './firebase/services';
import {
  subscribeToAutomationEvents,
  saveChatMessageToFirestore,
} from './firebase/automation';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDNs6astjWNHiw7vOHVuDtlXhH5jAVhfkA';

export default function App() {
  // Navigation & Viewport State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [automationEvents, setAutomationEvents] = useState<AutomationEvent[]>([]);
  const [isAutomationDrawerOpen, setIsAutomationDrawerOpen] = useState<boolean>(false);
  const [isContactsDrawerOpen, setIsContactsDrawerOpen] = useState<boolean>(false);

  // Real Customer Location State (Requirements 1, 2, 3, 4, 16)
  const [userLocation, setUserLocation] = useState<UserLocation>(DEFAULT_USER_LOCATION);

  // Data State
  const [stores, setStores] = useState<Store[]>(STORES_DATA);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [isPickupFilterActive, setIsPickupFilterActive] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    onlySmartPickup: false,
    onlyOpenNow: false,
    maxDistanceKm: 10,
    minRating: 0,
  });

  // Modal Dialogs State
  const [activeStoreModal, setActiveStoreModal] = useState<Store | null>(null);
  const [chatStore, setChatStore] = useState<Store | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isListShopOpen, setIsListShopOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Authentication & Customer Specific Data (Requirements 1, 4, 5, 6, 9)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [favoriteStores, setFavoriteStores] = useState<FavoriteStore[]>([]);
  const [customerStoreReviews, setCustomerStoreReviews] = useState<StoreReview[]>([]);
  const [customerProductReviews, setCustomerProductReviews] = useState<ProductReview[]>([]);
  const [recentSearches, setRecentSearches] = useState<StoreSearch[]>([]);
  const [recentStores, setRecentStores] = useState<RecentStore[]>([]);

  // Auth Modal State (Requirement 9: Non-blocking guest access)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authActionReason, setAuthActionReason] = useState<string | undefined>(undefined);

  // Order Details & Rating Modals
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [ratingModalState, setRatingModalState] = useState<{
    type: 'store' | 'product';
    order: Order;
    product?: Product;
    initialStoreReview?: StoreReview | null;
    initialProductReview?: ProductReview | null;
  } | null>(null);

  const customerId = currentUser?.uid || 'cust-aditya-kumar';
  const customerName = currentUser?.displayName || 'Aditya Kumar';
  const customerEmail = currentUser?.email || 'kumar4646adi@gmail.com';

  const favoriteStoreIds = useMemo(
    () => new Set(favoriteStores.map((f) => f.storeId)),
    [favoriteStores]
  );

  // Listen for Google Maps quota events & Subscribe to live Firestore retailers, orders, and customer data
  useEffect(() => {
    const handleQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);

    // Auth subscription
    const unsubscribeAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
    });

    // Initial Firestore sync for retailers
    const unsubscribeRetailers = subscribeToRetailers((liveDocs) => {
      if (liveDocs.length > 0) {
        setStores((prev) => {
          const merged = [...prev];
          for (const doc of liveDocs) {
            const idx = merged.findIndex((m) => m.id === doc.id);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...doc };
            } else if (doc.id && doc.name) {
              merged.push(doc as Store);
            }
          }
          return merged;
        });
      }
    });

    // Orders Firestore subscription
    const unsubscribeOrders = subscribeToOrders((liveOrders) => {
      if (liveOrders.length > 0) {
        setOrders(liveOrders);
      }
    });

    // Subscribe to live automation events for Make.com
    const unsubscribeAutomation = subscribeToAutomationEvents((liveEvents) => {
      setAutomationEvents(liveEvents);
    });

    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
      unsubscribeAuth();
      unsubscribeRetailers();
      unsubscribeOrders();
      unsubscribeAutomation();
    };
  }, []);

  // Customer specific subscriptions & guest fallback synchronization (Requirements 4, 5, 6)
  useEffect(() => {
    if (currentUser) {
      const unsubscribeFavs = subscribeToCustomerFavoriteStores(currentUser.uid, (favs) => {
        setFavoriteStores(favs);
      });

      const unsubscribeStoreReviews = subscribeToCustomerStoreReviews(currentUser.uid, (revs) => {
        setCustomerStoreReviews(revs);
      });

      const unsubscribeProductReviews = subscribeToCustomerProductReviews(currentUser.uid, (revs) => {
        setCustomerProductReviews(revs);
      });

      const unsubscribeSearchHistory = subscribeToCustomerStoreSearchHistory(currentUser.uid, (searches) => {
        setRecentSearches(searches);
      });

      const unsubscribeRecentStores = subscribeToCustomerRecentStores(currentUser.uid, (recents) => {
        setRecentStores(recents);
      });

      return () => {
        unsubscribeFavs();
        unsubscribeStoreReviews();
        unsubscribeProductReviews();
        unsubscribeSearchHistory();
        unsubscribeRecentStores();
      };
    } else {
      // Guest experience: read local temporary history
      try {
        const localSearches: StoreSearch[] = JSON.parse(
          localStorage.getItem('localmarket_guest_search_history') || '[]'
        );
        setRecentSearches(localSearches);

        const localRecents: RecentStore[] = JSON.parse(
          localStorage.getItem('localmarket_guest_recent_stores') || '[]'
        );
        setRecentStores(localRecents);
      } catch (err) {
        console.warn('Guest localStorage parse error:', err);
      }
      setFavoriteStores([]);
      setCustomerStoreReviews([]);
      setCustomerProductReviews([]);
    }
  }, [currentUser]);

  // Main Customer Sections (Requirement 2: Popular, Recommended, Favorites, Recents)
  const popularStores = useMemo(() => {
    return [...stores]
      .sort((a, b) => ((b.averageRating ?? b.rating) || 0) - ((a.averageRating ?? a.rating) || 0))
      .slice(0, 6);
  }, [stores]);

  const recommendedStores = useMemo(() => {
    return stores.filter((s) => s.smartPickup).slice(0, 6);
  }, [stores]);

  const favoriteStoresList = useMemo(() => {
    return stores.filter((s) => favoriteStoreIds.has(s.id));
  }, [stores, favoriteStoreIds]);

  const recentlyViewedStoresList = useMemo(() => {
    const list: Store[] = [];
    recentStores.forEach((r) => {
      const match = stores.find((s) => s.id === r.storeId);
      if (match && !list.some((it) => it.id === match.id)) {
        list.push(match);
      }
    });
    return list;
  }, [stores, recentStores]);

  const recentlySearchedStoresList = useMemo(() => {
    const list: Store[] = [];
    recentSearches.forEach((r) => {
      const match = stores.find((s) => s.id === r.storeId);
      if (match && !list.some((it) => it.id === match.id)) {
        list.push(match);
      }
    });
    return list;
  }, [stores, recentSearches]);

  // Filter count for badge
  const activeFilterCount =
    (filters.onlySmartPickup || isPickupFilterActive ? 1 : 0) +
    (filters.onlyOpenNow ? 1 : 0) +
    (filters.maxDistanceKm < 10 ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0);

  // Calculate real distances from customer coordinates and sort by closest store
  const filteredAndSortedStores = useMemo(() => {
    return stores
      .map((store) => {
        const dynamicDistanceKm = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          store.latitude,
          store.longitude
        );
        return {
          ...store,
          distanceKm: dynamicDistanceKm,
        };
      })
      .filter((store) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = store.name.toLowerCase().includes(q);
          const subMatch = store.subcategories.toLowerCase().includes(q);
          const productMatch = store.products.some(
            (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
          );
          if (!nameMatch && !subMatch && !productMatch) return false;
        }

        // Category filter
        if (selectedCategory !== 'All' && store.category !== selectedCategory) {
          return false;
        }

        // Smart pickup filter
        if ((isPickupFilterActive || filters.onlySmartPickup) && !store.smartPickup) {
          return false;
        }

        // Open now filter
        if (filters.onlyOpenNow && !store.isOpen) {
          return false;
        }

        // Max distance filter
        if (store.distanceKm > filters.maxDistanceKm) {
          return false;
        }

        // Rating filter
        if (store.rating < filters.minRating) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm); // Closest store first
  }, [stores, userLocation, searchQuery, selectedCategory, isPickupFilterActive, filters]);

  // Cart operations
  const handleAddToCart = (store: Store, product: Product) => {
    setCart((prev) => {
      const otherStoreItems = prev.filter((i) => i.storeId !== store.id);
      const currentStoreItems = prev.filter((i) => i.storeId === store.id);

      const existing = currentStoreItems.find((i) => i.product.id === product.id);
      if (existing) {
        return [
          ...otherStoreItems,
          ...currentStoreItems.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        ];
      }
      return [
        ...otherStoreItems,
        ...currentStoreItems,
        {
          storeId: store.id,
          storeName: store.name,
          product,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => i.product.id !== productId);
      }
      return prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i));
    });
  };

  // Order operations
  const handleOrderPlaced = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    saveOrderToFirestore(newOrder).catch((err) => console.error('Save order err:', err));

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: `Order Placed with ${newOrder.storeName}! ⚡`,
        description: `Your Smart Pickup OTP is ${newOrder.pickupOtp}. Order will be ready in ${newOrder.estimatedReadyTime}.`,
        time: 'Just now',
        read: false,
        type: 'order',
      },
      ...prev,
    ]);
    setActiveTab('orders');
  };

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      const updated = { ...order, status };
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      updateOrderStatusInFirestore(order, status).catch((err) =>
        console.error('Update order status err:', err)
      );
    }
  };

  // Requirement 22: "I'm Here" Smart Pickup Counter Notification (Event 5)
  const handleCustomerArrived = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      const updated = {
        ...order,
        customerArrivedAtCounter: true,
        status: 'ready' as const,
      };
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      updateOrderStatusInFirestore(order, 'ready', true).catch((err) =>
        console.error('Arrival update err:', err)
      );

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: `Merchant Alerted: You have arrived!`,
          description: `${order.storeName} staff has been notified that you are at the counter for OTP ${order.pickupOtp}.`,
          time: 'Just now',
          read: false,
          type: 'order',
        },
        ...prev,
      ]);
    }
  };

  // Messaging operations (Event 11)
  const handleSendMessage = (storeId: string, text: string) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      storeId,
      customerId: 'cust-aditya-kumar',
      sender: 'user',
      text,
      timestamp: 'Just now',
    };

    const targetStore = stores.find((s) => s.id === storeId);
    saveChatMessageToFirestore(newMessage, targetStore?.name || 'Local Store').catch((err) =>
      console.error('Save chat message err:', err)
    );

    setChats((prev) => {
      const existingConv = prev.find((c) => c.storeId === storeId);
      if (existingConv) {
        return prev.map((c) =>
          c.storeId === storeId
            ? {
                ...c,
                lastMessage: text,
                lastMessageTime: 'Just now',
                messages: [...c.messages, newMessage],
              }
            : c
        );
      }

      const store = stores.find((s) => s.id === storeId);
      return [
        {
          storeId,
          storeName: store?.name || 'Local Store',
          storeImage: store?.image || '',
          lastMessage: text,
          lastMessageTime: 'Just now',
          unreadCount: 0,
          isOnline: true,
          messages: [newMessage],
        },
        ...prev,
      ];
    });

    // Simulated merchant response
    setTimeout(() => {
      const merchantReplies = [
        'Namaste! Yes, fresh stock is ready for Smart Pickup at our Bharari Bazaar counter.',
        'Ji bilkul! We have kept it safely packed for you. Feel free to collect anytime.',
        'Namaste ji! Order is being packed with care. See you soon!',
      ];
      const randomReply =
        merchantReplies[Math.floor(Math.random() * merchantReplies.length)];

      const merchantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'merchant',
        text: randomReply,
        timestamp: 'Just now',
      };

      setChats((prev) =>
        prev.map((c) =>
          c.storeId === storeId
            ? {
                ...c,
                lastMessage: randomReply,
                lastMessageTime: 'Just now',
                messages: [...c.messages, merchantMsg],
              }
            : c
        )
      );
    }, 1200);
  };

  // Add store from List Shop modal with real confirmed coordinates (Requirement 10)
  const handleAddStore = (newStore: Store) => {
    setStores((prev) => [newStore, ...prev]);
    saveRetailerToFirestore(newStore).catch((err) => console.error('Save retailer err:', err));
  };

  // Update store location from Merchant dashboard (Requirement 10 & 12)
  const handleUpdateStoreLocation = (
    storeId: string,
    latitude: number,
    longitude: number,
    address: string
  ) => {
    setStores((prev) =>
      prev.map((s) =>
        s.id === storeId
          ? {
              ...s,
              latitude,
              longitude,
              location: { latitude, longitude },
              address,
              locationConfirmed: true,
            }
          : s
      )
    );
    updateRetailerLocationInFirestore(storeId, latitude, longitude, address).catch((err) =>
      console.error('Update retailer location err:', err)
    );
  };

  // Store selection handler (Records recently viewed and searches, opens store details)
  const handleSelectStore = (store: Store, query?: string) => {
    setActiveStoreModal(store);

    if (currentUser) {
      recordCustomerRecentStore(currentUser.uid, store).catch((e) => console.warn(e));
      if (query && query.trim()) {
        recordCustomerStoreSearch(currentUser.uid, store, query).catch((e) => console.warn(e));
      }
    } else {
      // Guest local storage updates
      try {
        const localRecents: RecentStore[] = JSON.parse(
          localStorage.getItem('localmarket_guest_recent_stores') || '[]'
        );
        const filtered = localRecents.filter((r) => r.storeId !== store.id);
        const updated = [
          {
            storeId: store.id,
            storeName: store.name,
            storeImage: store.image || '',
            category: store.category,
            viewedAt: new Date().toISOString(),
          },
          ...filtered,
        ].slice(0, 10);
        localStorage.setItem('localmarket_guest_recent_stores', JSON.stringify(updated));
        setRecentStores(updated);

        if (query && query.trim()) {
          const localSearches: StoreSearch[] = JSON.parse(
            localStorage.getItem('localmarket_guest_search_history') || '[]'
          );
          const filteredSearches = localSearches.filter((s) => s.storeId !== store.id);
          const updatedSearches = [
            {
              searchId: store.id,
              storeId: store.id,
              storeName: store.name,
              storeImage: store.image || '',
              searchQuery: query.trim(),
              category: store.category,
              searchedAt: new Date().toISOString(),
            },
            ...filteredSearches,
          ].slice(0, 10);
          localStorage.setItem('localmarket_guest_search_history', JSON.stringify(updatedSearches));
          setRecentSearches(updatedSearches);
        }
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }
    }
  };

  // Clear search history (clears Firestore for user or localStorage for guest)
  const handleClearSearchHistory = async () => {
    if (currentUser) {
      try {
        await clearCustomerSearchHistory(currentUser.uid);
        setRecentSearches([]);
      } catch (err) {
        console.error('Clear search history err:', err);
      }
    } else {
      localStorage.removeItem('localmarket_guest_search_history');
      setRecentSearches([]);
    }
  };

  // Favorite store toggle (instant Firestore sync & optimistic state update, guest prompted)
  const handleToggleFavorite = async (store: Store) => {
    if (!currentUser) {
      setAuthActionReason('Create an account or log in to save favorite stores.');
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const isAdded = await toggleCustomerFavoriteStore(currentUser.uid, store);
      setFavoriteStores((prev) => {
        if (isAdded) {
          if (prev.some((f) => f.storeId === store.id)) return prev;
          return [
            ...prev,
            {
              storeId: store.id,
              storeName: store.name,
              category: store.category,
              image: store.image,
              address: store.address,
              area: store.area,
              addedAt: new Date().toISOString(),
            },
          ];
        } else {
          return prev.filter((f) => f.storeId !== store.id);
        }
      });
    } catch (err) {
      console.error('Failed to toggle favorite store:', err);
    }
  };

  // Store Rating Modal Handler (Auth guarded)
  const handleRateStore = (order: Order, initialReview?: StoreReview | null) => {
    if (!currentUser) {
      setAuthActionReason('Create an account or log in to rate local stores.');
      setIsAuthModalOpen(true);
      return;
    }
    const existingRev =
      initialReview ?? customerStoreReviews.find((r) => r.orderId === order.id) ?? null;
    setRatingModalState({
      type: 'store',
      order,
      initialStoreReview: existingRev,
    });
  };

  // Product Rating Modal Handler (Auth guarded)
  const handleRateProducts = (
    order: Order,
    product?: Product,
    initialReview?: ProductReview | null
  ) => {
    if (!currentUser) {
      setAuthActionReason('Create an account or log in to rate purchased products.');
      setIsAuthModalOpen(true);
      return;
    }
    const targetProd = product || order.items[0]?.product;
    const existingRev =
      initialReview ??
      customerProductReviews.find(
        (r) => r.orderId === order.id && r.productId === targetProd?.id
      ) ??
      null;
    setRatingModalState({
      type: 'product',
      order,
      product: targetProd,
      initialProductReview: existingRev,
    });
  };

  // Message / Chat Handler (Auth guarded)
  const handleOpenChat = (store: Store) => {
    if (!currentUser) {
      setAuthActionReason('Create an account or log in to chat with local merchants.');
      setIsAuthModalOpen(true);
      return;
    }
    setChatStore(store);
  };

  // Reorder Handler
  const handleReorder = (order: Order) => {
    const targetStore = stores.find((s) => s.id === order.storeId);
    if (!targetStore) return;
    setCart((prev) => {
      const otherStoreItems = prev.filter((i) => i.storeId !== targetStore.id);
      const newItems = order.items.map((it) => ({
        storeId: targetStore.id,
        storeName: targetStore.name,
        product: it.product,
        quantity: it.quantity,
      }));
      return [...otherStoreItems, ...newItems];
    });
    setIsCartOpen(true);
  };

  // Review Submitted Recalculation Handler
  const handleReviewSubmitted = (stats: { averageRating: number; totalRatings: number }) => {
    if (ratingModalState?.order) {
      const sId = ratingModalState.order.storeId;
      setStores((prev) =>
        prev.map((st) =>
          st.id === sId
            ? {
                ...st,
                averageRating: stats.averageRating,
                totalRatings: stats.totalRatings,
                rating: stats.averageRating,
                reviewsCount: stats.totalRatings,
              }
            : st
        )
      );
    }
  };

  const currentChatMessages =
    chats.find((c) => c.storeId === chatStore?.id)?.messages || [];

  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  ).length;

  const totalCartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  // If no Google Maps API Key is configured (Requirement 17)
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#edeeef] max-w-md text-center">
          <span className="material-symbols-outlined text-4xl text-amber-600 mb-2">map</span>
          <h2 className="text-lg font-bold text-[#191c1d]">Google Maps setup required.</h2>
          <p className="text-xs text-[#717970] mt-1">
            Please configure VITE_GOOGLE_MAPS_API_KEY to access live maps, location search, and directions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="en" region="IN">
      <div className="min-h-screen bg-[#f0f2f4] flex flex-col items-center">
        {/* Quota Exceeded Top Banner (Section 8 of GMP Skill) */}
        {quotaExceeded && (
          <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Top View Mode Bar */}
        <div className="w-full bg-[#191c1d] text-white py-1.5 px-4 text-xs flex justify-between items-center z-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold tracking-tight">LocalMarket Ghumarwin</span>
            <span className="hidden sm:inline text-white/50">| Live Google Maps Platform</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsContactsDrawerOpen(true)}
              className="px-2.5 py-0.5 rounded bg-blue-700/80 hover:bg-blue-600 transition-all font-semibold cursor-pointer flex items-center gap-1 text-[11px] text-white shadow-xs"
              title="Open Google Contacts Manager"
            >
              <span className="material-symbols-outlined text-xs">contacts</span>
              <span>Google Contacts</span>
            </button>

            <button
              onClick={() => setIsAutomationDrawerOpen(true)}
              className="px-2.5 py-0.5 rounded bg-emerald-700/80 hover:bg-emerald-600 transition-all font-semibold cursor-pointer flex items-center gap-1 text-[11px] text-white shadow-xs"
              title="Open Make.com Automation Events Stream"
            >
              <span className="material-symbols-outlined text-xs text-amber-300">hub</span>
              <span>Make.com Events ({automationEvents.length})</span>
            </button>

            <button
              onClick={() => setIsMobileFrame((v) => !v)}
              className="px-2.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-all font-semibold cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <span className="material-symbols-outlined text-xs">
                {isMobileFrame ? 'devices' : 'smartphone'}
              </span>
              <span>{isMobileFrame ? 'Expand Fullscreen' : 'Phone Mockup View'}</span>
            </button>
          </div>
        </div>

        {/* Main App Container */}
        <div
          className={`w-full bg-[#f8f9fa] min-h-[calc(100vh-32px)] flex flex-col relative transition-all duration-300 ${
            isMobileFrame
              ? 'max-w-[420px] my-4 rounded-3xl shadow-2xl overflow-hidden border-8 border-[#2e3132]'
              : 'max-w-2xl shadow-sm'
          }`}
        >
          {/* Fixed Header with Real Location Display and Login/Cart (Requirements 1 & 2) */}
          <Header
            userLocation={userLocation}
            isGuest={!currentUser}
            userDisplayName={currentUser?.displayName || undefined}
            cartCount={totalCartCount}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            onOpenListShopModal={() => setIsListShopOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenProfile={() => setActiveTab('profile')}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenAuthModal={() => {
              setAuthActionReason(undefined);
              setIsAuthModalOpen(true);
            }}
            unreadNotificationsCount={notifications.filter((n) => !n.read).length}
          />

          {/* Tab Content Container */}
          <main className="flex-1 w-full px-4 pt-3 bg-[#f8f9fa]">
            {activeTab === 'home' && (
              <div className="flex flex-col w-full pb-24 text-left">
                {/* Prominent Search Bar with History & Suggestions (Requirements 3, 4, 5, 7) */}
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onOpenFilter={() => setIsFilterOpen(true)}
                  activeFilterCount={activeFilterCount}
                  stores={stores}
                  userLocation={userLocation}
                  recentSearches={recentSearches}
                  recentStores={recentStores}
                  favoriteStoreIds={favoriteStoreIds}
                  onSelectStore={handleSelectStore}
                  onToggleFavorite={handleToggleFavorite}
                  onClearSearchHistory={handleClearSearchHistory}
                  onAddToCart={handleAddToCart}
                />

                {/* Hero Banner */}
                <HeroBanner
                  onExploreClick={() => {
                    setActiveTab('explore');
                  }}
                  onPickupClick={() => {
                    setIsPickupFilterActive((prev) => !prev);
                  }}
                  isPickupFilterActive={isPickupFilterActive}
                />

                {/* Categories Scrollable */}
                <CategoriesScroll
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onSeeAllClick={() => setIsFilterOpen(true)}
                />

                {/* Smart Pickup Promotional Card */}
                <SmartPickupBanner
                  onTrySmartPickup={() => {
                    setIsPickupFilterActive(true);
                    const nearbyEl = document.getElementById('nearby-stores-section');
                    nearbyEl?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />

                {/* Section: Recently Viewed Stores (Requirement 6) */}
                {recentlyViewedStoresList.length > 0 && (
                  <StoreSectionRow
                    title="Recently Viewed Stores"
                    subtitle="Pick up right where you left off"
                    icon="visibility"
                    stores={recentlyViewedStoresList}
                    userLocation={userLocation}
                    favoriteStoreIds={favoriteStoreIds}
                    onSelectStore={handleSelectStore}
                    onToggleFavorite={handleToggleFavorite}
                  />
                )}

                {/* Section: Favorite Stores (Requirements 2 & 4) */}
                {favoriteStoresList.length > 0 && (
                  <StoreSectionRow
                    title="Your Favorite Stores"
                    subtitle="Saved shops in Ghumarwin"
                    icon="favorite"
                    stores={favoriteStoresList}
                    userLocation={userLocation}
                    favoriteStoreIds={favoriteStoreIds}
                    onSelectStore={handleSelectStore}
                    onToggleFavorite={handleToggleFavorite}
                  />
                )}

                {/* Section: Recently Searched Stores (Requirement 4) */}
                {recentlySearchedStoresList.length > 0 && (
                  <StoreSectionRow
                    title="Recently Searched Stores"
                    subtitle="Based on your search activity"
                    icon="history"
                    stores={recentlySearchedStoresList}
                    userLocation={userLocation}
                    favoriteStoreIds={favoriteStoreIds}
                    onSelectStore={handleSelectStore}
                    onToggleFavorite={handleToggleFavorite}
                  />
                )}

                {/* Section: Popular Stores in Ghumarwin (Requirement 2) */}
                <StoreSectionRow
                  title="Popular Stores in Ghumarwin"
                  subtitle="Top customer rated merchants"
                  icon="star"
                  stores={popularStores}
                  userLocation={userLocation}
                  favoriteStoreIds={favoriteStoreIds}
                  onSelectStore={handleSelectStore}
                  onToggleFavorite={handleToggleFavorite}
                />

                {/* Section: Recommended Stores (Requirement 2) */}
                <StoreSectionRow
                  title="Recommended Stores"
                  subtitle="Fast Smart Pickup & daily essentials"
                  icon="recommend"
                  stores={recommendedStores}
                  userLocation={userLocation}
                  favoriteStoreIds={favoriteStoreIds}
                  onSelectStore={handleSelectStore}
                  onToggleFavorite={handleToggleFavorite}
                />

                {/* Nearby Stores Section (Requirement 5: Sorted by real distance) */}
                <div id="nearby-stores-section" className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#191c1d] tracking-tight">
                        Nearby Stores in Ghumarwin
                      </h2>
                      <p className="text-[11px] text-[#717970]">
                        Distances calculated from: <span className="font-semibold text-[#023616]">{userLocation.area}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('explore')}
                      className="text-xs font-bold text-[#023616] hover:underline flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-sm">map</span>
                      <span>View Map</span>
                    </button>
                  </div>

                  {filteredAndSortedStores.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-[#edeeef] my-2">
                      <span className="material-symbols-outlined text-4xl text-[#c1c9be] mb-2">
                        storefront
                      </span>
                      <p className="text-sm font-bold text-[#191c1d]">No stores found nearby</p>
                      <p className="text-xs text-[#717970] mt-1">
                        Try expanding the distance filter or searching for daily essentials.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('All');
                          setIsPickupFilterActive(false);
                          setFilters({
                            onlySmartPickup: false,
                            onlyOpenNow: false,
                            maxDistanceKm: 10,
                            minRating: 0,
                          });
                        }}
                        className="mt-3 bg-[#023616] text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    filteredAndSortedStores.map((store) => (
                      <StoreCard
                        key={store.id}
                        store={store}
                        userLocation={userLocation}
                        isFavorite={favoriteStoreIds.has(store.id)}
                        onToggleFavorite={handleToggleFavorite}
                        onViewStore={(st) => handleSelectStore(st)}
                        onMessageStore={(st) => handleOpenChat(st)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'explore' && (
              <ExploreScreen
                stores={stores}
                userLocation={userLocation}
                favoriteStoreIds={favoriteStoreIds}
                onToggleFavorite={handleToggleFavorite}
                onViewStore={(st) => handleSelectStore(st)}
                onMessageStore={(st) => handleOpenChat(st)}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersScreen
                orders={orders}
                userLocation={userLocation}
                stores={stores}
                storeReviews={customerStoreReviews.reduce((acc, r) => ({ ...acc, [r.orderId]: r }), {})}
                productReviews={customerProductReviews.reduce(
                  (acc, r) => ({ ...acc, [`${r.orderId}_${r.productId}`]: r }),
                  {}
                )}
                isGuest={!currentUser}
                onOpenAuthModal={() => {
                  setAuthActionReason('Create an account or log in to track your personal orders.');
                  setIsAuthModalOpen(true);
                }}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onCustomerArrived={handleCustomerArrived}
                onExploreMore={() => setActiveTab('home')}
                onSelectOrder={(ord) => setSelectedOrderDetails(ord)}
                onRateStore={(ord) => handleRateStore(ord)}
                onRateProducts={(ord) => handleRateProducts(ord)}
                onReorder={handleReorder}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesScreen
                conversations={chats}
                stores={stores}
                onOpenChatWithStore={(st) => setChatStore(st)}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                userLocation={userLocation}
                stores={stores}
                orders={orders}
                favoriteStores={favoriteStores}
                customerStoreReviews={customerStoreReviews}
                customerProductReviews={customerProductReviews}
                customerId={customerId}
                customerName={customerName}
                customerEmail={customerEmail}
                currentUser={currentUser}
                onOpenListShop={() => setIsListShopOpen(true)}
                onOpenLocation={() => setIsLocationModalOpen(true)}
                onUpdateStoreLocation={handleUpdateStoreLocation}
                onViewStore={(st) => setActiveStoreModal(st)}
                onOpenAutomationDrawer={() => setIsAutomationDrawerOpen(true)}
                onOpenContacts={() => setIsContactsDrawerOpen(true)}
                onUpdateOrder={(updatedOrder) => {
                  setOrders((prev) =>
                    prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
                  );
                }}
                onToggleFavorite={handleToggleFavorite}
                onSelectOrder={(ord) => setSelectedOrderDetails(ord)}
                onRateStore={(ord) => handleRateStore(ord)}
                onRateProducts={(ord) => handleRateProducts(ord)}
                onReorder={handleReorder}
                onEditStoreReview={(rev) => {
                  const ord: Order = orders.find((o) => o.id === rev.orderId) || {
                    id: rev.orderId,
                    orderNumber: `ORD-${rev.orderId.slice(-4).toUpperCase()}`,
                    storeId: rev.storeId,
                    storeName: rev.storeName || 'Ghumarwin Store',
                    storeAddress: 'Ghumarwin',
                    customerId: rev.customerId,
                    customerName: rev.customerName,
                    customerPhone: '+91 98160 46460',
                    items: [],
                    totalAmount: 0,
                    status: 'completed',
                    orderTime: 'Recently',
                    type: 'smart_pickup',
                    estimatedReadyTime: '15 mins',
                    pickupOtp: '0000',
                  };
                  handleRateStore(ord, rev);
                }}
                onEditProductReview={(rev) => {
                  const ord: Order = orders.find((o) => o.id === rev.orderId) || {
                    id: rev.orderId,
                    orderNumber: `ORD-${rev.orderId.slice(-4).toUpperCase()}`,
                    storeId: rev.storeId,
                    storeName: rev.storeName || 'Ghumarwin Store',
                    storeAddress: 'Ghumarwin',
                    customerId: rev.customerId,
                    customerName: rev.customerName,
                    customerPhone: '+91 98160 46460',
                    items: [
                      {
                        product: {
                          id: rev.productId,
                          name: rev.productName || 'Product',
                          price: 0,
                          unit: 'item',
                          inStock: true,
                          category: 'Grocery',
                          description: '',
                        },
                        quantity: 1,
                      },
                    ],
                    totalAmount: 0,
                    status: 'completed',
                    orderTime: 'Recently',
                    type: 'smart_pickup',
                    estimatedReadyTime: '15 mins',
                    pickupOtp: '0000',
                  };
                  handleRateProducts(ord, undefined, rev);
                }}
                onSignInWithGoogle={async () => {
                  try {
                    await signInWithGoogle();
                  } catch (err) {
                    console.error('Google sign in error:', err);
                  }
                }}
                onSignOut={async () => {
                  try {
                    await signOutUser();
                  } catch (err) {
                    console.error('Sign out error:', err);
                  }
                }}
              />
            )}
          </main>

          {/* Floating Checkout Bar */}
          {totalCartCount > 0 && !activeStoreModal && (
            <div className="fixed bottom-20 inset-x-4 max-w-xl mx-auto z-40 animate-in slide-in-from-bottom-3 duration-200">
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-[#023616] hover:bg-[#1e4d2b] text-white py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-between shadow-xl cursor-pointer ring-2 ring-[#bbefc1]/50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#fd8b00] text-[#603100] text-xs font-black flex items-center justify-center">
                    {totalCartCount}
                  </span>
                  <span>Items in Smart Pickup Cart</span>
                </div>
                <div className="flex items-center gap-1 font-extrabold text-sm text-[#bbefc1]">
                  <span>Review & Checkout</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </div>
              </button>
            </div>
          )}

          {/* Bottom Navigation */}
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activeOrdersCount={activeOrdersCount}
            unreadMessagesCount={chats.reduce((acc, c) => acc + c.unreadCount, 0)}
          />

          {/* Modals & Dialogs */}
          {activeStoreModal && (
            <StoreDetailModal
              store={stores.find((s) => s.id === activeStoreModal.id) || activeStoreModal}
              userLocation={userLocation}
              isFavorite={favoriteStoreIds.has(activeStoreModal.id)}
              onToggleFavorite={handleToggleFavorite}
              onClose={() => setActiveStoreModal(null)}
              onMessageStore={(st) => {
                setActiveStoreModal(null);
                setChatStore(st);
              }}
              cart={cart}
              onAddToCart={handleAddToCart}
              onUpdateCartQuantity={handleUpdateCartQuantity}
              onOpenCart={() => {
                setActiveStoreModal(null);
                setIsCartOpen(true);
              }}
              onOpenContacts={() => setIsContactsDrawerOpen(true)}
            />
          )}

          {chatStore && (
            <ChatModal
              store={chatStore}
              onClose={() => setChatStore(null)}
              messages={currentChatMessages}
              onSendMessage={handleSendMessage}
            />
          )}

          {isCartOpen && (
            <CartDrawer
              cart={cart}
              stores={stores}
              userLocation={userLocation}
              customerId={customerId}
              customerName={customerName}
              customerPhone="+91 98160 46460"
              isGuest={!currentUser}
              onRequireAuth={() => {
                setAuthActionReason('Create an account or log in to place an order.');
                setIsAuthModalOpen(true);
              }}
              onClose={() => setIsCartOpen(false)}
              onUpdateQuantity={handleUpdateCartQuantity}
              onClearCart={() => setCart([])}
              onOrderPlaced={handleOrderPlaced}
            />
          )}

          {/* Order Details Modal (Requirement 3: Tapping order opens complete Order Details page) */}
          {selectedOrderDetails && (
            <OrderDetailsModal
              order={selectedOrderDetails}
              store={stores.find((s) => s.id === selectedOrderDetails.storeId)}
              storeReview={customerStoreReviews.find((r) => r.orderId === selectedOrderDetails.id)}
              productReviews={customerProductReviews.reduce((acc, r) => {
                if (r.orderId === selectedOrderDetails.id) {
                  acc[r.productId] = r;
                }
                return acc;
              }, {} as Record<string, ProductReview>)}
              onClose={() => setSelectedOrderDetails(null)}
              onRateStore={(ord) => {
                setSelectedOrderDetails(null);
                handleRateStore(ord);
              }}
              onRateProducts={(ord) => {
                setSelectedOrderDetails(null);
                handleRateProducts(ord);
              }}
              onReorder={(ord) => {
                setSelectedOrderDetails(null);
                handleReorder(ord);
              }}
            />
          )}

          {/* Rating & Review Modal (Requirements 1 & 2) */}
          {ratingModalState && (
            <RatingModal
              type={ratingModalState.type}
              order={ratingModalState.order}
              store={stores.find((s) => s.id === ratingModalState.order.storeId)}
              product={ratingModalState.product}
              customerId={customerId}
              customerName={customerName}
              initialStoreReview={ratingModalState.initialStoreReview}
              initialProductReview={ratingModalState.initialProductReview}
              onClose={() => setRatingModalState(null)}
              onReviewSubmitted={(stats) => {
                handleReviewSubmitted(stats);
                setRatingModalState(null);
              }}
            />
          )}

          {isListShopOpen && (
            <ListShopModal
              onClose={() => setIsListShopOpen(false)}
              onAddStore={handleAddStore}
            />
          )}

          {/* Customer Location Selector (Requirements 1, 2, 3, 4, 16) */}
          {isLocationModalOpen && (
            <CustomerLocationModal
              currentLocation={userLocation}
              onUpdateLocation={setUserLocation}
              onClose={() => setIsLocationModalOpen(false)}
            />
          )}

          {isNotificationsOpen && (
            <NotificationsModal
              notifications={notifications}
              onClose={() => setIsNotificationsOpen(false)}
              onClearAll={() =>
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
              }
            />
          )}

          {isFilterOpen && (
            <FilterDrawer
              filters={filters}
              onChangeFilters={setFilters}
              onReset={() => {
                setFilters({
                  onlySmartPickup: false,
                  onlyOpenNow: false,
                  maxDistanceKm: 10,
                  minRating: 0,
                });
                setIsPickupFilterActive(false);
              }}
              onClose={() => setIsFilterOpen(false)}
            />
          )}

          {/* Make.com Automation Events Stream Drawer */}
          {isAutomationDrawerOpen && (
            <AutomationEventsDrawer
              events={automationEvents}
              stores={stores}
              orders={orders}
              onClose={() => setIsAutomationDrawerOpen(false)}
            />
          )}

          {/* Google Contacts Manager Drawer */}
          {isContactsDrawerOpen && (
            <GoogleContactsDrawer
              stores={stores}
              onClose={() => setIsContactsDrawerOpen(false)}
            />
          )}

          {/* Auth Modal (Open customer interface with non-blocking auth modal) */}
          {isAuthModalOpen && (
            <AuthModal
              isOpen={isAuthModalOpen}
              actionReason={authActionReason}
              onClose={() => {
                setIsAuthModalOpen(false);
                setAuthActionReason(undefined);
              }}
              onSignInWithGoogle={async () => {
                await signInWithGoogle();
                setIsAuthModalOpen(false);
                setAuthActionReason(undefined);
              }}
              onContinueAsDemo={() => {
                setIsAuthModalOpen(false);
                setAuthActionReason(undefined);
              }}
            />
          )}
        </div>
      </div>
    </APIProvider>
  );
}
