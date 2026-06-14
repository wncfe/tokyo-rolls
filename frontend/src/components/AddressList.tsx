import { MapPin, Plus, Edit2, Star } from 'lucide-react';
import { Address } from '../types';

interface AddressListProps {
  addresses: Address[];
  selectedAddressId: number | null;
  onSelect: (id: number) => void;
  onAddNew: () => void;
  onEdit: (address: Address) => void;
}

export default function AddressList({
  addresses,
  selectedAddressId,
  onSelect,
  onAddNew,
  onEdit,
}: AddressListProps) {
  if (addresses.length === 0) {
    return (
      <div className="mb-4">
        <button
          onClick={onAddNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить адрес доставки</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        Адрес доставки
      </label>
      <div className="space-y-2">
        {addresses.map((addr) => {
          const isSelected = selectedAddressId === addr.id;
          const extras: string[] = [];
          if (addr.flat) extras.push(`кв./офис ${addr.flat}`);
          if (addr.entrance) extras.push(`п. ${addr.entrance}`);
          if (addr.floor) extras.push(`эт. ${addr.floor}`);
          if (addr.intercom) extras.push(`дом. ${addr.intercom}`);

          return (
            <div
              key={addr.id}
              onClick={() => onSelect(addr.id)}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-rose-50 border-[#E11D48] ring-1 ring-rose-200'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Radio indicator */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  isSelected
                    ? 'border-[#E11D48] bg-[#E11D48]'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              {/* Address details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {addr.full_address}
                  </span>
                  {addr.is_default && (
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                  )}
                </div>
                {extras.length > 0 && (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {extras.join(', ')}
                  </p>
                )}
                {addr.comment && (
                  <p className="text-[10px] text-slate-400 mt-0.5 italic">
                    {addr.comment}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(addr);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all cursor-pointer shrink-0"
                title="Редактировать"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={onAddNew}
        className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-transparent hover:bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Добавить ещё адрес</span>
      </button>
    </div>
  );
}
