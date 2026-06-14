"""
Скрипт для заполнения базы данных образцами товаров и сетов.
Данные основаны на реальном меню tokyorolls.ru
"""
import os
import sys
import urllib.request
import uuid
from io import BytesIO

import django
from django.core.files.images import ImageFile

sys.path.insert(0, os.path.dirname(__file__))
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
SetItem.objects.all().delete()
SetIngredient.objects.all().delete()
ProductIngredient.objects.all().delete()
OrderItem.objects.all().delete()
Order.objects.all().delete()
Set.objects.all().delete()
Product.objects.all().delete()
SubCategory.objects.all().delete()
Category.objects.all().delete()

# ═════════════════════════════════════════
#  КАТЕГОРИИ
# ═════════════════════════════════════════
categories_data = [
    {'slug': 'sets', 'name': 'Сеты', 'subtitle': 'ЛУЧШИЙ ВЫБОР ДЛЯ КОМПАНИИ', 'sort_order': 1},
    {'slug': 'rolls', 'name': 'Роллы', 'subtitle': 'АВТОРСКИЕ РЕЦЕПТЫ ШЕФА', 'sort_order': 2},
    {'slug': 'sushi', 'name': 'Суши и Гунканы', 'subtitle': 'СВЕЖАЯ КЛАССИКА С ОХЛАЖДЕННОЙ РЫБОЙ', 'sort_order': 3},
    {'slug': 'pokesalads', 'name': 'Поке & Салаты', 'subtitle': 'СВЕЖЕСТЬ В КАЖДОМ КУСОЧКЕ', 'sort_order': 4},
    {'slug': 'hot', 'name': 'Горячее', 'subtitle': 'СЫТНЫЕ РЕШЕНИЯ И ХРУСТЯЩАЯ СВЕЖЕСТЬ', 'sort_order': 5},
    {'slug': 'desserts', 'name': 'Десерты', 'subtitle': 'СЛАДКИЕ ЗАВЕРШЕНИЯ', 'sort_order': 6},
    {'slug': 'dop', 'name': 'Дополнительно', 'subtitle': 'НАПИТКИ, СОУСЫ И ПРОЧЕЕ', 'sort_order': 7},
]

categories = {}
for cat_data in categories_data:
    cat = Category.objects.create(**cat_data)
    categories[cat.slug] = cat
    print(f'✅ Категория: {cat.name}')

# ═════════════════════════════════════════
#  ПОДКАТЕГОРИИ РОЛЛОВ
# ═════════════════════════════════════════
subcategories_data = [
    {'slug': 'firm', 'name': 'Большие роллы', 'sort_order': 1},
    {'slug': 'baked', 'name': 'Запеченные роллы', 'sort_order': 2},
    {'slug': 'free', 'name': 'Фри роллы', 'sort_order': 3},
    {'slug': 'warm', 'name': 'Теплые и темпура роллы', 'sort_order': 4},
    {'slug': 'classic', 'name': 'Классические роллы', 'sort_order': 5},
]

subcategories = {}
for subcat_data in subcategories_data:
    subcat = SubCategory.objects.create(category=categories['rolls'], **subcat_data)
    subcategories[subcat.slug] = subcat
    print(f'✅ Подкатегория: {subcat.name}')

# ═════════════════════════════════════════
#  ИНГРЕДИЕНТЫ
# ═════════════════════════════════════════
ingredients_data = [
    'Лосось', 'Тунец', 'Креветка', 'Угорь', 'Снежный краб', 'Гребешок',
    'Сливочный сыр', 'Авокадо', 'Огурец', 'Рис', 'Нори',
    'Икра тобико', 'Икра масаго', 'Соевый соус', 'Кунжут', 'Кляр',
    'Васаби', 'Сакэ', 'Майонез', 'Лимон', 'Копченая курица',
    'Бекон', 'Японский омлет', 'Салат', 'Томат', 'Болгарский перец',
    'Зеленый лук', 'Копченый лосось', 'Стружка тунца', 'Соус спайси',
    'Соус унаги', 'Соус терияки', 'Сухари', 'Сыр гауда', 'Соус цезарь',
    'Соус манго-чили', 'Соус ореховый', 'Бобы', 'Салат чука', 'Кальмар',
]

ingredients = {}
for name in ingredients_data:
    slug = name.lower().replace(' ', '-')
    ing, _ = Ingredient.objects.get_or_create(slug=slug, defaults={'name': name})
    ingredients[name] = ing
print(f'✅ Ингредиентов: {len(ingredients)}')

# ═════════════════════════════════════════
#  АЛЛЕРГЕНЫ
# ═════════════════════════════════════════
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


# ── Привязка аллергенов к ингредиентам ──
ingredient_allergen_map = {
    'Лосось': ['Рыба'], 'Тунец': ['Рыба'], 'Угорь': ['Рыба'],
    'Икра тобико': ['Рыба'], 'Икра масаго': ['Рыба'],
    'Креветка': ['Моллюски/Ракообразные'],
    'Снежный краб': ['Моллюски/Ракообразные'],
    'Гребешок': ['Моллюски/Ракообразные'],
    'Кальмар': ['Моллюски/Ракообразные'],
    'Сливочный сыр': ['Молочные продукты'],
    'Сыр гауда': ['Молочные продукты'],
    'Соевый соус': ['Соя'], 'Кунжут': ['Кунжут'],
    'Кляр': ['Глютен', 'Яичные продукты'],
    'Майонез': ['Яичные продукты'],
    'Васаби': ['Острое'], 'Соус спайси': ['Острое'],
    'Японский омлет': ['Яичные продукты'],
    'Сухари': ['Глютен'],
}

for ing_name, allergen_names in ingredient_allergen_map.items():
    ing = get_ingredient(ing_name)
    for a_name in allergen_names:
        ing.allergens.add(get_allergen(a_name))
    print(f'  🔗 {ing.name} → {allergen_names}')


# ═════════════════════════════════════════
#  ХЕЛПЕРЫ
# ═════════════════════════════════════════

def create_product(cat_slug, sub_slug, slug, name, desc, price, weight, pieces,
                   image_url, composition, is_new=False, benefit_badge=''):
    """Создать продукт с привязкой ингредиентов."""
    image_file = download_image(image_url)
    if image_file is None:
        print(f'  ⚠️  Пропущен {name} — не удалось скачать изображение')
        return None
    product = Product.objects.create(
        category=categories[cat_slug],
        subcategory=subcategories.get(sub_slug) if sub_slug else None,
        slug=slug, name=name, description=desc,
        price=price, weight=weight, pieces_amount=pieces,
        image=image_file, is_new=is_new, benefit_badge=benefit_badge,
    )
    for i, ing_name in enumerate(composition):
        ProductIngredient.objects.create(
            product=product, ingredient=get_ingredient(ing_name), sort_order=i)
    print(f'✅ {name}  ({price} ₽, {weight}г, {pieces}шт)')
    return product


def create_set(slug, name, desc, price, weight, pieces, image_url,
               composition, is_new=False, benefit_badge=''):
    """Создать сет с привязкой ингредиентов."""
    image_file = download_image(image_url)
    if image_file is None:
        print(f'  ⚠️  Пропущен сет {name} — не удалось скачать изображение')
        return None
    menu_set = Set.objects.create(
        slug=slug, name=name, description=desc,
        price=price, weight=weight, pieces_amount=pieces,
        image=image_file, is_new=is_new, benefit_badge=benefit_badge,
    )
    for i, ing_name in enumerate(composition):
        SetIngredient.objects.create(
            set_menu=menu_set, ingredient=get_ingredient(ing_name), sort_order=i)
    print(f'✅ Сет: {name}  ({price} ₽, {weight}г, {pieces}шт)')
    return menu_set


# ═════════════════════════════════════════
#  СЕТЫ (12 шт.)
# ═════════════════════════════════════════
print('\n── СЕТЫ ──')
saved_sets = {}

sets_data = [
    ('set-azia', 'Сет Азия 🌏',
     'Куба (8 шт.), Кудзи (8 шт.), Запеченный Гребешок Спайси (8 шт.), Запеченный Бонито со Снежным Крабом (8 шт.).',
     1860, 1000, 32,
     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
     ['Лосось', 'Снежный краб', 'Гребешок', 'Сливочный сыр', 'Рис', 'Нори', 'Авокадо'],
     True, '17% выгода'),
    ('set-4-polovinki', 'Сет 4 Половинки 🎯',
     'Филадельфия Лосось (4 шт.), Цезарь Запеченный (4 шт.), Хоккайдо (4 шт.), Марокко (4 шт.).',
     870, 500, 16,
     'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
     ['Лосось', 'Сливочный сыр', 'Копченая курица', 'Бекон', 'Рис', 'Нори', 'Огурец'],
     True, ''),
    ('set-romantik', 'Сет Романтик 💕',
     'Калифорния со Снежным крабом (8 шт.), Филадельфия Креветка (8 шт.), Ролл с Огурцом (6 шт.), Ролл с Японским Омлетом (6 шт.).',
     1310, 700, 28,
     'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
     ['Снежный краб', 'Креветка', 'Сливочный сыр', 'Огурец', 'Японский омлет', 'Рис', 'Нори'],
     False, '22% выгода'),
    ('set-5-polovinok', 'Сет 5 Половинок ✋',
     'Филадельфия Снежный Краб (4 шт.), Крабс Темпура (4 шт.), Монтана (4 шт.), Филадельфия Японский Омлет (4 шт.), Сафари (4 шт.).',
     970, 600, 20,
     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
     ['Снежный краб', 'Сливочный сыр', 'Японский омлет', 'Кляр', 'Рис', 'Нори'],
     True, ''),
    ('set-dlya-tebya', 'Сет Для Тебя 🎁',
     'Джерси (8 шт.), Сангай (8 шт.), Филадельфия Лосось (4 шт.).',
     1285, 650, 20,
     'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=800&q=80',
     ['Лосось', 'Сливочный сыр', 'Авокадо', 'Огурец', 'Рис', 'Нори'],
     False, '18% выгода'),
    ('set-bonito', 'Сет Бонито 🔥',
     'Филадельфия в Стружке Тунца (8 шт.), Запеченный Бонито с Лососем Терияки (8 шт.), Бонито с Креветкой (4 шт.), Бонито с Лососем (4 шт.).',
     1450, 750, 24,
     'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80',
     ['Тунец', 'Лосось', 'Креветка', 'Сливочный сыр', 'Стружка тунца', 'Рис', 'Нори'],
     False, '23% выгода'),
    ('set-okinawa', 'Сет Окинава 🏝️',
     'Горячий с Гребешком (8 шт.), Окинава (8 шт.), Блэк Ролл с Креветкой (8 шт.).',
     1565, 750, 24,
     'https://images.unsplash.com/photo-1540648639573-8c848de23f0a?auto=format&fit=crop&w=800&q=80',
     ['Гребешок', 'Креветка', 'Сливочный сыр', 'Копченая курица', 'Томат', 'Рис', 'Нори'],
     False, '17% выгода'),
    ('set-s-lososem', 'Сет с Лососем 🐟',
     'Суши с Лососем (2 шт.), Гункан с Лососем (2 шт.), Ролл с Лососем (6 шт.), Филадельфия с Лососем (8 шт.), Бонито с Лососем (8 шт.), Лосось Темпура (8 шт.), Горячий с Лососем (8 шт.).',
     3750, 1250, 42,
     'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=800&q=80',
     ['Лосось', 'Сливочный сыр', 'Авокадо', 'Рис', 'Нори', 'Кляр'],
     False, '5% выгода'),
    ('set-s-krevetkoy', 'Сет с Креветкой 🦐',
     'Суши с Креветкой (2 шт.), Гункан с Креветкой (2 шт.), Ролл с Креветкой (6 шт.), Филадельфия с Креветкой (8 шт.), Бонито с Креветкой (8 шт.), Креветка Темпура (8 шт.), Горячий с Креветкой (8 шт.).',
     2740, 1250, 42,
     'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=800&q=80',
     ['Креветка', 'Сливочный сыр', 'Авокадо', 'Рис', 'Нори', 'Кляр'],
     False, '18% выгода'),
    ('set-na-kompaniyu', 'Сет На Компанию 🎉',
     'Ролл со Снежным Крабом и Авокадо (6 шт.), Ролл с Лососем Терияки (6 шт.), Ролл с Копченой Курицей (6 шт.), Крабс Темпура (8 шт.), Бостон (8 шт.), Запеченный Чикен (8 шт.), Запеченный Спайси Краб (8 шт.), Филадельфия Японский Омлет (8 шт.), Бонито с Лососем (8 шт.).',
     2750, 1600, 66,
     'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
     ['Снежный краб', 'Лосось', 'Копченая курица', 'Кляр', 'Японский омлет', 'Сливочный сыр', 'Авокадо', 'Рис', 'Нори'],
     False, '13% выгода'),
    ('set-mega', 'Сет Мега 💪',
     'Бекон Темпура (8 шт.), Окинава (8 шт.), Цезарь Запеченный (8 шт.), Чикен Грин (8 шт.), Греческий (8 шт.), Филадельфия Лосось (4 шт.), Нежный Лосось (4 шт.), Ролл с Огурцом (6 шт.), Ролл с Японским Омлетом (6 шт.), Ролл с Филадельфией (6 шт.).',
     2350, 1700, 66,
     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
     ['Бекон', 'Копченая курица', 'Лосось', 'Сливочный сыр', 'Огурец', 'Японский омлет', 'Томат', 'Рис', 'Нори'],
     False, '27% выгода'),
    ('set-goryachiy', 'Сет Горячий 🔥',
     'Лосось Фри (6 шт.), Эби Фри (6 шт.), Крабс Темпура (8 шт.), Бекон Темпура (8 шт.), Запеченный Цезарь (8 шт.), Запеченный Краб (8 шт.).',
     1760, 1000, 44,
     'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=800&q=80',
     ['Лосось', 'Креветка', 'Снежный краб', 'Бекон', 'Кляр', 'Соус цезарь', 'Рис', 'Нори'],
     False, '25% выгода'),
]

for s in sets_data:
    menu_set = create_set(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], s[8], s[9])
    if menu_set:
        saved_sets[s[0]] = menu_set


# ═════════════════════════════════════════
#  ПРОДУКТЫ
# ═════════════════════════════════════════
saved_products = {}

ROLL_IMG = 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80'
SUSHI_IMG = 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80'
TEMPURA_IMG = 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=800&q=80'
POKE_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
DESSERT_IMG = 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80'
BAKED_IMG = 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80'
DOP_IMG = 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80'

# ── БОЛЬШИЕ РОЛЛЫ (firm, 10 шт.) ──
print('\n── БОЛЬШИЕ РОЛЛЫ ──')
firm_rolls = [
    ('bonito-grebeshok', 'Бонито с Гребешком', 'Рис, Нори, Гребешок, Сыр, Авокадо, Стружка Тунца.',
     560, 280, 8, ROLL_IMG, ['Гребешок', 'Сливочный сыр', 'Авокадо', 'Стружка тунца', 'Рис', 'Нори']),
    ('black-grebeshok', 'Блэк Ролл с Гребешком', 'Рис, Нори, Гребешок, Сыр, Авокадо, Икра Масаго.',
     640, 280, 8, ROLL_IMG, ['Гребешок', 'Сливочный сыр', 'Авокадо', 'Икра масаго', 'Рис', 'Нори']),
    ('fresh-grebeshok', 'Фреш Ролл с Гребешком', 'Рис, Нори, Снежный Краб, Огурец, Гребешок, Белый Кунжут, Соус Масаго.',
     740, 280, 8, ROLL_IMG, ['Гребешок', 'Снежный краб', 'Огурец', 'Кунжут', 'Икра масаго', 'Рис', 'Нори']),
    ('philadelphia-grebeshok', 'Филадельфия с Гребешком', 'Рис, Нори, Сыр, Лосось, Гребешок, Авокадо.',
     895, 300, 8, ROLL_IMG, ['Лосось', 'Гребешок', 'Сливочный сыр', 'Авокадо', 'Рис', 'Нори']),
    ('goa', 'Гоа', 'Рис, Нори, Сыр, Копченая Курица, Зеленый Лук.',
     390, 260, 8, ROLL_IMG, ['Копченая курица', 'Сливочный сыр', 'Зеленый лук', 'Рис', 'Нори']),
    ('alyaska-firm', 'Аляска', 'Рис, Нори, Сыр, Копченый Лосось, Зеленый Лук.',
     580, 270, 8, ROLL_IMG, ['Копченый лосось', 'Сливочный сыр', 'Зеленый лук', 'Рис', 'Нори']),
    ('nebraska', 'Небраска', 'Рис, Нори, Сыр, Снежный Краб, Огурец, Японский Омлет.',
     390, 260, 8, ROLL_IMG, ['Снежный краб', 'Сливочный сыр', 'Огурец', 'Японский омлет', 'Рис', 'Нори']),
    ('nezhnyy-krevetka', 'Нежный с Креветкой', 'Рис, Нори, Сыр, Креветка, Икра Масаго.',
     520, 260, 8, ROLL_IMG, ['Креветка', 'Сливочный сыр', 'Икра масаго', 'Рис', 'Нори']),
    ('nezhnyy-snezhnyy-krab', 'Нежный со Снежным Крабом', 'Рис, Нори, Сыр, Снежный краб, Икра Масаго.',
     390, 260, 8, ROLL_IMG, ['Снежный краб', 'Сливочный сыр', 'Икра масаго', 'Рис', 'Нори']),
    ('philadelphia-omlet', 'Филадельфия Японский Омлет', 'Рис, Нори, Японский омлет, Авокадо, Сыр.',
     420, 260, 8, ROLL_IMG, ['Японский омлет', 'Сливочный сыр', 'Авокадо', 'Рис', 'Нори']),
]
for data in firm_rolls:
    prod = create_product('rolls', 'firm', *data)
    if prod: saved_products[data[0]] = prod

# ── ЗАПЕЧЕННЫЕ РОЛЛЫ (baked, 10 шт.) ──
print('\n── ЗАПЕЧЕННЫЕ РОЛЛЫ ──')
BAKED_IMG = 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80'
baked_rolls = [
    ('goryachiy-grebeshok', 'Горячий с Гребешком', 'Рис, Нори, Сыр, Огурец, Гребешок, Сыр Гауда, Майонез.',
     630, 280, 8, BAKED_IMG, ['Гребешок', 'Сливочный сыр', 'Сыр гауда', 'Огурец', 'Майонез', 'Рис', 'Нори']),
    ('zapech-bonito-krab', 'Запеченный Бонито со Снежным Крабом', 'Рис, Нори, Сыр, Авокадо, Стружка Тунца, Снежный Краб.',
     440, 270, 8, BAKED_IMG, ['Снежный краб', 'Сливочный сыр', 'Авокадо', 'Стружка тунца', 'Рис', 'Нори']),
    ('zapech-grebeshok-spaysi', 'Запеченный Гребешок Спайси', 'Рис, Нори, Сыр, Огурец, Гребешок, Майонез, Икра масаго, Соус Спайси.',
     670, 280, 8, BAKED_IMG, ['Гребешок', 'Сливочный сыр', 'Огурец', 'Майонез', 'Икра масаго', 'Соус спайси', 'Рис', 'Нори']),
    ('zapech-grebeshok', 'Запеченный с Гребешком', 'Рис, Нори, Сыр, Огурец, Гребешок, Майонез, Икра масаго.',
     660, 280, 8, BAKED_IMG, ['Гребешок', 'Сливочный сыр', 'Огурец', 'Майонез', 'Икра масаго', 'Рис', 'Нори']),
    ('kioto-baked', 'Киото', 'Рис, Нори, Сыр, Японский омлет, Огурец, Филе курицы обжаренное, Майонез, Кунжут, Соус терияки.',
     420, 270, 8, BAKED_IMG, ['Копченая курица', 'Сливочный сыр', 'Японский омлет', 'Огурец', 'Кунжут', 'Майонез', 'Соус терияки', 'Рис', 'Нори']),
    ('zapech-spaysi-krab', 'Запеченный Спайси Краб', 'Рис, Нори, Сыр, Японский Омлет, Острый Снежный Краб, Икра масаго.',
     420, 270, 8, BAKED_IMG, ['Снежный краб', 'Сливочный сыр', 'Японский омлет', 'Икра масаго', 'Соус спайси', 'Рис', 'Нори']),
    ('zapech-chiken', 'Запеченный Чикен', 'Рис, Нори, Сыр, Копченая курица, Томат, Майонез.',
     380, 260, 8, BAKED_IMG, ['Копченая курица', 'Сливочный сыр', 'Томат', 'Майонез', 'Рис', 'Нори']),
    ('zapech-krab', 'Запеченный Краб', 'Рис, Нори, Сыр, Снежный краб, Огурец, Майонез.',
     390, 260, 8, BAKED_IMG, ['Снежный краб', 'Сливочный сыр', 'Огурец', 'Майонез', 'Рис', 'Нори']),
    ('zapech-kalmar', 'Запеченный с Кальмаром', 'Рис, Нори, Сыр, Кальмар, Огурец, Майонез, Соус спайси.',
     420, 270, 8, BAKED_IMG, ['Кальмар', 'Сливочный сыр', 'Огурец', 'Майонез', 'Соус спайси', 'Рис', 'Нори']),
    ('cezar-zapech', 'Цезарь Запеченный', 'Рис, Нори, Сыр, Копченая курица, Салат, Томат, Соус цезарь, Сухари.',
     430, 270, 8, BAKED_IMG, ['Копченая курица', 'Сливочный сыр', 'Салат', 'Томат', 'Соус цезарь', 'Сухари', 'Рис', 'Нори']),
]
for data in baked_rolls:
    prod = create_product('rolls', 'baked', *data)
    if prod: saved_products[data[0]] = prod

# ── ФРИ РОЛЛЫ (free, 9 шт.) ──
print('\n── ФРИ РОЛЛЫ ──')
free_rolls = [
    ('grebeshok-tempura', 'Гребешок Темпура', 'Рис, Нори, Сыр, Гребешок, Огурец, Кляр, Сухари.',
     560, 280, 8, TEMPURA_IMG, ['Гребешок', 'Сливочный сыр', 'Огурец', 'Кляр', 'Сухари', 'Рис', 'Нори']),
    ('grebeshok-fri-unagi', 'Гребешок Фри с Соусом Унаги', 'Рис, Нори, Гребешок, Кляр, Сухари, Соус Унаги.',
     390, 200, 6, TEMPURA_IMG, ['Гребешок', 'Кляр', 'Сухари', 'Соус унаги', 'Рис', 'Нори']),
    ('losos-fri', 'Лосось Фри', 'Рис, Нори, Лосось, Кляр, Сухари.',
     410, 200, 6, TEMPURA_IMG, ['Лосось', 'Кляр', 'Сухари', 'Рис', 'Нори']),
    ('okinawa-fri', 'Окинава', 'Рис, Нори, Курица, Салат, Томат, Кляр, Сухари.',
     410, 260, 8, TEMPURA_IMG, ['Копченая курица', 'Салат', 'Томат', 'Кляр', 'Сухари', 'Рис', 'Нори']),
    ('chiken-fri', 'Чикен Фри', 'Рис, Нори, Курица, Кляр, Сухари.',
     190, 180, 6, TEMPURA_IMG, ['Копченая курица', 'Кляр', 'Сухари', 'Рис', 'Нори']),
    ('ebi-fri', 'Эби Фри', 'Рис, Нори, Креветка, Кляр, Сухари.',
     320, 180, 6, TEMPURA_IMG, ['Креветка', 'Кляр', 'Сухари', 'Рис', 'Нори']),
    ('spaysi-roll-fri', 'Спайси Ролл Фри', 'Рис, Нори, Лосось терияки, Сыр, Перец, Соус спайси, Кляр, Сухари.',
     520, 280, 8, TEMPURA_IMG, ['Лосось', 'Сливочный сыр', 'Болгарский перец', 'Соус спайси', 'Кляр', 'Сухари', 'Рис', 'Нори']),
    ('bekon-tempura', 'Бекон Темпура', 'Рис, Нори, Курица, Бекон, Томат, Кляр, Сухари.',
     410, 260, 8, TEMPURA_IMG, ['Копченая курица', 'Бекон', 'Томат', 'Кляр', 'Сухари', 'Рис', 'Нори']),
    ('krabs-fri', 'Крабс Фри', 'Рис, Нори, Снежный краб, Кляр, Сухари.',
     310, 180, 6, TEMPURA_IMG, ['Снежный краб', 'Кляр', 'Сухари', 'Рис', 'Нори']),
]
for data in free_rolls:
    prod = create_product('rolls', 'free', *data)
    if prod: saved_products[data[0]] = prod

# ── ТЕПЛЫЕ И ТЕМПУРА РОЛЛЫ (warm, 8 шт.) ──
print('\n── ТЕПЛЫЕ И ТЕМПУРА РОЛЛЫ ──')
warm_rolls = [
    ('bonito-losos', 'Бонито с Лососем', 'Рис, Нори, Лосось, Сыр, Авокадо, Стружка Тунца.',
     490, 270, 8, ROLL_IMG, ['Лосось', 'Сливочный сыр', 'Авокадо', 'Стружка тунца', 'Рис', 'Нори']),
    ('bonito-krevetka', 'Бонито с Креветкой', 'Рис, Нори, Креветка, Сыр, Авокадо, Стружка Тунца.',
     510, 270, 8, ROLL_IMG, ['Креветка', 'Сливочный сыр', 'Авокадо', 'Стружка тунца', 'Рис', 'Нори']),
    ('bonito-ugor', 'Бонито с Угрем', 'Рис, Нори, Угорь, Сыр, Авокадо, Стружка Тунца, Соус унаги.',
     690, 280, 8, ROLL_IMG, ['Угорь', 'Сливочный сыр', 'Авокадо', 'Стружка тунца', 'Соус унаги', 'Рис', 'Нори']),
    ('losos-tempura', 'Лосось Темпура', 'Рис, Нори, Лосось, Сыр, Огурец, Кляр, Сухари.',
     480, 260, 8, ROLL_IMG, ['Лосось', 'Сливочный сыр', 'Огурец', 'Кляр', 'Сухари', 'Рис', 'Нори']),
    ('ugor-tempura-roll', 'Угорь Темпура', 'Рис, Нори, Угорь, Сыр, Огурец, Кляр, Сухари, Соус унаги.',
     590, 270, 8, ROLL_IMG, ['Угорь', 'Сливочный сыр', 'Огурец', 'Кляр', 'Сухари', 'Соус унаги', 'Рис', 'Нори']),
    ('krevetka-tempura-roll', 'Креветка Темпура', 'Рис, Нори, Креветка, Сыр, Огурец, Кляр, Сухари.',
     450, 250, 8, ROLL_IMG, ['Креветка', 'Сливочный сыр', 'Огурец', 'Кляр', 'Сухари', 'Рис', 'Нори']),
    ('krabs-tempura', 'Крабс Темпура', 'Рис, Нори, Снежный краб, Сыр, Огурец, Кляр, Сухари.',
     390, 250, 8, ROLL_IMG, ['Снежный краб', 'Сливочный сыр', 'Огурец', 'Кляр', 'Сухари', 'Рис', 'Нори']),
    ('snezhnyy-krab-str-tunca', 'Снежный Краб в Стружке Тунца', 'Рис, Нори, Снежный краб, Сыр, Авокадо, Стружка Тунца.',
     480, 270, 8, ROLL_IMG, ['Снежный краб', 'Сливочный сыр', 'Авокадо', 'Стружка тунца', 'Рис', 'Нори']),
]
for data in warm_rolls:
    prod = create_product('rolls', 'warm', *data)
    if prod: saved_products[data[0]] = prod

# ── КЛАССИЧЕСКИЕ РОЛЛЫ (classic, 10 шт.) ──
print('\n── КЛАССИЧЕСКИЕ РОЛЛЫ ──')
classic_rolls = [
    ('fila-losos', 'Филадельфия Лосось', 'Рис, Нори, Лосось, Сливочный сыр, Авокадо.',
     450, 250, 8, ROLL_IMG, ['Лосось', 'Сливочный сыр', 'Авокадо', 'Рис', 'Нори']),
    ('fila-krevetka', 'Филадельфия Креветка', 'Рис, Нори, Креветка, Сливочный сыр, Авокадо.',
     470, 250, 8, ROLL_IMG, ['Креветка', 'Сливочный сыр', 'Авокадо', 'Рис', 'Нори']),
    ('fila-ugor', 'Филадельфия Угорь', 'Рис, Нори, Угорь, Сливочный сыр, Авокадо, Соус унаги.',
     550, 260, 8, ROLL_IMG, ['Угорь', 'Сливочный сыр', 'Авокадо', 'Соус унаги', 'Рис', 'Нори']),
    ('california', 'Калифорния', 'Рис, Нори, Снежный краб, Авокадо, Огурец, Икра тобико.',
     380, 240, 8, ROLL_IMG, ['Снежный краб', 'Авокадо', 'Огурец', 'Икра тобико', 'Рис', 'Нори']),
    ('fila-kopchenyy-losos', 'Филадельфия Копченый Лосось', 'Рис, Нори, Копченый лосось, Сливочный сыр, Авокадо.',
     490, 250, 8, ROLL_IMG, ['Копченый лосось', 'Сливочный сыр', 'Авокадо', 'Рис', 'Нори']),
    ('roll-s-ogurcom', 'Ролл с Огурцом', 'Рис, Нори, Огурец, Кунжут.',
     170, 140, 6, ROLL_IMG, ['Огурец', 'Кунжут', 'Рис', 'Нори']),
    ('roll-s-omletom', 'Ролл с Японским Омлетом', 'Рис, Нори, Японский омлет, Кунжут.',
     190, 150, 6, ROLL_IMG, ['Японский омлет', 'Кунжут', 'Рис', 'Нори']),
    ('roll-s-filadelfiey', 'Ролл с Филадельфией', 'Рис, Нори, Сливочный сыр, Огурец.',
     210, 160, 6, ROLL_IMG, ['Сливочный сыр', 'Огурец', 'Рис', 'Нори']),
    ('roll-s-kopch-kuricey', 'Ролл с Копченой Курицей и Соусом Спайси', 'Рис, Нори, Копченая курица, Сливочный сыр, Соус спайси.',
     230, 170, 6, ROLL_IMG, ['Копченая курица', 'Сливочный сыр', 'Соус спайси', 'Рис', 'Нори']),
    ('roll-s-avokado', 'Ролл с Авокадо', 'Рис, Нори, Авокадо, Кунжут.',
     190, 150, 6, ROLL_IMG, ['Авокадо', 'Кунжут', 'Рис', 'Нори']),
]
for data in classic_rolls:
    prod = create_product('rolls', 'classic', *data)
    if prod: saved_products[data[0]] = prod

# ── СУШИ И ГУНКАНЫ (10 шт.) ──
print('\n── СУШИ И ГУНКАНЫ ──')
sushi_items = [
    ('nigiri-losos', 'Нигири с Лососем (2 шт)', 'Свежий охлажденный лосось на рисе.',
     180, 80, 2, SUSHI_IMG, ['Лосось', 'Рис']),
    ('nigiri-tunec', 'Нигири с Тунцом (2 шт)', 'Тунец высокого качества на рисе.',
     200, 80, 2, SUSHI_IMG, ['Тунец', 'Рис']),
    ('nigiri-ugor', 'Нигири с Угрем (2 шт)', 'Копченый угорь на рисе с соусом унаги.',
     250, 85, 2, SUSHI_IMG, ['Угорь', 'Соус унаги', 'Рис']),
    ('nigiri-krevetka', 'Нигири с Креветкой (2 шт)', 'Отварная креветка на рисе.',
     190, 80, 2, SUSHI_IMG, ['Креветка', 'Рис']),
    ('gunkan-losos', 'Гункан с Лососем (2 шт)', 'Лосось, рис, нори, икра тобико.',
     220, 90, 2, BAKED_IMG, ['Лосось', 'Икра тобико', 'Рис', 'Нори']),
    ('gunkan-ugor', 'Гункан с Угрем (2 шт)', 'Угорь, рис, нори, соус унаги.',
     280, 90, 2, BAKED_IMG, ['Угорь', 'Соус унаги', 'Рис', 'Нори']),
    ('gunkan-krevetka', 'Гункан с Креветкой (2 шт)', 'Креветка, рис, нори, икра тобико.',
     230, 90, 2, BAKED_IMG, ['Креветка', 'Икра тобико', 'Рис', 'Нори']),
    ('gunkan-spaysi-krab', 'Гункан с Острым Снежным Крабом (2 шт)', 'Снежный краб, рис, нори, соус спайси.',
     200, 90, 2, BAKED_IMG, ['Снежный краб', 'Соус спайси', 'Рис', 'Нори']),
    ('gunkan-snezhnyy-krab', 'Гункан со Снежным Крабом (2 шт)', 'Снежный краб, рис, нори.',
     190, 85, 2, BAKED_IMG, ['Снежный краб', 'Рис', 'Нори']),
    ('gunkan-tunec', 'Гункан с Тунцом (2 шт)', 'Тунец, рис, нори, икра тобико.',
     240, 90, 2, BAKED_IMG, ['Тунец', 'Икра тобико', 'Рис', 'Нори']),
]
for data in sushi_items:
    prod = create_product('sushi', None, *data)
    if prod: saved_products[data[0]] = prod

# ── ПОКЕ & САЛАТЫ (6 шт.) ──
print('\n── ПОКЕ & САЛАТЫ ──')
poke_items = [
    ('poke-krevetka', 'Поке с Креветкой',
     'Рис, Креветка, Салат Чука, Бобы, Авокадо, Огурец, Томаты Чери, Соус Манго-Чили, Соус ореховый, Белый Кунжут.',
     525, 260, 1, POKE_IMG, ['Креветка', 'Авокадо', 'Огурец', 'Салат чука', 'Бобы', 'Томат', 'Кунжут', 'Соус манго-чили', 'Соус ореховый', 'Рис']),
    ('poke-tunec', 'Поке с Тунцом',
     'Рис, Тунец, Салат Чука, Бобы, Авокадо, Огурец, Томаты Чери, Соус Манго-Чили, Соус ореховый, Белый Кунжут.',
     495, 260, 1, POKE_IMG, ['Тунец', 'Авокадо', 'Огурец', 'Салат чука', 'Бобы', 'Томат', 'Кунжут', 'Соус манго-чили', 'Соус ореховый', 'Рис']),
    ('poke-losos', 'Поке с Лососем',
     'Рис, Лосось, Салат Чука, Бобы, Авокадо, Огурец, Томаты Чери, Соус Манго-Чили, Соус ореховый, Белый Кунжут.',
     545, 260, 1, POKE_IMG, ['Лосось', 'Авокадо', 'Огурец', 'Салат чука', 'Бобы', 'Томат', 'Кунжут', 'Соус манго-чили', 'Соус ореховый', 'Рис']),
    ('salat-chuka', 'Салат Чука',
     'Водоросли вакамэ, кунжутное масло, соевый соус, кунжут, острый перец.',
     290, 180, 1, POKE_IMG, ['Салат чука', 'Кунжут', 'Соевый соус', 'Соус спайси']),
    ('salat-morskiy', 'Морской Салат',
     'Креветка, кальмар, микс салата, лимон, соевый соус.',
     380, 200, 1, POKE_IMG, ['Креветка', 'Кальмар', 'Салат', 'Лимон', 'Соевый соус']),
    ('salat-cezar', 'Салат Цезарь с Курицей',
     'Копченая курица, салат романо, томаты черри, сухари, соус цезарь, пармезан.',
     350, 220, 1, POKE_IMG, ['Копченая курица', 'Салат', 'Томат', 'Сухари', 'Соус цезарь', 'Сыр гауда']),
]
for data in poke_items:
    prod = create_product('pokesalads', None, *data)
    if prod: saved_products[data[0]] = prod

# ── ГОРЯЧЕЕ (8 шт.) ──
print('\n── ГОРЯЧЕЕ ──')
HOT_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
hot_items = [
    ('tempura-krevetka-hot', 'Темпура Креветка (6 шт)', 'Хрустящие креветки в кляре с лимоном.',
     280, 150, 6, TEMPURA_IMG, ['Креветка', 'Кляр', 'Лимон']),
    ('ris-s-kuricey', 'Рис с Курицей Терияки', 'Рис, куриное филе, соус терияки, кунжут, зеленый лук.',
     340, 300, 1, HOT_IMG, ['Копченая курица', 'Рис', 'Соус терияки', 'Кунжут', 'Зеленый лук']),
    ('ris-s-ugrem', 'Рис с Угрем', 'Рис, угорь копченый, соус унаги, кунжут.',
     450, 300, 1, HOT_IMG, ['Угорь', 'Рис', 'Соус унаги', 'Кунжут']),
    ('udon-s-kuricey', 'Удон с Курицей', 'Лапша удон, куриное филе, соус терияки, овощи.',
     370, 350, 1, HOT_IMG, ['Копченая курица', 'Соус терияки', 'Болгарский перец', 'Зеленый лук']),
    ('udon-s-krevetkoy', 'Удон с Креветкой', 'Лапша удон, креветка, соус терияки, овощи.',
     420, 350, 1, HOT_IMG, ['Креветка', 'Соус терияки', 'Болгарский перец', 'Зеленый лук']),
    ('miso-sup', 'Мисо Суп', 'Соевая паста мисо, тофу, нори, зеленый лук.',
     250, 300, 1, HOT_IMG, ['Нори', 'Зеленый лук', 'Соевый соус']),
    ('tom-yam-krevetka', 'Том Ям с Креветкой', 'Креветка, кокосовое молоко, лимон, острый перец.',
     480, 350, 1, HOT_IMG, ['Креветка', 'Лимон', 'Соус спайси']),
    ('spring-rolls', 'Спринг-роллы (4 шт)', 'Рисовая бумага, овощи, стеклянная лапша, соус чили.',
     260, 160, 4, TEMPURA_IMG, ['Кляр', 'Салат', 'Огурец', 'Майонез']),
]
for data in hot_items:
    prod = create_product('hot', None, *data)
    if prod: saved_products[data[0]] = prod

# ── ДЕСЕРТЫ (6 шт.) ──
print('\n── ДЕСЕРТЫ ──')
dessert_items = [
    ('chizkeyk-karamel', 'Чизкейк Карамельный с Арахисом',
     'Нежный чизкейк с карамельным топингом и хрустящим арахисом.',
     245, 150, 1, DESSERT_IMG, ['Сливочный сыр']),
    ('mochi-mango', 'Моти Манго (2 шт)', 'Японский десерт из рисового теста с начинкой манго.',
     190, 80, 2, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
     ['Рис']),
    ('mochi-matcha', 'Моти Матча (2 шт)', 'Японский десерт с начинкой из зеленого чая матча.',
     190, 80, 2, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
     ['Рис']),
    ('chizkeyk-nyu-york', 'Чизкейк Нью-Йорк',
     'Классический американский чизкейк на тонком корже.',
     280, 170, 1, DESSERT_IMG, ['Сливочный сыр', 'Японский омлет']),
    ('matcha-roll-dessert', 'Матча Ролл',
     'Бисквитный рулет с кремом из матча и белым шоколадом.',
     320, 180, 8, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
     ['Сливочный сыр']),
    ('dorayaki', 'Японский Блинчик Дораяки',
     'Воздушный бисквит с начинкой из пасты адзуки.',
     220, 120, 2, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80',
     ['Рис']),
]
for data in dessert_items:
    prod = create_product('desserts', None, *data)
    if prod: saved_products[data[0]] = prod

# ── ДОПОЛНИТЕЛЬНО (8 шт.) ──
print('\n── ДОПОЛНИТЕЛЬНО ──')
DOP_IMG = 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80'
dop_items = [
    ('sake', 'Сакэ (150 мл)', 'Традиционное японское рисовое вино.',
     390, 150, 1, 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80',
     ['Сакэ']),
    ('imbir', 'Имбирь маринованный (50 г)', 'Классическое дополнение к суши и роллам.',
     80, 50, 1, DOP_IMG, []),
    ('vasabi', 'Васаби (50 г)', 'Острая японская приправа.',
     50, 50, 1, DOP_IMG, ['Васаби']),
    ('soevyy-sous', 'Соевый соус (100 мл)', 'Классический японский соевый соус.',
     60, 100, 1, DOP_IMG, ['Соевый соус']),
    ('spaysi-sous', 'Соус Спайси (50 г)', 'Острый японский майонезный соус.',
     90, 50, 1, DOP_IMG, ['Соус спайси', 'Майонез']),
    ('unagi-sous', 'Соус Унаги (50 г)', 'Сладкий соус для угря.',
     100, 50, 1, DOP_IMG, ['Соус унаги', 'Соевый соус']),
    ('coca-cola', 'Coca-Cola (0.33 л)', 'Охлажденный газированный напиток.',
     120, 330, 1, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80',
     []),
    ('voda', 'Вода минеральная (0.5 л)', 'Чистая питьевая вода.',
     70, 500, 1, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80',
     []),
]
for data in dop_items:
    prod = create_product('dop', None, *data)
    if prod: saved_products[data[0]] = prod


# ═════════════════════════════════════════
#  ПРИВЯЗКА SetItem
# ═════════════════════════════════════════
print('\n── ПРИВЯЗКА SET ITEMS ──')

set_items_map = {
    'set-azia': [
        ('okinawa-fri', 1), ('kioto-baked', 1),
        ('zapech-grebeshok-spaysi', 1), ('zapech-bonito-krab', 1),
    ],
    'set-4-polovinki': [
        ('fila-losos', 1), ('cezar-zapech', 1),
        ('zapech-bonito-krab', 1), ('alyaska-firm', 1),
    ],
    'set-romantik': [
        ('california', 1), ('fila-krevetka', 1),
        ('roll-s-ogurcom', 1), ('roll-s-omletom', 1),
    ],
    'set-5-polovinok': [
        ('nezhnyy-snezhnyy-krab', 1), ('krabs-tempura', 1),
        ('nebraska', 1), ('philadelphia-omlet', 1),
    ],
    'set-dlya-tebya': [
        ('bonito-losos', 1), ('fila-losos', 1),
    ],
    'set-bonito': [
        ('fila-losos', 1), ('zapech-bonito-krab', 1),
        ('bonito-krevetka', 1), ('bonito-losos', 1),
    ],
    'set-okinawa': [
        ('goryachiy-grebeshok', 1), ('okinawa-fri', 1),
        ('bonito-krevetka', 1),
    ],
    'set-s-lososem': [
        ('nigiri-losos', 1), ('gunkan-losos', 1),
        ('fila-losos', 1), ('bonito-losos', 1),
        ('losos-tempura', 1), ('goryachiy-grebeshok', 1),
    ],
    'set-s-krevetkoy': [
        ('nigiri-krevetka', 1), ('gunkan-krevetka', 1),
        ('fila-krevetka', 1), ('bonito-krevetka', 1),
        ('krevetka-tempura-roll', 1), ('goryachiy-grebeshok', 1),
    ],
    'set-na-kompaniyu': [
        ('nezhnyy-snezhnyy-krab', 1), ('fila-losos', 1),
        ('roll-s-kopch-kuricey', 1), ('krabs-tempura', 1),
        ('bonito-losos', 1), ('zapech-chiken', 1),
        ('zapech-spaysi-krab', 1), ('philadelphia-omlet', 1),
    ],
    'set-mega': [
        ('bekon-tempura', 1), ('okinawa-fri', 1),
        ('cezar-zapech', 1), ('fila-losos', 1),
        ('nezhnyy-snezhnyy-krab', 1), ('roll-s-ogurcom', 1),
        ('roll-s-omletom', 1), ('roll-s-filadelfiey', 1),
    ],
    'set-goryachiy': [
        ('losos-fri', 1), ('ebi-fri', 1),
        ('krabs-tempura', 1), ('bekon-tempura', 1),
        ('cezar-zapech', 1), ('zapech-krab', 1),
    ],
}

for set_slug, included_items in set_items_map.items():
    menu_set = saved_sets.get(set_slug)
    if not menu_set:
        continue
    for prod_slug, qty in included_items:
        prod = saved_products.get(prod_slug)
        if prod:
            SetItem.objects.create(
                set_menu=menu_set, included_product=prod, quantity=qty)
            print(f'  ↳ {menu_set.name} ← {prod.name} × {qty}')
        else:
            print(f'  ⚠️  Продукт {prod_slug} не найден для сета {menu_set.name}')


print(f'\n🎉 ГОТОВО!')
print(f'   Категорий: {Category.objects.count()}')
print(f'   Подкатегорий: {SubCategory.objects.count()}')
print(f'   Продуктов: {Product.objects.count()}')
print(f'   Сетов: {Set.objects.count()}')
print(f'   Позиций в сетах: {SetItem.objects.count()}')
print(f'   Ингредиентов: {Ingredient.objects.count()}')
print(f'   Аллергенов: {Allergen.objects.count()}')
