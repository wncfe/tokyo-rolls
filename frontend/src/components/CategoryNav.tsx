import { useState } from 'react';

interface CategoryNavProps {
  activeCategory: string;
  activeSubcategory?: string;
  onSelectCategory: (category: string, subcategory?: string) => void;
}

export default function CategoryNav({
  activeCategory,
  activeSubcategory,
  onSelectCategory,
}: CategoryNavProps) {
  const categories = [
    { id: 'sets', name: 'Сеты 🍱' },
    { id: 'rolls', name: 'Роллы 🥢' },
    { id: 'sushi', name: 'Суши 🍣' },
    { id: 'pokesalads', name: 'Поке/Салаты 🥗' },
    { id: 'hot', name: 'Горячее 🍜' },
    { id: 'desserts', name: 'Десерты 🍰' },
    { id: 'dop', name: 'Дополнительно 🍶' },
  ];

  const subcategories = [
    { id: 'firm', name: '🔥 Большие' },
    { id: 'baked', name: '🧀 Запеченные' },
    { id: 'free', name: '🍤 Фри' },
    { id: 'warm', name: '🌡️ Теплые' },
    { id: 'classic', name: '🥑 Классические' },
  ];

  const handleMainCategoryClick = (catId: string) => {
    if (catId === 'rolls') {
      onSelectCategory('rolls', 'firm');
    } else {
      onSelectCategory(catId);
    }
  };

  const handleSubCategoryClick = (subId: 'firm' | 'baked' | 'free' | 'warm' | 'classic') => {
    onSelectCategory('rolls', subId);
  };

  return (
    <div className="sticky top-[72px] z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm py-3 px-4">
      <div className="max-w-7xl mx-auto flex flex-col">
        
        {/* Main Categories Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 -mb-1 w-full max-w-full">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`nav-cat-${cat.id}`}
                  onClick={() => handleMainCategoryClick(cat.id as 'sets' | 'sushi' | 'rolls' | 'pokesalads' | 'hot' | 'desserts' | 'dop')}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 select-none cursor-pointer ${
                    isActive
                      ? 'bg-[#E11D48] text-white shadow-md shadow-rose-200/40 scale-102 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-800 hover:bg-slate-200/75'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subcategories Row - animated to prevent sudden layout shifts */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            activeCategory === 'rolls'
              ? 'grid-rows-[1fr] opacity-100 mt-2'
              : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
          }`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono mr-2 hidden sm:inline select-none">
                Виды роллов:
              </span>
              {subcategories.map((sub) => {
                const isActive = activeSubcategory === sub.id;
                return (
                  <button
                    key={sub.id}
                    id={`nav-sub-${sub.id}`}
                    onClick={() => handleSubCategoryClick(sub.id as 'firm' | 'baked' | 'free' | 'warm' | 'classic')}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 select-none cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                    }`}
                  >
                    {sub.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
