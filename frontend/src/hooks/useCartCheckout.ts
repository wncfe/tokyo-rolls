import { useState, useEffect } from 'react';
import { CheckoutData, CartItem, PaymentMethod } from '../types';
import { submitOrder, validatePromo } from '../api';

interface CheckoutParams {
  cart: CartItem[];
  orderType: 'delivery' | 'pickup';
  selectedAddressId: number | null;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  onClearCart: () => void;
}

export function useCartCheckout(isOpen: boolean) {
  const [promoCode, setPromoCode] = useState('');
  const [promoData, setPromoData] = useState<{ discount_percent: number; description: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card_online');

  // Reset order states when drawer opens
  useEffect(() => {
    if (isOpen) {
      setOrderSuccess(false);
      setOrderError(null);
      setPromoData(null);
      setPromoError(null);
      setPromoCode('');
    }
  }, [isOpen]);

  const handlePromoApply = async () => {
    setPromoError(null);
    const code = promoCode.trim();
    if (!code) {
      setPromoData(null);
      return;
    }
    try {
      const result = await validatePromo(code);
      setPromoData(result);
    } catch (err: any) {
      setPromoError(err.message || 'Неверный промокод');
      setPromoData(null);
    }
  };

  const handleCheckout = async ({ cart, orderType, selectedAddressId, deliveryAddress, paymentMethod: pm, onClearCart }: CheckoutParams) => {
    setOrderError(null);
    setIsSubmitting(true);
    try {
      const items: CheckoutData['items'] = cart.map(item => {
        const product = item.product;
        if ('category' in product) {
          return { product_slug: product.id, quantity: item.quantity };
        } else {
          return { set_slug: product.id, quantity: item.quantity };
        }
      });

      const orderData: CheckoutData = {
        comment: '',
        promo_code: promoData ? promoCode.trim() : '',
        order_type: orderType,
        payment_method: pm,
        items,
      };

      if (orderType === 'delivery') {
        if (selectedAddressId) {
          orderData.address_id = selectedAddressId;
        } else if (deliveryAddress.trim()) {
          orderData.delivery_address = deliveryAddress.trim();
        }
      }

      const result = await submitOrder(orderData);

      // Если ЮKassa вернула payment_url — редиректим пользователя на оплату
      if (result.payment_url) {
        // Очищаем корзину до редиректа на ЮKassa
        onClearCart();
        window.location.href = result.payment_url;
        return;
      }

      setOrderSuccess(true);
      onClearCart();
      setPromoCode('');
      setPromoData(null);
    } catch (err: any) {
      setOrderError(err.message || 'Ошибка при оформлении заказа');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    promoCode, setPromoCode,
    promoData, setPromoData,
    promoError, setPromoError,
    isSubmitting,
    orderSuccess, setOrderSuccess,
    orderError, setOrderError,
    paymentMethod, setPaymentMethod,
    handlePromoApply,
    handleCheckout,
  };
}
