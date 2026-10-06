import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Store, Product, UserLocation, StoreSearch, RecentStore } from '../types';
import { calculateDistanceKm, formatDistance } from '../utils/geo';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onOpenFilter: () => void;
  activeFilterCount?: number;
  stores: Store[];
  userLocation: UserLocation;
  recentSearches: StoreSearch[];
  recentStores: RecentStore[];
  favoriteStoreIds: Set<string>;
  onSelectStore: (store: Store, query?: string) => void;
  onToggleFavorite: (store: Store) => void;
  onClearSearchHistory?: () => void;
  onAddToCart?: (store: Store, product: Product) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onOpenFilter,
  activeFilterCount = 0,
  stores,
  userLocation,
  recentSearches,
  recentStores,
  favoriteStoreIds,
  onSelectStore,
  onToggleFavorite,
  onClearSearchHistory,
  onAddToCart,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close search suggestions overlay on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Popular search categories suggested to customer
  const popularCategories = [
    { label: 'Kirana', icon: 'shopping_basket', query: 'Kirana' },
    { label: 'Bakery', icon: 'bakery_dining', query: 'Bakery' },
    { label: 'Medical Store', icon: 'local_pharmacy', query: 'Medical' },
    { label: 'Electronics', icon: 'devices', query: 'Electronics' },
    { label: 'Clothing', icon: 'apparel', query: 'Clothing' },
    { label: 'Milk & Dairy', icon: 'water_drop', query: 'Milk' },
    { label: 'Stationery', icon: 'menu_book', query: 'Stationery' },
    { label: 'Salon', icon: 'content_cut', query: 'Salon' },
  ];

  // Live match stores and products based on user query
  const queryLower = value.trim().toLowerCase();

  const { matchingStores, matchingProducts } = useMemo(() => {
    if (!queryLower) {
      return { matchingStores: [], matchingProducts: [] };
    }

    // Matching stores: by name, category, subcategories, or area
    const matchedStores = stores
      .map((store) => {
        const distanceKm = calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          store.latitude,
          store.longitude
        );
        const nameMatch = store.name.toLowerCase().includes(queryLower);
        const categoryMatch = store.category.toLowerCase().includes(queryLower);
        const subcategoryMatch = store.subcategories.toLowerCase().includes(queryLower);
        const areaMatch = store.area.toLowerCase().includes(queryLower);
        const hasProductMatch = store.products.some((p) =>
          p.name.toLowerCase().includes(queryLower)
        );

        const isMatch = nameMatch || categoryMatch || subcategoryMatch || areaMatch || hasProductMatch;
        return {
          store,
          distanceKm,
          isMatch,
          isPrimaryMatch: nameMatch || categoryMatch,
        };
      })
      .filter((item) => item.isMatch)
      .sort((a, b) => {
        // Prioritize primary store name match first, then by distance
        if (a.isPrimaryMatch && !b.isPrimaryMatch) return -1;
        if (!a.isPrimaryMatch && b.isPrimaryMatch) return 1;
        return a.distanceKm - b.distanceKm;
      });

    // Matching products: collect matching products from all stores
    const matchedProducts: { product: Product; store: Store }[] = [];
    stores.forEach((st) => {
      st.products.forEach((prod) => {
        if (
          prod.name.toLowerCase().includes(queryLower) ||
          prod.description.toLowerCase().includes(queryLower)
        ) {
          matchedProducts.push({ product: prod, store: st });
        }
      });
    });

    return {
      matchingStores: matchedStores,
      matchingProducts: matchedProducts.slice(0, 8),
    };
  }, [queryLower, stores, userLocation]);

  const handleSelectRecentSearch = (search: StoreSearch) => {
    const matchedStore = stores.find((s) => s.id === search.storeId);
    if (matchedStore) {
      onSelectStore(matchedStore, search.searchQuery);
      setIsFocused(false);
    } else {
      onChange(search.searchQuery || search.storeName);
    }
  };

  const handleSelectRecentStore = (recent: RecentStore) => {
    const matchedStore = stores.find((s) => s.id === recent.storeId);
    if (matchedStore) {
      onSelectStore(matchedStore, matchedStore.name);
      setIsFocused(false);
    }
  };

  const showDropdown = isFocused;

  return (
    <div ref={containerRef} className="relative w-full mb-4 z-30">
      {/* Prominent Search Bar */}
      <div
        className={`flex items-center bg-white rounded-2xl px-3.5 py-2.5 shadow-sm transition-all border ${
          isFocused ? 'border-[#023616] ring-2 ring-[#023616]/20' : 'border-[#edeeef] hover:border-[#c1c9be]'
        }`}
      >
        {isFocused && (
          <button
            type="button"
            onClick={() => setIsFocused(false)}
            className="sm:hidden p-1 mr-1 text-[#414941] hover:text-[#191c1d] rounded-full cursor-pointer"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
        )}

        <span className="material-symbols-outlined text-[#023616] mr-2.5 select-none text-[22px]">
          search
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search stores, products or services"
          className="bg-transparent w-full text-sm font-semibold text-[#191c1d] placeholder:text-[#717970] focus:outline-none placeholder:font-normal"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="p-1 text-[#717970] hover:text-[#191c1d] rounded-full cursor-pointer shrink-0"
            aria-label="Clear search"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenFilter}
          className="w-8 h-8 rounded-xl bg-[#f3f4f5] hover:bg-[#edeeef] active:scale-95 flex items-center justify-center text-[#023616] transition-all relative cursor-pointer shrink-0 ml-1.5"
          aria-label="Filter stores"
          title="Filters"
        >
          <span className="material-symbols-outlined text-sm">tune</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#fd8b00] text-[#603100] text-[10px] font-black flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Tapping the Search Bar Dropdown / Overlay */}
      {showDropdown && (
        <div className="absolute top-full inset-x-0 mt-2 bg-white rounded-3xl shadow-2xl border border-[#edeeef] max-h-[75vh] overflow-y-auto z-50 text-left p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* STATE 1: Empty Query - Show Recent Searches, Recently Viewed Stores, Popular Categories */}
          {!queryLower && (
            <>
              {/* RECENT SEARCHES (Requirements 4 & 5) */}
              {recentSearches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-[#191c1d] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#023616]">history</span>
                      <span>Recent Searches</span>
                    </span>
                    {onClearSearchHistory && (
                      <button
                        type="button"
                        onClick={onClearSearchHistory}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                      >
                        Clear Search History
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {recentSearches.map((item) => (
                      <div
                        key={item.searchId || `${item.storeId}_${item.searchedAt}`}
                        onClick={() => handleSelectRecentSearch(item)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f8f9fa] cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Green indicator dot from spec */}
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-2xs" />
                          <span className="text-sm font-bold text-[#191c1d] group-hover:text-[#023616] truncate">
                            {item.storeName}
                          </span>
                          {item.category && (
                            <span className="text-[10px] text-[#717970] bg-[#f3f4f5] px-1.5 py-0.5 rounded-md shrink-0">
                              {item.category}
                            </span>
                          )}
                        </div>

                        <span className="material-symbols-outlined text-xs text-[#717970] group-hover:translate-x-0.5 transition-transform shrink-0">
                          arrow_forward
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RECENTLY VIEWED STORES (Requirement 6) */}
              {recentStores.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-[#edeeef]/70">
                  <span className="text-xs font-extrabold text-[#191c1d] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#fd8b00]">visibility</span>
                    <span>Recently Viewed Stores</span>
                  </span>

                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {recentStores.map((item) => (
                      <button
                        key={item.storeId}
                        type="button"
                        onClick={() => handleSelectRecentStore(item)}
                        className="flex items-center gap-2 p-2 rounded-xl bg-[#f8f9fa] hover:bg-[#edeeef] border border-[#edeeef] shrink-0 text-left cursor-pointer transition-all max-w-[200px]"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-[#edeeef]">
                          {item.storeImage ? (
                            <img
                              src={item.storeImage}
                              alt={item.storeName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#023616]">
                              <span className="material-symbols-outlined text-sm">storefront</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 pr-1">
                          <p className="text-xs font-bold text-[#191c1d] truncate">
                            {item.storeName}
                          </p>
                          <p className="text-[10px] text-[#717970] truncate">
                            {item.category || 'Local Store'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* POPULAR CATEGORIES (Requirement 7) */}
              <div className="space-y-2 pt-1 border-t border-[#edeeef]/70">
                <span className="text-xs font-extrabold text-[#191c1d] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-blue-600">category</span>
                  <span>Popular Categories</span>
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {popularCategories.map((cat) => (
                    <button
                      key={cat.query}
                      type="button"
                      onClick={() => {
                        onChange(cat.query);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#f8f9fa] hover:bg-[#bbefc1]/30 hover:text-[#023616] text-[#414941] text-xs font-bold border border-[#edeeef] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm text-[#023616]">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STATE 2: Query Typed - Live Matching Stores First, Then Products (Requirement 7) */}
          {queryLower && (
            <div className="space-y-4">
              {/* STORE RESULTS */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-extrabold text-[#191c1d] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#023616]">storefront</span>
                    <span>Matching Stores ({matchingStores.length})</span>
                  </span>
                  <span className="text-[11px] text-[#717970]">Nearest first</span>
                </div>

                {matchingStores.length === 0 ? (
                  <p className="text-xs text-[#717970] py-2">
                    No stores matching "{value}" in Ghumarwin.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {matchingStores.map(({ store, distanceKm }) => {
                      const ratingCount = store.totalRatings ?? store.reviewsCount ?? 0;
                      const displayRating = store.averageRating ?? store.rating;
                      const hasRatings = ratingCount > 0 && displayRating > 0;
                      const isFav = favoriteStoreIds.has(store.id);

                      return (
                        <div
                          key={store.id}
                          onClick={() => {
                            onSelectStore(store, value);
                            setIsFocused(false);
                          }}
                          className="p-3 rounded-2xl bg-[#f8f9fa] hover:bg-[#f0f4f1] border border-[#edeeef] flex items-center justify-between gap-3 cursor-pointer transition-all group text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Store Image */}
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0 border border-[#edeeef] relative">
                              <img
                                src={store.image}
                                alt={store.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-extrabold text-sm text-[#191c1d] group-hover:text-[#023616] truncate">
                                  {store.name}
                                </h4>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-[#414941] border border-[#edeeef] shrink-0">
                                  {store.category}
                                </span>
                              </div>

                              <p className="text-[11px] text-[#717970] truncate mt-0.5">
                                📍 {store.area} · {store.subcategories}
                              </p>

                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className="font-bold text-[#023616] text-[11px]">
                                  {formatDistance(distanceKm)} away
                                </span>

                                <span className="text-[10px] font-semibold text-[#717970]">
                                  {store.isOpen ? '● Open' : '○ Closed'}
                                </span>

                                {hasRatings ? (
                                  <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#00210b] bg-[#bbefc1]/40 px-1.5 py-0.2 rounded">
                                    <span
                                      className="material-symbols-outlined text-[12px] text-amber-500"
                                      style={{ fontVariationSettings: "'FILL' 1" }}
                                    >
                                      star
                                    </span>
                                    <span>{displayRating.toFixed(1)}</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[#717970]">No ratings yet</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Favorite button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(store);
                            }}
                            className="w-8 h-8 rounded-full bg-white hover:bg-red-50 flex items-center justify-center transition-all cursor-pointer border border-[#edeeef] shrink-0"
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <span
                              className={`material-symbols-outlined text-base ${
                                isFav ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                              }`}
                              style={{ fontVariationSettings: isFav ? "'FILL' 1" : "'FILL' 0" }}
                            >
                              favorite
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PRODUCT RESULTS BELOW STORE RESULTS (Requirement 7) */}
              {matchingProducts.length > 0 && (
                <div className="pt-2 border-t border-[#edeeef]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-extrabold text-[#191c1d] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-700">inventory_2</span>
                      <span>Products Found ({matchingProducts.length})</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {matchingProducts.map(({ product, store }) => (
                      <div
                        key={`${store.id}_${product.id}`}
                        onClick={() => {
                          onSelectStore(store, value);
                          setIsFocused(false);
                        }}
                        className="p-2.5 rounded-xl bg-white border border-[#edeeef] hover:border-[#023616]/30 flex items-center justify-between gap-2 cursor-pointer transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-xs text-[#191c1d] truncate">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-[#717970] truncate mt-0.5">
                            Available at <span className="font-semibold text-[#023616]">{store.name}</span> · {product.unit}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-black text-[#023616]">
                            ₹{product.price}
                          </span>

                          {onAddToCart && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(store, product);
                              }}
                              className="px-2.5 py-1 bg-[#023616] hover:bg-[#1e4d2b] text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <span className="material-symbols-outlined text-xs">add</span>
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NO RESULTS STATE */}
              {matchingStores.length === 0 && matchingProducts.length === 0 && (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-3xl text-gray-400 mb-1">
                    search_off
                  </span>
                  <p className="text-sm font-bold text-[#191c1d]">
                    No stores or items found for "{value}"
                  </p>
                  <p className="text-xs text-[#717970] mt-1 max-w-xs mx-auto">
                    Try searching for grocery, dairy, bakery, medicine, or local Ghumarwin merchant names.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
