import { MenuItem } from '../types';
import { MenuData } from '../api';
import ProductCard from './ProductCard';

interface MenuSectionsProps {
  menuData: MenuData[];
  getProductsByCategory: (categorySlug: string, subcategorySlug?: string) => MenuItem[];
  getQuantity: (productId: string) => number;
  onAddToCart: (product: MenuItem) => void;
  onRemoveFromCart: (productId: string) => void;
  onClickCard: (product: MenuItem) => void;
}

const SECTION_CONFIG: Record<string, { title: string; subtitle: string }> = {
  sets: { title: 'Сеты', subtitle: 'ЛУЧШИЙ ВЫБОР ДЛЯ КОМПАНИИ' },
  rolls: { title: 'Роллы', subtitle: 'АВТОРСКИЕ РЕЦЕПТЫ ШЕФА' },
  sushi: { title: 'Суши и Гунканы', subtitle: 'СВЕЖАЯ КЛАССИКА С ОХЛАЖДЕННОЙ РЫБОЙ' },
  pokesalads: { title: 'Поке & Салаты', subtitle: 'СВЕЖЕСТЬ В КАЖДОМ КУСОЧКЕ' },
  hot: { title: 'Горячее & Салаты', subtitle: 'СЫТНЫЕ РЕШЕНИЯ И ХРУСТЯЩАЯ СВЕЖЕСТЬ' },
  desserts: { title: 'Десерты', subtitle: 'ЛЕГКОЕ И СЛАДКОЕ ЗАВЕРШЕНИЕ' },
  dop: { title: 'Дополнительно', subtitle: 'НАПИТКИ, СОУСЫ И ПРОЧЕЕ' },
};

const ROLLS_SECTION_IDS: Record<string, string> = {
  firm: 'category-rolls-firm',
  baked: 'category-rolls-baked',
  free: 'category-rolls-free',
  warm: 'category-rolls-warm',
  classic: 'category-rolls-classic',
};

const ROLLS_SUBCATEGORIES: { slug: string; title: string }[] = [
  { slug: 'firm', title: 'Большие роллы' },
  { slug: 'baked', title: 'Запеченные роллы' },
  { slug: 'free', title: 'Фри роллы' },
  { slug: 'warm', title: 'Теплые и темпура роллы' },
  { slug: 'classic', title: 'Классические роллы' },
];

export default function MenuSections({
  menuData,
  getProductsByCategory,
  getQuantity,
  onAddToCart,
  onRemoveFromCart,
  onClickCard,
}: MenuSectionsProps) {
  const order = ['sets', 'rolls', 'sushi', 'pokesalads', 'hot', 'desserts', 'dop'];

  return (
    <>
      {order.map((slug) => {
        const config = SECTION_CONFIG[slug];
        if (!config) return null;

        const isRolls = slug === 'rolls';

        return (
          <section key={slug} id={`category-${slug}`} className={`${slug === 'sets' ? 'mb-14' : 'mb-14 pt-10'} scroll-mt-40`}>
            <div className="flex items-baseline gap-3 mb-6 border-b border-slate-100 pb-3">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 uppercase font-sans">
                {config.title}
              </h2>
              <span className="text-slate-500 font-mono text-sm select-none">{config.subtitle}</span>
            </div>

            {isRolls ? (
              <>
                {ROLLS_SUBCATEGORIES.map((sub) => (
                  <div key={sub.slug} id={ROLLS_SECTION_IDS[sub.slug]} className="scroll-mt-48 pt-6 mb-10">
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2 mb-5">
                      <span className="inline-block w-2.5 h-2.5 bg-[#E11D48] rounded-full" />
                      {sub.title}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {getProductsByCategory('rolls', sub.slug).map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          cartQuantity={getQuantity(product.id)}
                          onAddToCart={() => onAddToCart(product)}
                          onRemoveFromCart={() => onRemoveFromCart(product.id)}
                          onClickCard={() => onClickCard(product)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {getProductsByCategory(slug).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    cartQuantity={getQuantity(product.id)}
                    onAddToCart={() => onAddToCart(product)}
                    onRemoveFromCart={() => onRemoveFromCart(product.id)}
                    onClickCard={() => onClickCard(product)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
