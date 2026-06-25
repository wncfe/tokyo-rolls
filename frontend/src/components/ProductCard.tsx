import React from 'react';
import { Plus, Minus, Flame, Sparkles } from 'lucide-react';
import { MenuItem } from '../types';

interface ProductCardProps {
  product: MenuItem;
  cartQuantity: number;
  onAddToCart: () => void;
  onRemoveFromCart: () => void;
  onClickCard: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
  onClickCard,
}) => {
  
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart();
  };

  const handleMinusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveFromCart();
  };

  return (
    <div
      onClick={onClickCard}
      className="group relative flex flex-col justify-between bg-white border border-slate-200/60 rounded-3xl p-5 md:p-7 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-100/40 hover:border-slate-300/80 hover:-translate-y-1.5 cursor-pointer"
    >
      {/* Upper info & image */}
      <div>
        {/* Image Container with Badges */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-50">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 to-transparent" />

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {product.isNew && (
              <span className="flex items-center gap-1 bg-amber-400 text-amber-950 text-[11px] font-black uppercase px-2.5 py-1 rounded-full shadow-md">
                <Sparkles className="w-3 h-3 fill-amber-950" />
                NEW
              </span>
            )}
            {product.benefitBadge && (
              <div className="bg-rose-100 border border-rose-200/50 text-[#E11D48] text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                {product.benefitBadge.toLowerCase().includes('выгод') && (
                  <span className="w-1.5 h-1.5 bg-[#E11D48] rounded-full animate-pulse" />
                )}
                {product.benefitBadge}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-slate-900 font-bold text-lg md:text-2xl mt-5 tracking-tight group-hover:text-[#E11D48] transition-colors line-clamp-1">
          {product.name}
        </h3>

        {/* Size stats (weight/pieces) */}
        <p className="text-slate-500 text-sm font-mono mt-1.5 select-none">
          {product.pieces > 1 ? `${product.pieces} шт` : '1 шт'} • {product.weight} г
        </p>
      </div>

      {/* Footer Price & Counter controls */}
      <div className="mt-5 flex items-center justify-between gap-2.5">
        
        {/* Weight & price layout */}
        <div className="flex flex-col">
          <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Цена</span>
          <span className="text-slate-900 font-mono font-black text-xl md:text-3xl tracking-tight">
            {product.price} <span className="text-base text-slate-500 font-normal">₽</span>
          </span>
        </div>

        {/* Action Button / Input Counter */}
        {cartQuantity > 0 ? (
          <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl p-0.5 shadow-sm select-none transition-all duration-300">
            <button
              onClick={handleMinusClick}
              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-600 border border-slate-200/60 flex items-center justify-center transition-all cursor-pointer"
              title="Уменьшить"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-900 text-sm font-black min-w-8 text-center font-mono">
              {cartQuantity}
            </span>
            <button
              onClick={handleAddClick}
              className="w-8 h-8 rounded-xl bg-[#E11D48] text-white hover:bg-[#BE123C] flex items-center justify-center transition-all cursor-pointer"
              title="Добавить еще"
            >
              <Plus className="w-3.5 h-3.5 animate-pulse" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddClick}
            className="h-10 px-5 bg-[#E11D48]/10 hover:bg-[#E11D48] text-[#E11D48] hover:text-white font-bold text-sm md:text-base rounded-xl tracking-tight transition-all duration-300 shadow-sm hover:shadow-rose-200 active:scale-95 cursor-pointer uppercase border border-[#E11D48]/20 hover:border-transparent"
          >
            В корзину
          </button>
        )}

      </div>
    </div>
  );
};

export default ProductCard;
