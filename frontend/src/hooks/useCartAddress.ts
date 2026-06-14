import { useState } from 'react';
import { Address } from '../types';

export function useCartAddress() {
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  return {
    deliveryAddress, setDeliveryAddress,
    selectedAddressId, setSelectedAddressId,
    isAddressModalOpen, setIsAddressModalOpen,
    editingAddress, setEditingAddress,
  };
}
