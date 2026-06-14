"""
Скрипт для заполнения базы данных образцами товаров и сетов.
"""
import os
import sys
import urllib.request
import uuid
from io import BytesIO

import django
from django.core.files.images import ImageFile

# Добавить путь к проекту
sys.path.insert(0, os.path.dirname(__file__))

# Установить Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import (
    Allergen, Category, Ingredient, Order, OrderItem, Product, ProductIngredient,
    Set, SetIngredient, SetItem, SubCategory,
)


def download_image(url):
    """Скачать изображение по URL и вернуть как ImageFile (или None при ошибке)."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        name = f'{uuid.uuid4().hex[:12]}.jpg'
        return ImageFile(BytesIO(data), name=name)
    except Exception as e:
        print(f'  ⚠️  Не удалось скачать {url}: {e}')
        return None


# ── Очистить существующие данные ──
# Порядок важен — сначала зависимые, потом родительские
SetItem.objects.all().delete()
SetIngredient.objects.all().delete()
ProductIngredient.objects.all().delete()
OrderItem.objects.all().delete()
Order.objects.all().delete()
Set.objects.all().delete()
Product.objects.all().delete()
SubCategory.objects.all().delete()
Category.objects.all().delete()

# ── Категории ──
categories_data = [
    {'slug': 'sets', 'name': 'Сеты', 'subtitle': 'ЛУЧШИЙ ВЫБОР ДЛЯ КОМПАНИИ', 'sort_order': 1},
    {'slug': 'rolls', 'name': 'Роллы', 'subtitle': 'АВТОРСКИЕ РЕЦЕПТЫ ШЕФА', 'sort_order': 2},
    {'slug': 'sushi', 'name': 'Суши и Гунканы', 'subtitle': 'СВЕЖАЯ КЛАССИКА С ОХЛАЖДЕННОЙ РЫБОЙ', 'sort_order': 3},
    {'slug': 'hot', 'name': 'Горячее & Салаты', 'subtitle': 'ЭКЗОТИЧЕСКИЕ БЛЮДА', 'sort_order': 4},
    {'slug': 'desserts', 'name': 'Десерты', 'subtitle': 'СЛАДКИЕ ЗАВЕРШЕНИЯ', 'sort_order': 5},
    {'slug': 'drinks', 'name': 'Напитки', 'subtitle': 'АВТОРСКИЕ КОМБИНАЦИИ', 'sort_order': 6},
    {'slug': 'sauces', 'name': 'Соусы', 'subtitle': 'ДЛЯ ВКУСА', 'sort_order': 7},
]

categories = {}
for cat_data in categories_data:
    cat = Category.objects.create(**cat_data)
    categories[cat.slug] = cat
    print(f'✅ Категория: {cat.name}')

# ── Подкатегории роллов ──
subcategories_data = [
    {'slug': 'baked', 'name': 'Запеченные роллы', 'sort_order': 1},
    {'slug': 'warm', 'name': 'Теплые и темпура роллы', 'sort_order': 2},
    {'slug': 'classic', 'name': 'Классические роллы', 'sort_order': 3},
]

subcategories = {}
for subcat_data in subcategories_data:
    subcat = SubCategory.objects.create(category=categories['rolls'], **subcat_data)
    subcategories[subcat.slug] = subcat
    print(f'✅ Подкатегория: {subcat.name}')

# ── Ингредиенты ──
ingredients_data = [
    'Лосось', 'Тунец', 'Креветка', 'Угорь', 'Краб',
    'Сливочный сыр', 'Авокадо', 'Огурец', 'Рис', 'Нори',
    'Икра тобико', 'Соевый соус', 'Кунжут', 'Кляр', 'Васаби',
    'Сакэ', 'Грибы шиитаке', 'Майонез', 'Лимон',
]

ingredients = {}
for name in ingredients_data:
    slug = name.lower().replace(' ', '-')
    ing, _ = Ingredient.objects.get_or_create(slug=slug, defaults={'name': name})
    ingredients[name] = ing
print(f'✅ Ингредиентов: {len(ingredients)}')

# ── Аллергены ──
allergens_data = [
    'Рыба', 'Моллюски/Ракообразные', 'Кунжут', 'Соя', 'Глютен',
    'Молочные продукты', 'Яичные продукты', 'Острое',
]

allergens = {}
for name in allergens_data:
    slug = name.lower().replace(' ', '-').replace('/', '-')
    a, _ = Allergen.objects.get_or_create(slug=slug, defaults={'name': name})
    allergens[name] = a
print(f'✅ Аллергенов: {len(allergens)}')


def get_ingredient(name):
    ing = ingredients.get(name)
    if not ing:
        slug = name.lower().replace(' ', '-')
        ing, _ = Ingredient.objects.get_or_create(slug=slug, defaults={'name': name})
        ingredients[name] = ing
    return ing


def get_allergen(name):
    a = allergens.get(name)
    if not a:
        slug = name.lower().replace(' ', '-').replace('/', '-')
        a, _ = Allergen.objects.get_or_create(slug=slug, defaults={'name': name})
        allergens[name] = a
    return a


# ═════════════════════════════════════════
#  СЕТЫ (модель Set)
# ═════════════════════════════════════════

sets_data = [
    {
        'slug': 'set-philadelphia-mania',
        'name': 'Сет Филадельфия Мания 👑',
        'description': 'Настоящее торжество нежной слабосоленой рыбы и кремового сыра. Четыре изысканных вариации легендарного ролла Филадельфия в одном наборе.',
        'price': 1890,
        'weight': 980,
        'pieces_amount': 32,
        'image_url': 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
        'composition': ['Лосось', 'Сливочный сыр', 'Огурец', 'Рис', 'Нори', 'Авокадо'],
        'allergens': ['Рыба', 'Молочные продукты'],
        'benefit_badge': '20% выгода',
        'is_new': True,
        'included': [
            {'product_slug': 'roll-philadelphia-baked', 'quantity': 1},
            {'product_slug': 'roll-california-baked', 'quantity': 1},
            {'product_slug': 'roll-alaska', 'quantity': 1},
            {'product_slug': 'roll-tokyo', 'quantity': 1},
        ],
    },
    {
        'slug': 'set-mix-vkusa-ostryj',
        'name': 'Сет Микс Вкуса острый 🌶️',
        'description': 'Огненный и сочный сет для большой компании. Включает запеченные, острые спайси-роллы и хрустящие темпурные шедевры.',
        'price': 2450,
        'weight': 1240,
        'pieces_amount': 48,
        'image_url': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
        'composition': ['Краб', 'Лосось', 'Угорь', 'Кунжут', 'Рис', 'Нори'],
        'allergens': ['Рыба', 'Моллюски/Ракообразные', 'Кунжут', 'Соя', 'Глютен'],
        'benefit_badge': '15% выгода',
        'included': [
            {'product_slug': 'roll-philadelphia-baked', 'quantity': 2},
            {'product_slug': 'roll-california-baked', 'quantity': 2},
            {'product_slug': 'sushi-salmon-nigiri', 'quantity': 2},
            {'product_slug': 'sushi-tuna-nigiri', 'quantity': 2},
        ],
    },
    {
        'slug': 'set-sakura-fest',
        'name': 'Сет Сакура Фест 🌸',
        'description': 'Легкий весенний набор, сочетающий изысканный лосось, нежного тунца и авокадо. Сбалансированный вкус.',
        'price': 1590,
        'weight': 850,
        'pieces_amount': 24,
        'image_url': 'https://images.unsplash.com/photo-1563612116625-3012372fccbc?auto=format&fit=crop&w=800&q=80',
        'composition': ['Лосось', 'Тунец', 'Авокадо', 'Сливочный сыр', 'Рис', 'Нори'],
        'allergens': ['Рыба', 'Молочные продукты', 'Соя'],
        'benefit_badge': '10% выгода',
        'is_new': True,
        'included': [
            {'product_slug': 'sushi-salmon-nigiri', 'quantity': 2},
            {'product_slug': 'sushi-tuna-nigiri', 'quantity': 2},
            {'product_slug': 'roll-alaska', 'quantity': 1},
            {'product_slug': 'roll-tokyo', 'quantity': 1},
        ],
    },
]

saved_sets = {}
for sdata in sets_data:
    composition = sdata.pop('composition')
    allgs = sdata.pop('allergens')
    included = sdata.pop('included')
    image_url = sdata.pop('image_url')

    image_file = download_image(image_url)
    menu_set = Set.objects.create(
        image=image_file,
        **sdata,
    )
    saved_sets[sdata['slug']] = menu_set

    for i, ing_name in enumerate(composition):
        SetIngredient.objects.create(
            set_menu=menu_set, ingredient=get_ingredient(ing_name), sort_order=i,
        )
    for a_name in allgs:
        menu_set.allergens.add(get_allergen(a_name))

    print(f'✅ Сет: {menu_set.name}  ({menu_set.price} ₽)  image={"OK" if image_file else "—"}')


# ═════════════════════════════════════════
#  ПРОДУКТЫ (модель Product)
# ═════════════════════════════════════════

products_data = [
    # РОЛЛЫ – ЗАПЕЧЕННЫЕ
    {
        'category': 'rolls', 'subcategory': 'baked',
        'slug': 'roll-philadelphia-baked',
        'name': 'Филадельфия запеченная',
        'description': 'Лосось, сливочный сыр, авокадо, рис сверху.',
        'price': 380, 'weight': 250, 'pieces_amount': 8,
        'image_url': 'https://images.unsplash.com/photo-1553621042-f6de2442b650?auto=format&fit=crop&w=800&q=80',
        'composition': ['Лосось', 'Сливочный сыр', 'Авокадо', 'Рис', 'Нори'],
        'allergens': ['Рыба', 'Молочные продукты'],
    },
    {
        'category': 'rolls', 'subcategory': 'baked',
        'slug': 'roll-california-baked',
        'name': 'Калифорния запеченная',
        'description': 'Краб, авокадо, огурец, запеченная сверху.',
        'price': 350, 'weight': 230, 'pieces_amount': 8,
        'image_url': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80',
        'composition': ['Краб', 'Авокадо', 'Огурец', 'Рис', 'Нори'],
        'allergens': ['Моллюски/Ракообразные'],
    },
    # РОЛЛЫ – КЛАССИЧЕСКИЕ
    {
        'category': 'rolls', 'subcategory': 'classic',
        'slug': 'roll-alaska',
        'name': 'Аляска',
        'description': 'Лосось, авокадо, классический вкус.',
        'price': 320, 'weight': 210, 'pieces_amount': 8,
        'image_url': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80',
        'composition': ['Лосось', 'Авокадо', 'Рис', 'Нори'],
        'allergens': ['Рыба'],
    },
    {
        'category': 'rolls', 'subcategory': 'classic',
        'slug': 'roll-tokyo',
        'name': 'Токио',
        'description': 'Тунец, авокадо, икра летучей рыбы.',
        'price': 360, 'weight': 220, 'pieces_amount': 8,
        'image_url': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80',
        'composition': ['Тунец', 'Авокадо', 'Икра тобико', 'Рис', 'Нори'],
        'allergens': ['Рыба'],
        'is_new': True,
    },
    # СУШИ
    {
        'category': 'sushi',
        'slug': 'sushi-salmon-nigiri',
        'name': 'Нигири с лососем (2 шт)',
        'description': 'Свежий охлажденный лосось на рисе.',
        'price': 180, 'weight': 80, 'pieces_amount': 2,
        'image_url': 'https://images.unsplash.com/photo-1563612116625-3012372fccbc?auto=format&fit=crop&w=800&q=80',
        'composition': ['Лосось', 'Рис'],
        'allergens': ['Рыба'],
    },
    {
        'category': 'sushi',
        'slug': 'sushi-tuna-nigiri',
        'name': 'Нигири с тунцом (2 шт)',
        'description': 'Тунец высокого качества на рисе.',
        'price': 200, 'weight': 80, 'pieces_amount': 2,
        'image_url': 'https://images.unsplash.com/photo-1563612116625-3012372fccbc?auto=format&fit=crop&w=800&q=80',
        'composition': ['Тунец', 'Рис'],
        'allergens': ['Рыба'],
    },
    # ГОРЯЧЕЕ
    {
        'category': 'hot',
        'slug': 'tempura-shrimp',
        'name': 'Темпура креветка',
        'description': 'Хрустящая закуска из свежих креветок.',
        'price': 280, 'weight': 150, 'pieces_amount': 6,
        'image_url': 'https://images.unsplash.com/photo-1582061356519-bb39a077f1f0?auto=format&fit=crop&w=800&q=80',
        'composition': ['Креветка', 'Кляр', 'Лимон'],
        'allergens': ['Моллюски/Ракообразные'],
    },
    # НАПИТКИ
    {
        'category': 'drinks',
        'slug': 'sake-cup',
        'name': 'Чашка Сакэ',
        'description': 'Традиционный японский алкогольный напиток.',
        'price': 150, 'weight': 150, 'pieces_amount': 1,
        'image_url': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80',
        'composition': ['Сакэ'],
        'allergens': [],
    },
    # СОУСЫ
    {
        'category': 'sauces',
        'slug': 'sauce-wasabi',
        'name': 'Васаби (50g)',
        'description': 'Острая японская приправа.',
        'price': 50, 'weight': 50, 'pieces_amount': 1,
        'image_url': 'https://images.unsplash.com/photo-1599599810694-2d0ac4147a84?auto=format&fit=crop&w=800&q=80',
        'composition': ['Васаби'],
        'allergens': [],
    },
]

saved_products = {}
for pdata in products_data:
    category_slug = pdata.pop('category')
    subcategory_slug = pdata.pop('subcategory', None)
    composition = pdata.pop('composition')
    allgs = pdata.pop('allergens')
    image_url = pdata.pop('image_url')

    image_file = download_image(image_url)
    product = Product.objects.create(
        category=categories[category_slug],
        subcategory=subcategories.get(subcategory_slug) if subcategory_slug else None,
        image=image_file,
        **pdata,
    )
    saved_products[pdata['slug']] = product

    for i, ing_name in enumerate(composition):
        ProductIngredient.objects.create(
            product=product, ingredient=get_ingredient(ing_name), sort_order=i,
        )
    for a_name in allgs:
        product.allergens.add(get_allergen(a_name))

    print(f'✅ Продукт: {product.name}  ({product.price} ₽)  image={"OK" if image_file else "—"}')


# ═════════════════════════════════════════
#  ПРИВЯЗКА SetItem (ссылки на продукты из сетов)
# ═════════════════════════════════════════

# Сохраняем included до .pop() в первом цикле — используем структуру sets_data
set_items_map = {
    'set-philadelphia-mania': [
        {'product_slug': 'roll-philadelphia-baked', 'quantity': 1},
        {'product_slug': 'roll-california-baked', 'quantity': 1},
        {'product_slug': 'roll-alaska', 'quantity': 1},
        {'product_slug': 'roll-tokyo', 'quantity': 1},
    ],
    'set-mix-vkusa-ostryj': [
        {'product_slug': 'roll-philadelphia-baked', 'quantity': 2},
        {'product_slug': 'roll-california-baked', 'quantity': 2},
        {'product_slug': 'sushi-salmon-nigiri', 'quantity': 2},
        {'product_slug': 'sushi-tuna-nigiri', 'quantity': 2},
    ],
    'set-sakura-fest': [
        {'product_slug': 'sushi-salmon-nigiri', 'quantity': 2},
        {'product_slug': 'sushi-tuna-nigiri', 'quantity': 2},
        {'product_slug': 'roll-alaska', 'quantity': 1},
        {'product_slug': 'roll-tokyo', 'quantity': 1},
    ],
}

for set_slug, included_items in set_items_map.items():
    menu_set = saved_sets.get(set_slug)
    if not menu_set:
        continue
    for inc in included_items:
        prod = saved_products.get(inc['product_slug'])
        if prod:
            SetItem.objects.create(
                set_menu=menu_set,
                included_product=prod,
                quantity=inc['quantity'],
            )
            print(f'  ↳ {menu_set.name} ← {prod.name} × {inc["quantity"]}')
        else:
            print(f'  ⚠️  Продукт {inc["product_slug"]} не найден для сета {menu_set.name}')


print('\n🎉 Все данные успешно добавлены!')
