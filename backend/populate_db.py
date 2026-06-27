"""
Скрипт для заполнения базы данных образцами товаров и сетов.
Данные основаны на реальном меню tokyorolls.ru

Данные меню загружаются из data/menu_data.json
"""
import json
import os
import sys
import urllib.request
import uuid
from io import BytesIO
from pathlib import Path

import django
from django.core.files.images import ImageFile

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from datetime import timedelta
from django.contrib.auth.models import User
from django.utils import timezone

from api.models import (
    Address, Allergen, Category, Ingredient, Order, OrderItem, Product,
    ProductIngredient, PromoCode, RestaurantSettings, Set, SetIngredient,
    SetItem, SubCategory, UserProfile,
)

# ── Загрузка данных из JSON ──
DATA_FILE = Path(__file__).resolve().parent / 'data' / 'menu_data.json'
with open(DATA_FILE, 'r', encoding='utf-8') as f:
    menu = json.load(f)


def download_image(url):
    """Скачать изображение по URL и вернуть как ImageFile (или заглушку при ошибке)."""
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        name = f'{uuid.uuid4().hex[:12]}.jpg'
        return ImageFile(BytesIO(data), name=name)
    except Exception as e:
        print(f'  ⚠️  Не удалось скачать {url}: {e}')
        placeholder = BytesIO(
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
            b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00'
            b'\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x01\x01\x00'
            b'\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        name = f'placeholder_{uuid.uuid4().hex[:8]}.png'
        return ImageFile(placeholder, name=name)


# ── Защита: не удалять данные без явного разрешения ──
if os.environ.get('FORCE_RESEED', '0') != '1' and Category.objects.exists():
    print('⚠️  База уже содержит данные (есть категории).')
    print('   Установите FORCE_RESEED=1 для полной перезаписи данных.')
    sys.exit(0)

# ── Очистить существующие данные (атомарно) ──
from django.db import transaction
with transaction.atomic():
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
categories = {}
for cat_data in menu['categories']:
    cat = Category.objects.create(**cat_data)
    categories[cat.slug] = cat
    print(f'✅ Категория: {cat.name}')

# ═════════════════════════════════════════
#  ПОДКАТЕГОРИИ РОЛЛОВ
# ═════════════════════════════════════════
subcategories = {}
for subcat_data in menu['subcategories']:
    subcat = SubCategory.objects.create(category=categories['rolls'], **subcat_data)
    subcategories[subcat.slug] = subcat
    print(f'✅ Подкатегория: {subcat.name}')

# ═════════════════════════════════════════
#  ИНГРЕДИЕНТЫ
# ═════════════════════════════════════════
ingredients = {}
for name in menu['ingredients']:
    slug = name.lower().replace(' ', '-')
    ing, _ = Ingredient.objects.get_or_create(slug=slug, defaults={'name': name})
    ingredients[name] = ing
print(f'✅ Ингредиентов: {len(ingredients)}')

# ═════════════════════════════════════════
#  АЛЛЕРГЕНЫ
# ═════════════════════════════════════════
allergens = {}
for name in menu['allergens']:
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
for ing_name, allergen_names in menu['ingredient_allergens'].items():
    ing = get_ingredient(ing_name)
    for a_name in allergen_names:
        ing.allergens.add(get_allergen(a_name))
    print(f'  🔗 {ing.name} → {allergen_names}')


# ═════════════════════════════════════════
#  ХЕЛПЕРЫ
# ═════════════════════════════════════════

IMAGE_URLS = menu['image_urls']
OVERRIDES = menu['product_overrides']


def _get_image_url(product_data):
    """Определить URL изображения для продукта с учётом переопределений."""
    override = OVERRIDES.get(product_data['slug'])
    if override:
        return IMAGE_URLS.get(override['image'], IMAGE_URLS['rolls'])
    return IMAGE_URLS.get('rolls')


def create_product(product_data, cat_slug, sub_slug=None):
    """Создать продукт с привязкой ингредиентов."""
    image_url = _get_image_url(product_data)
    image_file = download_image(image_url)
    if image_file is None:
        print(f'  ⚠️  Пропущен {product_data["name"]} — не удалось скачать изображение')
        return None
    product = Product.objects.create(
        category=categories[cat_slug],
        subcategory=subcategories.get(sub_slug) if sub_slug else None,
        slug=product_data['slug'],
        name=product_data['name'],
        description=product_data['desc'],
        price=product_data['price'],
        weight=product_data['weight'],
        pieces_amount=product_data['pieces'],
        image=image_file,
        is_new=product_data.get('is_new', False),
        benefit_badge=product_data.get('benefit_badge', ''),
    )
    for i, ing_name in enumerate(product_data['composition']):
        ProductIngredient.objects.create(
            product=product, ingredient=get_ingredient(ing_name), sort_order=i)
    print(f'✅ {product.name}  ({product.price} ₽, {product.weight}г, {product.pieces_amount}шт)')
    return product


def create_set(set_data):
    """Создать сет с привязкой ингредиентов."""
    image_url = IMAGE_URLS.get('rolls')
    image_file = download_image(image_url)
    if image_file is None:
        print(f'  ⚠️  Пропущен сет {set_data["name"]} — не удалось скачать изображение')
        return None
    menu_set = Set.objects.create(
        slug=set_data['slug'],
        name=set_data['name'],
        description=set_data['desc'],
        price=set_data['price'],
        weight=set_data['weight'],
        pieces_amount=set_data['pieces'],
        image=image_file,
        is_new=set_data.get('is_new', False),
        benefit_badge=set_data.get('benefit_badge', ''),
    )
    for i, ing_name in enumerate(set_data['composition']):
        SetIngredient.objects.create(
            set_menu=menu_set, ingredient=get_ingredient(ing_name), sort_order=i)
    print(f'✅ Сет: {menu_set.name}  ({menu_set.price} ₽, {menu_set.weight}г, {menu_set.pieces_amount}шт)')
    return menu_set


# ═════════════════════════════════════════
#  СЕТЫ
# ═════════════════════════════════════════
print('\n── СЕТЫ ──')
saved_sets = {}
for set_data in menu['sets']:
    menu_set = create_set(set_data)
    if menu_set:
        saved_sets[set_data['slug']] = menu_set

# ═════════════════════════════════════════
#  ПРОДУКТЫ
# ═════════════════════════════════════════
saved_products = {}

# ── Роллы (по подкатегориям) ──
roll_subcategories = {
    'firm': 'БОЛЬШИЕ РОЛЛЫ',
    'baked': 'ЗАПЕЧЕННЫЕ РОЛЛЫ',
    'free': 'ФРИ РОЛЛЫ',
    'warm': 'ТЕПЛЫЕ И ТЕМПУРА РОЛЛЫ',
    'classic': 'КЛАССИЧЕСКИЕ РОЛЛЫ',
}
for sub_slug, label in roll_subcategories.items():
    print(f'\n── {label} ──')
    for product_data in menu['products']['rolls'][sub_slug]:
        prod = create_product(product_data, 'rolls', sub_slug)
        if prod:
            saved_products[product_data['slug']] = prod

# ── Суши и гунканы ──
print('\n── СУШИ И ГУНКАНЫ ──')
for product_data in menu['products']['sushi']:
    prod = create_product(product_data, 'sushi')
    if prod:
        saved_products[product_data['slug']] = prod

# ── Поке и салаты ──
print('\n── ПОКЕ И САЛАТЫ ──')
for product_data in menu['products']['pokesalads']:
    prod = create_product(product_data, 'pokesalads')
    if prod:
        saved_products[product_data['slug']] = prod

# ── Горячее ──
print('\n── ГОРЯЧЕЕ ──')
for product_data in menu['products']['hot']:
    prod = create_product(product_data, 'hot')
    if prod:
        saved_products[product_data['slug']] = prod

# ── Десерты ──
print('\n── ДЕСЕРТЫ ──')
for product_data in menu['products']['desserts']:
    prod = create_product(product_data, 'desserts')
    if prod:
        saved_products[product_data['slug']] = prod

# ── Дополнительно ──
print('\n── ДОПОЛНИТЕЛЬНО ──')
for product_data in menu['products']['dop']:
    prod = create_product(product_data, 'dop')
    if prod:
        saved_products[product_data['slug']] = prod

# ═════════════════════════════════════════
#  ПРИВЯЗКА ПРОДУКТОВ К СЕТАМ
# ═════════════════════════════════════════
print('\n── СОСТАВ СЕТОВ ──')
for set_slug, included_items in menu['set_items'].items():
    menu_set = saved_sets.get(set_slug)
    if not menu_set:
        continue
    for item in included_items:
        prod = saved_products.get(item['product_slug'])
        if prod:
            SetItem.objects.create(
                set_menu=menu_set, included_product=prod, quantity=item['qty'])
            print(f'  ↳ {menu_set.name} ← {prod.name} × {item["qty"]}')
        else:
            print(f'  ⚠️  Продукт {item["product_slug"]} не найден для сета {menu_set.name}')

# ═════════════════════════════════════════
#  ТЕСТОВЫЕ ДАННЫЕ: пользователи, адреса, промокоды
# ═════════════════════════════════════════
td = menu['test_data']

# ── Очистка тестовых данных (не трогаем продукты/сеты) ──
OrderItem.objects.all().delete()
Order.objects.all().delete()
Address.objects.all().delete()
UserProfile.objects.all().delete()
User.objects.filter(username__startswith='+7').delete()
PromoCode.objects.all().delete()
RestaurantSettings.objects.all().delete()

# ── RestaurantSettings (инициализация) ──
rs = td['restaurant_settings']
RestaurantSettings.objects.create(**rs)
print(f'✅ Настройки ресторана: {rs["opening_hour"]}:00–{rs["closing_hour"]}:00, '
      f'мин. заказ {rs["min_order_amount"]}₽, доставка от {rs["free_delivery_from"]}₽')

# ── Пользователи ──
print('\n── ПОЛЬЗОВАТЕЛИ ──')
user_map = {}
for u in td['users']:
    if u['is_superuser']:
        user = User.objects.create_superuser(
            username=u['username'],
            password=u['password'],
            email=u.get('email', ''),
        )
        print(f'✅ Админ: {u["username"]} / {u["password"]} (is_superuser, is_staff)')
    else:
        if u['password'] is not None:
            user = User.objects.create_user(
                username=u['username'],
                password=u['password'],
                is_staff=u.get('is_staff', False),
            )
        else:
            user = User.objects.create_user(username=u['username'], password=None)
            user.set_unusable_password()
            user.is_staff = u.get('is_staff', False)
            user.save()
    UserProfile.objects.create(user=user, phone=u['phone'], role=u.get('role', 'customer'))
    user_map[u['username']] = user

    role_desc = ''
    if u['is_superuser']:
        role_desc = ' (is_superuser, is_staff)'
    elif u['is_staff']:
        role_desc = f' (is_staff, role={u["role"]})'
    else:
        role_desc = ' (обычный)'
    label = f'{u["phone"]} / {u["password"]}' if u['password'] else u['phone']
    print(f'✅ Пользователь: {label}{role_desc}')

# ── Адреса ──
print('\n── АДРЕСА ──')
for addr in td['addresses']:
    user = user_map[addr.pop('username')]
    Address.objects.create(user=user, **addr)
    print(f'✅ Адрес: {addr["full_address"]} ({"основной" if addr.get("is_default") else "дополнительный"})')

# ── Промокоды ──
print('\n── ПРОМОКОДЫ ──')
for promo in td['promocodes']:
    valid_from_days = promo.pop('valid_from_days')
    valid_until_days = promo.pop('valid_until_days')
    if valid_from_days is not None:
        promo['valid_from'] = timezone.now() + timedelta(days=valid_from_days)
    if valid_until_days is not None:
        promo['valid_until'] = timezone.now() + timedelta(days=valid_until_days)
    PromoCode.objects.create(**promo)
    status = 'активен' if promo['is_active'] else 'неактивен'
    print(f'✅ {promo["code"]} — {status} ({promo["discount_percent"]}%)')

# ═════════════════════════════════════════
#  ФИНАЛЬНАЯ СТАТИСТИКА
# ═════════════════════════════════════════
print(f'\n🎉 ГОТОВО!')
print(f'   Категорий: {Category.objects.count()}')
print(f'   Подкатегорий: {SubCategory.objects.count()}')
print(f'   Продуктов: {Product.objects.count()}')
print(f'   Сетов: {Set.objects.count()}')
print(f'   Позиций в сетах: {SetItem.objects.count()}')
print(f'   Ингредиентов: {Ingredient.objects.count()}')
print(f'   Аллергенов: {Allergen.objects.count()}')
print(f'   Пользователей: {User.objects.filter(username__startswith="+7").count()}')
print(f'   Адресов: {Address.objects.count()}')
print(f'   Промокодов: {PromoCode.objects.count()}')
print(f'   Настройки ресторана: есть')
