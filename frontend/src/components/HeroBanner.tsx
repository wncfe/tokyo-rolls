import { Sparkles, Clock, MapPin } from 'lucide-react';
import { RestaurantSettings } from '../types';

interface HeroBannerProps {
  isOpen: boolean;
  settings: RestaurantSettings;
}

export default function HeroBanner({ isOpen, settings }: HeroBannerProps) {
  return (
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
              <div className="flex items-center gap-2.5 bg-emerald-50/90 border border-emerald-200/80 px-4 py-2 rounded-xl shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-emerald-800 font-bold text-xs leading-none">● Открыто. Принимаем заказы</span>
                  <span className="text-[9.5px] text-emerald-650 mt-0.5 font-light">С {settings.opening_hour}:00 до {settings.closing_hour}:00</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 bg-orange-50 bg-opacity-80 border border-orange-200 px-4 py-2 rounded-xl shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0" />
                <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-orange-900 font-bold text-xs leading-none">○ Сейчас закрыто</span>
                  <span className="text-[9.5px] text-orange-650 mt-0.5 font-light">Откроемся в {settings.opening_hour}:00</span>
                </div>
              </div>
            )}

            {/* Delivery Conditions Badge */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl shadow-xs text-left max-w-xs">
              <MapPin className="w-4 h-4 text-[#E11D48] shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold text-xs text-slate-800 leading-none">Бесплатно от {settings.free_delivery_from} ₽</span>
                <span className="text-[10px] text-slate-400 mt-0.5 font-medium leading-tight">Окраины Перми: от {settings.suburban_delivery_fee} ₽</span>
              </div>
            </div>

            {/* Delivery Time Badge */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl shadow-xs text-left">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold text-xs text-slate-800 leading-none">{settings.delivery_time_min}-{settings.delivery_time_max} минут</span>
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
  );
}
