import React from 'react';

export interface FilterOptions {
  onlySmartPickup: boolean;
  onlyOpenNow: boolean;
  maxDistanceKm: number;
  minRating: number;
}

interface FilterDrawerProps {
  filters: FilterOptions;
  onChangeFilters: (filters: FilterOptions) => void;
  onReset: () => void;
  onClose: () => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  filters,
  onChangeFilters,
  onReset,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6 duration-300"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 border-b border-[#edeeef] flex justify-between items-center bg-[#f8f9fa]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#023616] text-xl">tune</span>
            <h3 className="font-extrabold text-base text-[#191c1d]">Filter Stores</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#edeeef] hover:bg-[#e7e8e9] flex items-center justify-center text-[#414941] cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-4 space-y-4 text-left">
          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8f9fa] border border-[#edeeef]">
              <div>
                <div className="text-xs font-bold text-[#191c1d] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#fd8b00]">bolt</span>
                  Smart Pickup Available
                </div>
                <div className="text-[11px] text-[#717970]">Order ahead and collect without queues</div>
              </div>
              <input
                type="checkbox"
                checked={filters.onlySmartPickup}
                onChange={(e) =>
                  onChangeFilters({ ...filters, onlySmartPickup: e.target.checked })
                }
                className="w-5 h-5 accent-[#023616] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8f9fa] border border-[#edeeef]">
              <div>
                <div className="text-xs font-bold text-[#191c1d] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#023616]" />
                  Open Now Only
                </div>
                <div className="text-[11px] text-[#717970]">Shops taking orders currently in Ghumarwin</div>
              </div>
              <input
                type="checkbox"
                checked={filters.onlyOpenNow}
                onChange={(e) =>
                  onChangeFilters({ ...filters, onlyOpenNow: e.target.checked })
                }
                className="w-5 h-5 accent-[#023616] cursor-pointer"
              />
            </div>
          </div>

          {/* Distance */}
          <div>
            <label className="block text-xs font-bold text-[#191c1d] mb-2">
              Maximum Distance: <span className="text-[#023616]">{filters.maxDistanceKm} km</span>
            </label>
            <div className="flex gap-2">
              {[1, 1.5, 2, 5].map((d) => (
                <button
                  key={d}
                  onClick={() => onChangeFilters({ ...filters, maxDistanceKm: d })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    filters.maxDistanceKm === d
                      ? 'bg-[#023616] text-white border-[#023616]'
                      : 'bg-white text-[#414941] border-[#edeeef] hover:bg-[#f8f9fa]'
                  }`}
                >
                  {d} km
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-bold text-[#191c1d] mb-2">
              Minimum Rating
            </label>
            <div className="flex gap-2">
              {[0, 4.5, 4.8].map((r) => (
                <button
                  key={r}
                  onClick={() => onChangeFilters({ ...filters, minRating: r })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    filters.minRating === r
                      ? 'bg-[#023616] text-white border-[#023616]'
                      : 'bg-white text-[#414941] border-[#edeeef] hover:bg-[#f8f9fa]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">star</span>
                  <span>{r === 0 ? 'Any' : `${r}+`}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#edeeef] bg-[#f8f9fa] flex gap-2">
          <button
            onClick={onReset}
            className="flex-1 py-2.5 rounded-xl border border-[#c1c9be] text-[#414941] text-xs font-bold hover:bg-white cursor-pointer transition-colors"
          >
            Reset Filters
          </button>
          <button
            onClick={onClose}
            className="flex-2 py-2.5 rounded-xl bg-[#023616] text-white text-xs font-bold hover:bg-[#1e4d2b] cursor-pointer shadow-sm transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
