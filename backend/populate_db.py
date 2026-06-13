"""
Скрипт для заполнения базы данных образцами товаров
"""
import os
import sys
import django

# Добавить путь к проекту
sys.path.insert(0, os.path.dirname(__file__))

# Установить Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Category, SubCategory, Product

# Очистить существующие данные
Category.objects.all().delete()

# Создать категории
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
    print(f'Created category: {cat.name}')

# Создать подкатегории для роллов
subcategories_data = [
    {'slug': 'baked', 'name': 'Запеченные роллы', 'sort_order': 1},
    {'slug': 'warm', 'name': 'Теплые и темпура роллы', 'sort_order': 2},
    {'slug': 'classic', 'name': 'Классические роллы', 'sort_order': 3},
]

subcategories = {}
for subcat_data in subcategories_data:
    subcat = SubCategory.objects.create(
        category=categories['rolls'],
        **subcat_data
    )
    subcategories[subcat.slug] = subcat
    print(f'Created subcategory: {subcat.name}')

# Образцы продуктов
products_data = [
    # СЕТЫ
    {
        'category': 'sets',
        'slug': 'set-philadelphia-mania',
        'name': 'Сет Филадельфия Мания 👑',
        'description': 'Настоящее торжество нежной слабосоленой рыбы и кремового сыра. Четыре изысканных вариации легендарного ролла Филадельфия в одном наборе.',
        'price': 1890,
        'weight': 980,
        'pieces_amount': 32,
        'image_url': 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
        'composition': ['Лосось премиум', 'Мягкий творожный сыр', 'Свежий огурец', 'Рис японика', 'Водоросли нори', 'Авокадо хасс'],
        'allergens': ['Рыба', 'Молочные продукты (лактоза)'],
        'benefit_badge': '20% выгода',
        'is_new': True,
    },
    {
        'category': 'sets',
        'slug': 'set-mikс-вкуса-острый',
        'name': 'Сет Микс Вкуса острый 🌶️',
        'description': 'Огненный и сочный сет для большой компании. Включает запеченные, острые спайси-роллы и хрустящие темпурные шедевры.',
        'price': 2450,
        'weight': 1240,
        'pieces_amount': 48,
        'image_url': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
        'composition': ['Краб снежный', 'Лосось спайси', 'Угорь копченый', 'Соус унаги', 'Острый соус спайси', 'Кунжут', 'Рис японика', 'Нори'],
        'allergens': ['Рыба', 'Моллюски/Ракообразные', 'Кунжут', 'Соя', 'Глютен'],
        'benefit_badge': '15% выгода',
    },
    # РОЛЛЫ - ЗАПЕЧЕННЫЕ
    {
        'category': 'rolls',
        'subcategory': 'baked',
        'slug': 'roll-philadelphia-baked',
        'name': 'Филадельфия запеченная',
        'description': 'Лосось, сливочный сыр, авокадо, рис сверху.',
        'price': 380,
        'weight': 250,
        'pieces_amount': 8,
        'image_url': 'https://images.unsplash.com/photo-1553621042-f6de2442b650?auto=format&fit=crop&w=800&q=80',
        'composition': ['Лосось', 'Сливочный сыр', 'Авокадо', 'Рис', 'Нори'],
        'allergens': ['Рыба', 'Молочные продукты'],
        'is_new': False,
    },
    {
        'category': 'rolls',
        'subcategory': 'baked',
        'slug': 'roll-california-baked',
        'name': 'Калифорния запеченная',
        'description': 'Краб, авокадо, огурец, запеченная сверху.',
        'price': 350,
        'weight': 230,
        'pieces_amount': 8,
        'image_url': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80',
        'composition': ['Краб', 'Авокадо', 'Огурец', 'Рис', 'Нори'],
        'allergens': ['Моллюски/Ракообразные'],
    },
    # РОЛЛЫ - КЛАССИЧЕСКИЕ
    {
        'category': 'rolls',
        'subcategory': 'classic',
        'slug': 'roll-alaska',
        'name': 'Аляска',
        'description': 'Лосось, авокадо, классический вкус.',
        'price': 320,
        'weight': 210,
        'pieces_amount': 8,
        'image_url': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80',
        'composition': ['Лосось', 'Авокадо', 'Рис', 'Нори'],
        'allergens': ['Рыба'],
    },
    {
        'category': 'rolls',
        'subcategory': 'classic',
        'slug': 'roll-tokyo',
        'name': 'Токио',
        'description': 'Тунец, авокадо, икра летучей рыбы.',
        'price': 360,
        'weight': 220,
        'pieces_amount': 8,
        'image_url': 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80',
        'composition': ['Тунец', 'Авокадо', 'Икра летучей рыбы', 'Рис', 'Нори'],
        'allergens': ['Рыба'],
        'is_new': True,
    },
    # СУШИ
    {
        'category': 'sushi',
        'slug': 'sushi-salmon-nigiri',
        'name': 'Нигири с лососем (2 шт)',
        'description': 'Свежий охлажденный лосось на рисе.',
        'price': 180,
        'weight': 80,
        'pieces_amount': 2,
        'image_url': 'https://images.unsplash.com/photo-1563612116625-3012372fccbc?auto=format&fit=crop&w=800&q=80',
        'composition': ['Лосось', 'Рис для суши'],
        'allergens': ['Рыба'],
    },
    {
        'category': 'sushi',
        'slug': 'sushi-tuna-nigiri',
        'name': 'Нигири с тунцом (2 шт)',
        'description': 'Тунец высокого качества на рисе.',
        'price': 200,
        'weight': 80,
        'pieces_amount': 2,
        'image_url': 'https://images.unsplash.com/photo-1563612116625-3012372fccbc?auto=format&fit=crop&w=800&q=80',
        'composition': ['Тунец', 'Рис для суши'],
        'allergens': ['Рыба'],
    },
    # ГОРЯЧЕЕ
    {
        'category': 'hot',
        'slug': 'tempura-shrimp',
        'name': 'Темпура креветка',
        'description': 'Хрустящая закуска из свежих креветок.',
        'price': 280,
        'weight': 150,
        'pieces_amount': 6,
        'image_url': 'https://images.unsplash.com/photo-1582061356519-bb39a077f1f0?auto=format&fit=crop&w=800&q=80',
        'composition': ['Креветка', 'Панировка', 'Масло'],
        'allergens': ['Ракообразные'],
    },
    # НАПИТКИ
    {
        'category': 'drinks',
        'slug': 'sake-cup',
        'name': 'Чашка Сакэ',
        'description': 'Традиционный японский алкогольный напиток.',
        'price': 150,
        'weight': 150,
        'pieces_amount': 1,
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
        'price': 50,
        'weight': 50,
        'pieces_amount': 1,
        'image_url': 'https://images.unsplash.com/photo-1599599810694-2d0ac4147a84?auto=format&fit=crop&w=800&q=80',
        'composition': ['Васаби'],
        'allergens': [],
    },
]

for prod_data in products_data:
    category_slug = prod_data.pop('category')
    subcategory_slug = prod_data.pop('subcategory', None)
    
    product = Product.objects.create(
        category=categories[category_slug],
        subcategory=subcategories.get(subcategory_slug) if subcategory_slug else None,
        **prod_data
    )
    print(f'Created product: {product.name}')

print('✅ Все данные успешно добавлены!')
