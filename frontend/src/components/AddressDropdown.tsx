import { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Plus, Edit2, Check } from 'lucide-react';
import { Address } from '../types';

interface AddressDropdownProps {
  addresses: Address[];
  selectedAddressId: number | null;
  onSelect: (id: number) => void;
  onAddNew: () => void;
  onEdit: (address: Address) => void;
}

export default function AddressDropdown({
  addresses,
  selectedAddressId,
  onSelect,
  onAddNew,
  onEdit,
}: AddressDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);
  const displayText = selectedAddress
    ? selectedAddress.full_address
    : addresses.length === 0
      ? 'Добавить адрес доставки'
      : 'Выберите адрес доставки';

  return (
    <div ref={containerRef} className="relative mb-4">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 hover:border-slate-300 transition-all cursor-pointer"
      >
        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="flex-1 text-left truncate font-medium">
          {displayText}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden animate-fadeIn">
          {/* Address list */}
          <div className="max-h-52 overflow-y-auto">
            {addresses.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <p className="text-xs text-slate-400">Нет сохранённых адресов</p>
              </div>
            ) : (
              addresses.map(addr => {
                const isSelected = selectedAddressId === addr.id;
                const extras: string[] = [];
                if (addr.flat) extras.push(`кв./офис ${addr.flat}`);
                if (addr.entrance) extras.push(`п. ${addr.entrance}`);
                if (addr.floor) extras.push(`эт. ${addr.floor}`);

                return (
                  <div
                    key={addr.id}
                    onClick={() => {
                      onSelect(addr.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-100'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Check / radio */}
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-slate-600 bg-slate-600'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </div>

                    {/* Address text */}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-slate-800 truncate block">
                        {addr.full_address}
                      </span>
                      {extras.length > 0 && (
                        <span className="text-[10px] text-slate-400 block truncate">
                          {extras.join(', ')}
                        </span>
                      )}
                      {addr.is_default && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          По умолчанию
                        </span>
                      )}
                    </div>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onEdit(addr);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all shrink-0"
                      title="Редактировать"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Add new address button */}
          <div className="border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onAddNew();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Добавить адрес</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
