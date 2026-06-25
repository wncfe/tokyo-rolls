import { Trash2, Minus, Plus } from 'lucide-react';
import { CartItem } from '../types';

interface CartItemRowProps {
  item: CartItem;
  onAddToCart: (itemId: string) => void;
  onRemoveFromCart: (itemId: string) => void;
  onClearItem: (itemId: string) => void;
}

export default function CartItemRow({ item, onAddToCart, onRemoveFromCart, onClearItem }: CartItemRowProps) {
  return (
    <div className="flex items-center gap-4 bg-slate-50/50 border border-slate-200/60 p-3 rounded-2xl group transition-all hover:bg-slate-50 hover:border-slate-300">
      {/* Thumb */}
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 select-none border border-slate-100">
        <img
          src={item.product.image}
          alt={item.product.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-slate-900 text-sm font-bold truncate tracking-tight mb-0.5 group-hover:text-[#E11D48] transition-colors">
          {item.product.name}
        </h4>
        <p className="text-slate-500 text-xs font-mono select-none">
          {item.product.weight} г • {item.product.price} ₽
        </p>

        {/* Pricing and Counters inline row */}
        <div className="flex items-center justify-between mt-2">
          {/* Counter widget */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 select-none">
            <button
              onClick={() => onRemoveFromCart(item.product.id)}
              className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/40"
              title="Уменьшить"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-900 font-mono text-sm font-bold min-w-7 text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onAddToCart(item.product.id)}
              className="w-8 h-8 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white flex items-center justify-center transition-colors cursor-pointer border-0"
              title="Добавить"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Total item amount */}
          <span className="text-slate-900 font-mono text-sm font-bold">
            {(item.product.price * item.quantity).toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>

      {/* Trash option */}
      <button
        onClick={() => onClearItem(item.product.id)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-[#E11D48] hover:bg-slate-100 transition-all cursor-pointer"
        title="Удалить позицию"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
