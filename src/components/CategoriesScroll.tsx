import React from 'react';
import { CategoryType } from '../types';

interface CategoriesScrollProps {
  selectedCategory: CategoryType;
  onSelectCategory: (cat: CategoryType) => void;
  onSeeAllClick: () => void;
}

interface CategoryItem {
  id: CategoryType;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'Grocery', label: 'Grocery', icon: 'local_mall' },
  { id: 'Bakery', label: 'Bakery', icon: 'bakery_dining' },
  { id: 'Pharmacy', label: 'Pharmacy', icon: 'pill' },
  { id: 'Restaurants', label: 'Restaurants', icon: 'restaurant' },
  { id: 'Clothing', label: 'Clothing', icon: 'checkroom' },
  { id: 'Electronics', label: 'Electronics', icon: 'devices' },
  { id: 'Organic', label: 'Organic', icon: 'eco' },
];

export const CategoriesScroll: React.FC<CategoriesScrollProps> = ({
  selectedCategory,
  onSelectCategory,
  onSeeAllClick,
}) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-[#191c1d] tracking-tight">Categories</h2>
        <button
          onClick={onSeeAllClick}
          className="text-[#023616] text-xs font-semibold hover:underline cursor-pointer py-1"
        >
          See All
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
        {/* 'All' pill / chip option if user wants to reset */}
        <button
          onClick={() => onSelectCategory('All')}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-200 group-hover:scale-105 ${
              selectedCategory === 'All'
                ? 'bg-[#023616] text-white shadow-md ring-2 ring-[#023616]/30'
                : 'bg-[#e1e3e4] text-[#191c1d]'
            }`}
          >
            <span className="material-symbols-outlined text-[26px]">grid_view</span>
          </div>
          <span
            className={`text-xs font-semibold ${
              selectedCategory === 'All' ? 'text-[#023616] font-bold' : 'text-[#191c1d]'
            }`}
          >
            All
          </span>
        </button>

        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? 'All' : cat.id)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-200 group-hover:scale-105 ${
                  isSelected
                    ? 'bg-[#023616] text-white shadow-md ring-2 ring-[#023616]/30'
                    : 'bg-[#e1e3e4] text-[#191c1d]'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={isSelected ? { fontVariationSettings: "'FILL' 1" } : { fontVariationSettings: "'FILL' 0" }}
                >
                  {cat.icon}
                </span>
              </div>
              <span
                className={`text-xs font-semibold ${
                  isSelected ? 'text-[#023616] font-bold' : 'text-[#191c1d]'
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
