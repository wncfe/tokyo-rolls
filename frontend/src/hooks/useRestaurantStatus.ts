import { useState, useEffect } from 'react';
import { RestaurantSettings } from '../types';

export function useRestaurantStatus(settings: RestaurantSettings) {
  const [isOpen, setIsOpen] = useState(() => {
    const hours = new Date().getHours();
    return hours >= settings.opening_hour && hours < settings.closing_hour;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const hours = new Date().getHours();
      setIsOpen(hours >= settings.opening_hour && hours < settings.closing_hour);
    }, 15000);
    return () => clearInterval(timer);
  }, [settings.opening_hour, settings.closing_hour]);

  return isOpen;
}
