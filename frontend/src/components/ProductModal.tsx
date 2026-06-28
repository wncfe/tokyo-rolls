import { X, Plus, Minus } from 'lucide-react';
import { MenuItem, Set } from '../types';

interface ProductModalProps {
  isOpen: boolean;
  product: MenuItem | null;
  onClose: () => void;
  cartQuantity: number;
  onAddToCart: () => void;
  onRemoveFromCart: () => void;
}

export default function ProductModal({
  isOpen,
  product,
  onClose,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
}: ProductModalProps) {
  if (!isOpen || !product) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 overflow-y-auto"
    >
      {/* Modal content box */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scaleUp max-h-[90vh] md:max-h-[85vh]"
      >
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all shadow-md cursor-pointer select-none border border-slate-200/40"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT: Image */}
        <div className="w-full md:w-1/2 relative bg-slate-50 flex items-center justify-center select-none">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover aspect-square md:aspect-auto md:h-full max-h-[300px] md:max-h-full"
            referrerPolicy="no-referrer"
          />
          {product.benefitBadge && (
            <div className="absolute bottom-4 left-4 bg-[#E11D48] text-white font-bold text-xs uppercase px-4 py-1.5 rounded-full shadow-lg">
              {product.benefitBadge}
            </div>
          )}
        </div>

        {/* RIGHT: Product specifications */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Header info */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-slate-900 text-xl md:text-2xl font-black tracking-tight leading-tight">
                {product.name}
              </h2>
            </div>

            {/* Weight/pieces bar */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-xs font-mono text-slate-500 select-none mb-4 rounded-full">
              <span>{product.pieces > 1 ? `${product.pieces} шт.` : '1 шт'}</span>
              <span className="text-slate-300">•</span>
              <span>{product.weight} г</span>
            </div>

            {/* Description */}
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {product.description}
            </p>

            {/* СОСТАВ (Composition) */}
            <div className="mb-5">
              <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2.5">
                🍀 Состав:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {product.composition.map((ingredient, i) => (
                  <span
                    key={i}
                    className="text-xs bg-slate-50 border border-slate-200/50 text-slate-650 px-3 py-1.5 rounded-xl font-medium"
                  >
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>

            {/* АЛЛЕРГЕНЫ (Allergens) */}
            {product.allergens && product.allergens.length > 0 && (
              <div className="mb-4 pt-1">
                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Аллергены:
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {product.allergens.map((allergen, i) => (
                    <span
                      key={i}
                      className="text-xs bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-1.5 rounded-lg font-medium"
                    >
                      {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* СОСТАВ СЕТА (Set included products) */}
            {'includedProducts' in product && product.includedProducts && product.includedProducts.length > 0 && (
              <div className="mb-4 pt-1">
                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  🍱 Состав набора:
                </h4>
                <div className="flex flex-col gap-1.5">
                  {(product as Set).includedProducts.map((ip) => (
                    <span
                      key={ip.id}
                      className="text-xs bg-slate-50 border border-slate-200/50 text-slate-650 px-3 py-1.5 rounded-xl font-medium flex justify-between"
                    >
                      <span>{ip.name}</span>
                      <span className="text-slate-400 ml-2">×{ip.quantity}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pricing & buy actions */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-slate-450 text-xs select-none">Общая стоимость</span>
              <span className="text-slate-900 font-mono font-black text-2xl md:text-3xl tracking-tight">
                {product.price} <span className="text-sm font-normal text-slate-400">₽</span>
              </span>
            </div>

            {/* Buy controls */}
            {cartQuantity > 0 ? (
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl p-1 select-none">
                <button
                  onClick={onRemoveFromCart}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-slate-200 text-slate-650 flex items-center justify-center transition-all cursor-pointer border border-slate-200"
                  title="Убрать один"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-slate-900 text-base font-bold min-w-10 text-center font-mono">
                  {cartQuantity}
                </span>
                <button
                  onClick={onAddToCart}
                  className="w-10 h-10 rounded-xl bg-[#E11D48] text-white hover:bg-[#BE123C] flex items-center justify-center transition-all cursor-pointer"
                  title="Добавить один"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onAddToCart}
                className="px-6 py-3.5 bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-sm tracking-tight rounded-2xl hover:shadow-xl hover:shadow-rose-100/50 active:scale-95 transition-all duration-300 cursor-pointer uppercase border border-transparent"
              >
                Добавить за {product.price} ₽
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
