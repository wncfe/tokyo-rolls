import { useState, useEffect } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { Address, AddressFormData } from '../types';
import DadataAddressInput from './DadataAddressInput';

interface AddressFormModalProps {
  isOpen: boolean;
  address?: Address | null; // null = create, Address = edit
  onClose: () => void;
  onSave: (data: AddressFormData) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export default function AddressFormModal({
  isOpen,
  address,
  onClose,
  onSave,
  onDelete,
}: AddressFormModalProps) {
  const [fullAddress, setFullAddress] = useState('');
  const [lat, setLat] = useState<string | null>(null);
  const [lon, setLon] = useState<string | null>(null);
  const [flat, setFlat] = useState('');
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [intercom, setIntercom] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!address;

  useEffect(() => {
    if (isOpen) {
      if (address) {
        setFullAddress(address.full_address);
        setLat(address.latitude ?? null);
        setLon(address.longitude ?? null);
        setFlat(address.flat);
        setEntrance(address.entrance);
        setFloor(address.floor);
        setIntercom(address.intercom);
        setComment(address.comment);
      } else {
        setFullAddress('');
        setLat(null);
        setLon(null);
        setFlat('');
        setEntrance('');
        setFloor('');
        setIntercom('');
        setComment('');
      }
      setError(null);
    }
  }, [isOpen, address]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullAddress.trim()) {
      setError('Введите адрес');
      return;
    }
    if (lat === null) {
      setError('Укажите номер дома — нужен точный адрес для доставки');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSave({
        full_address: fullAddress.trim(),
        latitude: lat,
        longitude: lon,
        flat: flat.trim(),
        entrance: entrance.trim(),
        floor: floor.trim(),
        intercom: intercom.trim(),
        comment: comment.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения адреса');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!address || !onDelete) return;
    setLoading(true);
    try {
      await onDelete(address.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления адреса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ cursor: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'14\' fill=\'black\'/%3E%3Cpath d=\'M11 11 L21 21 M21 11 L11 21\' stroke=\'white\' stroke-width=\'3\' stroke-linecap=\'round\'/%3E%3C/svg%3E"), auto' }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: 'default' }}
        className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden animate-scaleUp"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#E11D48]" />
            <h2 className="text-slate-900 text-lg font-black tracking-tight">
              {isEdit ? 'Изменить адрес' : 'Новый адрес'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Адрес *
            </label>
            <DadataAddressInput value={fullAddress} onChange={(addr, newLat, newLon) => { setFullAddress(addr); setLat(newLat ?? null); setLon(newLon ?? null); }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Квартира / офис
              </label>
              <input
                type="text"
                value={flat}
                onChange={(e) => setFlat(e.target.value)}
                placeholder="42"
                maxLength={20}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Подъезд
              </label>
              <input
                type="text"
                value={entrance}
                onChange={(e) => setEntrance(e.target.value)}
                placeholder="1"
                maxLength={20}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Этаж
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="3"
                maxLength={20}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Домофон
              </label>
              <input
                type="text"
                value={intercom}
                onChange={(e) => setIntercom(e.target.value)}
                placeholder="42#1234"
                maxLength={50}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Комментарий курьеру
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: ворота справа, дом во дворе"
              rows={2}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-rose-100 transition-all resize-none"
            />
          </div>

          {fullAddress.trim() && lat === null && (
            <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-700 font-medium text-center leading-tight">
              Укажите номер дома — выберите адрес из подсказок с номером дома
            </div>
          )}

          <div className="flex gap-2 mt-2">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-5 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm rounded-xl border border-red-200 transition-all cursor-pointer disabled:opacity-50"
              >
                Удалить
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !fullAddress.trim() || lat === null}
              className="flex-1 py-3 bg-[#E11D48] hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Сохраняем...</>
              ) : (
                'Сохранить'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
