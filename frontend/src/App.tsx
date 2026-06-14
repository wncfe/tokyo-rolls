import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CategoryNav from './components/CategoryNav';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import { CartItem, Product, Set, MenuItem, User, LoginData, RegisterData } from './types';
import { Flame, Sparkles, Clock, MapPin, Star, ShoppingBag } from 'lucide-react';
import {
  fetchMenu, transformMenuData, MenuData,
  loginUser, registerUser, fetchProfile, refreshToken,
  getStoredToken, clearStoredToken,
} from './api';

const CART_STORAGE_KEY = 'tokyo-rolls-cart';

export default function App() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (err) {
      console.error('Failed to save cart to localStorage:', err);
    }
  }, [cart]);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Try to restore session on mount
  useEffect(() => {
    const tokens = getStoredToken();
    if (!tokens?.access) return;
    (async () => {
      try {
        const profile = await fetchProfile();
        setUser(profile);
      } catch {
        // Token expired, try refresh
        try {
          await refreshToken();
          const profile = await fetchProfile();
          setUser(profile);
        } catch {
          clearStoredToken();
        }
      }
    })();
  }, []);

  // Auth handlers
  const handleLogin = async (data: LoginData) => {
    await loginUser(data);
    const profile = await fetchProfile();
    setUser(profile);
  };

  const handleRegister = async (data: RegisterData) => {
    await registerUser(data);
    await handleLogin({ username: data.username, password: data.password });
  };

  const handleLogout = () => {
    clearStoredToken();
    setUser(null);
  };

  const [activeCategory, setActiveCategory] = useState<string>('sets');
  const [activeSubcategory, setActiveSubcategory] = useState<'baked' | 'warm' | 'classic'>('baked');
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Menu data from backend
  const [menuData, setMenuData] = useState<MenuData[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Dynamic restaurant open/close status (11:00 to 23:00)
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(() => {
    const hours = new Date().getHours();
    return hours >= 11 && hours < 23;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const hours = new Date().getHours();
      setIsRestaurantOpen(hours >= 11 && hours < 23);
    }, 15000); // Check every 15 seconds
    return () => clearInterval(timer);
  }, []);

  // Fetch menu data from backend
  useEffect(() => {
    const loadMenu = async () => {
      try {
        setIsLoadingMenu(true);
        setMenuError(null);
        const data = await fetchMenu();
        const transformedData = transformMenuData(data);
        setMenuData(transformedData);
      } catch (error) {
        console.error('Failed to load menu:', error);
        setMenuError('Не удалось загрузить меню. Проверьте подключение к серверу.');
      } finally {
        setIsLoadingMenu(false);
      }
    };

    loadMenu();
  }, []);

  const isOpen = isRestaurantOpen;

  // Sync scroll positions to highlight active category in navigation bar
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;

      const setsSection = document.getElementById('category-sets');
      const sushiSection = document.getElementById('category-sushi');
      const rollsBakedSection = document.getElementById('category-rolls-baked');
      const rollsWarmSection = document.getElementById('category-rolls-warm');
      const rollsClassicSection = document.getElementById('category-rolls-classic');
      const hotSection = document.getElementById('category-hot');
      const dessertsSection = document.getElementById('category-desserts');
      const drinksSection = document.getElementById('category-drinks');
      const saucesSection = document.getElementById('category-sauces');

      if (saucesSection && scrollPosition >= saucesSection.offsetTop) {
        setActiveCategory('sauces');
      } else if (drinksSection && scrollPosition >= drinksSection.offsetTop) {
        setActiveCategory('drinks');
      } else if (dessertsSection && scrollPosition >= dessertsSection.offsetTop) {
        setActiveCategory('desserts');
      } else if (hotSection && scrollPosition >= hotSection.offsetTop) {
        setActiveCategory('hot');
      } else if (sushiSection && scrollPosition >= sushiSection.offsetTop) {
        setActiveCategory('sushi');
      } else if (rollsClassicSection && scrollPosition >= rollsClassicSection.offsetTop) {
        setActiveCategory('rolls');
        setActiveSubcategory('classic');
      } else if (rollsWarmSection && scrollPosition >= rollsWarmSection.offsetTop) {
        setActiveCategory('rolls');
        setActiveSubcategory('warm');
      } else if (rollsBakedSection && scrollPosition >= rollsBakedSection.offsetTop) {
        setActiveCategory('rolls');
        setActiveSubcategory('baked');
      } else if (setsSection && scrollPosition >= setsSection.offsetTop) {
        setActiveCategory('sets');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isRestaurantOpen]);

  // Cart Handlers
  const handleAddToCart = (product: MenuItem) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        return prevCart.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === productId);
      if (existingIndex > -1) {
        const item = prevCart[existingIndex];
        if (item.quantity > 1) {
          return prevCart.map((item, index) =>
            index === existingIndex
              ? { ...item, quantity: item.quantity - 1 }
              : item
          );
        } else {
          return prevCart.filter((item) => item.product.id !== productId);
        }
      }
      return prevCart;
    });
  };

  const handleClearItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const getItemQuantity = (productId: string) => {
    const item = cart.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  // Helper function to get products from menuData by category and subcategory
  const getProductsByCategory = (categorySlug: string, subcategorySlug?: string): MenuItem[] => {
    if (!menuData || menuData.length === 0) return [];
    
    const category = menuData.find(cat => cat.slug === categorySlug);
    if (!category) return [];

    if (categorySlug === 'rolls' && subcategorySlug) {
      const subcat = category.subcategories?.find(sub => sub.slug === subcategorySlug);
      return subcat?.products || [];
    }

    return category.products || [];
  };

  // Helper function to find a product by ID across all categories
  const findProductById = (productId: string): MenuItem | undefined => {
    for (const category of menuData) {
      const found = category.products?.find(p => p.id === productId);
      if (found) return found;

      if (category.subcategories) {
        for (const subcat of category.subcategories) {
          const found = subcat.products?.find(p => p.id === productId);
          if (found) return found;
        }
      }
    }
    return undefined;
  };

  const handleSelectNavCategory = (category: any, subcategory?: any) => {
    setActiveCategory(category);
    if (subcategory) {
      setActiveSubcategory(subcategory);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-rose-500 selection:text-white pb-32">
      
      {/* HEADER SECTION */}
      <Header
        cart={cart}
        onOpenCart={() => setIsCartOpen(true)}
        user={user ? { username: user.username } : null}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* CATEGORIES NAV */}
      <CategoryNav
        activeCategory={activeCategory}
        activeSubcategory={activeSubcategory}
        onSelectCategory={handleSelectNavCategory}
      />

      {/* DETAILED HERO BLOCK */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/80 py-12 px-4 shadow-sm">
        {/* Decorative ambient background lights */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 z-10 relative">
          
          {/* Main banner callout */}
          <div className="max-w-2xl text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 border border-rose-100 rounded-full text-xs font-semibold text-[#E11D48] mb-4 select-none uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 fill-[#E11D48]" />
              Премиальная доставка в Токио
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-4 text-slate-900">
              Вкус, отточенный <br className="hidden md:inline" />
              до <span className="text-[#E11D48]">абсолютного совершенства</span>
            </h1>
            
            <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-lg mb-6">
              Команда шефов TOKYO ROLLS использует исключительно охлажденный лосось утреннего улова, настоящий камчатский краб и творожный сыр Cremette высокой жирности.
            </p>

            {/* Benefit badges inline row */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-medium text-slate-600 select-none">
              
              {/* Dynamic Opening Hours Status Badge */}
              {isOpen ? (
                <div 
                  className="flex items-center gap-2.5 bg-emerald-50/90 border border-emerald-200/80 px-4 py-2 rounded-xl shadow-xs"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-emerald-800 font-bold text-xs leading-none">● Открыто. Принимаем заказы</span>
                    <span className="text-[9.5px] text-emerald-650 mt-0.5 font-light">С 11:00 до 23:00</span>
                  </div>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-2.5 bg-orange-50 bg-opacity-80 border border-orange-200 px-4 py-2 rounded-xl shadow-xs"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0" />
                  <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-orange-900 font-bold text-xs leading-none">○ Сейчас закрыто</span>
                    <span className="text-[9.5px] text-orange-650 mt-0.5 font-light">Откроемся в 11:00</span>
                  </div>
                </div>
              )}

              {/* Delivery Conditions Badge */}
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl shadow-xs text-left max-w-xs">
                <MapPin className="w-4 h-4 text-[#E11D48] shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-slate-800 leading-none">Бесплатно от 700 ₽</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-medium leading-tight">Окраины Перми: от 100 ₽</span>
                </div>
              </div>

              {/* Delivery Time Badge */}
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl shadow-xs text-left">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-slate-800 leading-none">45-60 минут</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-medium">В зависимости от дорог</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Banner promo illustration */}
          <div className="w-full max-w-sm md:max-w-md aspect-video relative group overflow-hidden rounded-3xl border border-slate-200 shadow-xl shrink-0 select-none">
            <img
              src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80"
              alt="Promo Banner"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
              referrerPolicy="no-referrer"
            />
            {/* Promo text overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent flex flex-col justify-end p-5 md:p-6 text-left">
              <span className="text-[10px] text-[#E11D48] bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider mb-2 self-start backdrop-blur-xs">
                🎁 Промокод новому гостю
              </span>
              <h4 className="text-white font-black text-xl md:text-2xl leading-none tracking-tight font-sans">
                Скидка 10%
              </h4>
              <p className="text-zinc-300 text-[11px] md:text-xs mt-1 leading-snug font-medium max-w-[260px] md:max-w-[320px]">
                на первый заказ при оформлении в корзине
              </p>
              
              {/* Sleek Coupon code rendering box */}
              <div className="mt-3.5 flex items-center gap-2">
                <span className="font-mono text-white bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl font-bold text-xs tracking-widest uppercase shadow-xs leading-none">
                  TOKYO10
                </span>
                <span className="text-[9.5px] text-zinc-400 font-medium">Действует на всю корзину</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* DISHES LIST BLOCK */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        
        {/* СЕТЫ SECTION */}
        <section id="category-sets" className="mb-14 scroll-mt-40">
          <div className="flex items-baseline gap-3 mb-6 border-b border-slate-100 pb-3">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase font-sans">
              Сеты
            </h2>
            <span className="text-slate-400 font-mono text-xs select-none">ЛУЧШИЙ ВЫБОР ДЛЯ КОМПАНИИ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getProductsByCategory('sets').map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cartQuantity={getItemQuantity(product.id)}
                onAddToCart={() => handleAddToCart(product)}
                onRemoveFromCart={() => handleRemoveFromCart(product.id)}
                onClickCard={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        </section>

        {/* РОЛЛЫ SECTION GROUP */}
        <section id="category-rolls" className="scroll-mt-40">
          <div className="flex items-baseline gap-3 mb-2 border-b border-slate-100 pb-3">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase font-sans">
              Роллы
            </h2>
            <span className="text-slate-400 font-mono text-xs select-none">АВТОРСКИЕ РЕЦЕПТЫ ШЕФА</span>
          </div>

          {/* Subcategory 1: Baked */}
          <div id="category-rolls-baked" className="scroll-mt-48 pt-6 mb-10">
            <h3 className="text-lg md:text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2 mb-4">
              <span className="inline-block w-2.5 h-2.5 bg-[#E11D48] rounded-full" />
              Запеченные роллы
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getProductsByCategory('rolls', 'baked').map((product) => (
                <ProductCard
                   key={product.id}
                   product={product}
                   cartQuantity={getItemQuantity(product.id)}
                   onAddToCart={() => handleAddToCart(product)}
                   onRemoveFromCart={() => handleRemoveFromCart(product.id)}
                   onClickCard={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          </div>

          {/* Subcategory 2: Warm */}
          <div id="category-rolls-warm" className="scroll-mt-48 pt-6 mb-10">
            <h3 className="text-lg md:text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2 mb-4">
              <span className="inline-block w-2.5 h-2.5 bg-[#E11D48] rounded-full" />
              Теплые и темпура роллы
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getProductsByCategory('rolls', 'warm').map((product) => (
                <ProductCard
                   key={product.id}
                   product={product}
                   cartQuantity={getItemQuantity(product.id)}
                   onAddToCart={() => handleAddToCart(product)}
                   onRemoveFromCart={() => handleRemoveFromCart(product.id)}
                   onClickCard={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          </div>

          {/* Subcategory 3: Classic */}
          <div id="category-rolls-classic" className="scroll-mt-48 pt-6">
            <h3 className="text-lg md:text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2 mb-4">
              <span className="inline-block w-2.5 h-2.5 bg-[#E11D48] rounded-full" />
              Классические роллы
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getProductsByCategory('rolls', 'classic').map((product) => (
                <ProductCard
                   key={product.id}
                   product={product}
                   cartQuantity={getItemQuantity(product.id)}
                   onAddToCart={() => handleAddToCart(product)}
                   onRemoveFromCart={() => handleRemoveFromCart(product.id)}
                   onClickCard={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          </div>

        </section>

        {/* СУШИ SECTION */}
        <section id="category-sushi" className="mb-14 scroll-mt-40 pt-10">
          <div className="flex items-baseline gap-3 mb-6 border-b border-slate-100 pb-3">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase font-sans">
              Суши и Гунканы
            </h2>
            <span className="text-slate-400 font-mono text-xs select-none">СВЕЖАЯ КЛАССИКА С ОХЛАЖДЕННОЙ РЫБОЙ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getProductsByCategory('sushi').map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cartQuantity={getItemQuantity(product.id)}
                onAddToCart={() => handleAddToCart(product)}
                onRemoveFromCart={() => handleRemoveFromCart(product.id)}
                onClickCard={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        </section>

        {/* ГОРЯЧЕЕ & САЛАТЫ SECTION */}
        <section id="category-hot" className="mb-14 scroll-mt-40 pt-10">
          <div className="flex items-baseline gap-3 mb-6 border-b border-slate-100 pb-3">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase font-sans">
              Горячее & Салаты
            </h2>
            <span className="text-slate-400 font-mono text-xs select-none">СЫТНЫЕ РЕШЕНИЯ И ХРУСТЯЩАЯ СВЕЖЕСТЬ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getProductsByCategory('hot').map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cartQuantity={getItemQuantity(product.id)}
                onAddToCart={() => handleAddToCart(product)}
                onRemoveFromCart={() => handleRemoveFromCart(product.id)}
                onClickCard={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        </section>

        {/* ДЕСЕРТЫ SECTION */}
        <section id="category-desserts" className="mb-14 scroll-mt-40 pt-10">
          <div className="flex items-baseline gap-3 mb-6 border-b border-slate-100 pb-3">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase font-sans">
              Десерты
            </h2>
            <span className="text-slate-400 font-mono text-xs select-none">ЛЕГКОЕ И СЛАДКОЕ ЗАВЕРШЕНИЕ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getProductsByCategory('desserts').map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cartQuantity={getItemQuantity(product.id)}
                onAddToCart={() => handleAddToCart(product)}
                onRemoveFromCart={() => handleRemoveFromCart(product.id)}
                onClickCard={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        </section>

        {/* НАПИТКИ SECTION */}
        <section id="category-drinks" className="mb-14 scroll-mt-40 pt-10">
          <div className="flex items-baseline gap-3 mb-6 border-b border-slate-100 pb-3">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase font-sans">
              Напитки
            </h2>
            <span className="text-slate-400 font-mono text-xs select-none">ОСВЕЖАЮЩИЕ ВКУСЫ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getProductsByCategory('drinks').map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cartQuantity={getItemQuantity(product.id)}
                onAddToCart={() => handleAddToCart(product)}
                onRemoveFromCart={() => handleRemoveFromCart(product.id)}
                onClickCard={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        </section>

        {/* СОУСЫ & ДОПОЛНИТЕЛЬНО SECTION */}
        <section id="category-sauces" className="mb-14 scroll-mt-40 pt-10">
          <div className="flex items-baseline gap-3 mb-6 border-b border-slate-100 pb-3">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase font-sans">
              Соусы & Дополнительно
            </h2>
            <span className="text-slate-400 font-mono text-xs select-none">ИДЕАЛЬНЫЙ ШТРИХ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getProductsByCategory('sauces').map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                cartQuantity={getItemQuantity(product.id)}
                onAddToCart={() => handleAddToCart(product)}
                onRemoveFromCart={() => handleRemoveFromCart(product.id)}
                onClickCard={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        </section>

      </main>

      {/* FLOATING ACTION BOTTOM CART BUTTON (Mainly for outstanding mobile experiences) */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-4 right-4 z-40 sm:hidden animate-scaleUp">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-3 bg-slate-950 border border-slate-800 text-white rounded-full shadow-2xl h-13 px-4 hover:bg-slate-900 active:scale-95 transition-all cursor-pointer font-bold select-none text-sm"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-[#E11D48] stroke-[2.2]" />
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-slate-950">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <span className="font-mono text-sm tracking-tight leading-none pt-0.5">
              {cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0).toLocaleString('ru-RU')} ₽
            </span>
          </button>
        </div>
      )}

      {/* SLIDING BASKET DRAWER (ШТОРКА КОРЗИНЫ) */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        isOpenStatus={isOpen}
        onAddToCart={(id) => {
          const prod = findProductById(id);
          if (prod) handleAddToCart(prod);
        }}
        onRemoveFromCart={handleRemoveFromCart}
        onClearItem={handleClearItem}
      />

      {/* PRODUCT BROWSER DETAIL MODAL (МОДАЛКА ТОВАРА) */}
      <ProductModal
        isOpen={selectedProduct !== null}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        cartQuantity={selectedProduct ? getItemQuantity(selectedProduct.id) : 0}
        onAddToCart={() => selectedProduct && handleAddToCart(selectedProduct)}
        onRemoveFromCart={() => selectedProduct && handleRemoveFromCart(selectedProduct.id)}
      />

      {/* AUTH MODAL (ВХОД / РЕГИСТРАЦИЯ) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

    </div>
  );
}
