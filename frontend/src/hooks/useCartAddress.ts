import { useState, useEffect } from 'react';
import { Address } from '../types';

const SELECTED_ADDRESS_KEY = 'tokyo-rolls-selected-address-id';

export function useCartAddress(addresses: Address[]) {
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(SELECTED_ADDRESS_KEY);
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Persist selectedAddressId в localStorage
  useEffect(() => {
    try {
      if (selectedAddressId !== null) {
        localStorage.setItem(SELECTED_ADDRESS_KEY, String(selectedAddressId));
      } else {
        localStorage.removeItem(SELECTED_ADDRESS_KEY);
      }
    } catch { /* silent */ }
  }, [selectedAddressId]);

  // Авто-выбор адреса по умолчанию, когда адреса загрузились
  useEffect(() => {
    if (addresses.length === 0) return;
    // Если текущий selectedAddressId есть в списке — оставляем
    if (selectedAddressId && addresses.some(a => a.id === selectedAddressId)) return;
    // Иначе выбираем основной (или первый)
    const defaultAddr = addresses.find(a => a.is_default) ?? addresses[0];
    setSelectedAddressId(defaultAddr.id);
  }, [addresses, selectedAddressId]);

  return {
    deliveryAddress, setDeliveryAddress,
    selectedAddressId, setSelectedAddressId,
    isAddressModalOpen, setIsAddressModalOpen,
    editingAddress, setEditingAddress,
  };
}
