import { useState, useRef, useEffect, useCallback } from 'react';

const CATEGORY_IDS = [
  'sets', 'rolls-firm', 'rolls-baked', 'rolls-free', 'rolls-warm',
  'rolls-classic', 'sushi', 'pokesalads', 'hot', 'desserts', 'dop',
] as const;

const CATEGORY_MAP: Record<string, { category: string; subcategory?: string }> = {
  'sets': { category: 'sets' },
  'rolls-firm': { category: 'rolls', subcategory: 'firm' },
  'rolls-baked': { category: 'rolls', subcategory: 'baked' },
  'rolls-free': { category: 'rolls', subcategory: 'free' },
  'rolls-warm': { category: 'rolls', subcategory: 'warm' },
  'rolls-classic': { category: 'rolls', subcategory: 'classic' },
  'sushi': { category: 'sushi' },
  'pokesalads': { category: 'pokesalads' },
  'hot': { category: 'hot' },
  'desserts': { category: 'desserts' },
  'dop': { category: 'dop' },
};

export function useScrollSpy() {
  const [activeCategory, setActiveCategory] = useState('sets');
  const [activeSubcategory, setActiveSubcategory] = useState<'firm' | 'baked' | 'free' | 'warm' | 'classic'>('firm');
  const isProgrammaticRef = useRef(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlock = useCallback(() => {
    isProgrammaticRef.current = false;
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    window.removeEventListener('scrollend', unlock);
  }, []);

  // Scroll-based active category detection
  useEffect(() => {
    const handleScroll = () => {
      if (isProgrammaticRef.current) return;
      const scrollY = window.scrollY + 180;

      for (let i = CATEGORY_IDS.length - 1; i >= 0; i--) {
        const el = document.getElementById(`category-${CATEGORY_IDS[i]}`);
        if (el && scrollY >= el.offsetTop) {
          const mapped = CATEGORY_MAP[CATEGORY_IDS[i]];
          setActiveCategory(mapped.category);
          if (mapped.subcategory) setActiveSubcategory(mapped.subcategory as any);
          return;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Programmatic navigation: lock scroll detection, scroll to section
  const navigateTo = useCallback((category: string, subcategory?: string) => {
    isProgrammaticRef.current = true;
    window.addEventListener('scrollend', unlock, { once: true });
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(unlock, 2000);

    setActiveCategory(category);
    if (subcategory) setActiveSubcategory(subcategory as any);

    // Build element ID
    let elementId: string;
    if (category === 'rolls' && subcategory) {
      elementId = `category-rolls-${subcategory}`;
    } else {
      elementId = `category-${category}`;
    }

    const el = document.getElementById(elementId);
    if (el) {
      const navBarHeight = category === 'rolls' ? 96 : 56;
      const offset = 72 + navBarHeight;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [unlock]);

  return { activeCategory, activeSubcategory, navigateTo };
}
