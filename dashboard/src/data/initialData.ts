/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MenuItem, Order, OperationLog, DashboardStats } from '../types';

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'm-set-imperator',
    name: 'Сет "Император"',
    type: 'set',
    category: 'sets',
    price: 2450,
    description: 'Огромный праздничный сет для большой компании. Изысканное сочетание классических роллов.',
    subItems: [
      { name: 'Филадельфия Классик (8 шт)', quantity: 1 },
      { name: 'Калифорния с крабом (8 шт)', quantity: 1 },
      { name: 'Канада с угрем (8 шт)', quantity: 1 },
      { name: 'Ролл с запеченным лососем (8 шт)', quantity: 1 }
    ],
    isAvailable: true,
    imageColor: 'from-rose-500 to-amber-500'
  },
  {
    id: 'm-set-dragon',
    name: 'Сет "Три Дракона"',
    type: 'set',
    category: 'sets',
    price: 1990,
    description: 'Любителям унаги и изысканных соусов. Сет премиум-класса.',
    subItems: [
      { name: 'Красный Дракон (8 шт)', quantity: 1 },
      { name: 'Черный Дракон (8 шт)', quantity: 1 },
      { name: 'Зеленый Дракон (8 шт)', quantity: 1 }
    ],
    isAvailable: true,
    imageColor: 'from-emerald-600 to-teal-500'
  },
  {
    id: 'm-set-hot',
    name: 'Сет "Горячий Самурай"',
    type: 'set',
    category: 'sets',
    price: 1350,
    description: 'Теплые запеченные роллы с хрустящей корочкой и нежной шапочкой.',
    subItems: [
      { name: 'Запеченный ролл с курицей спайси (8 шт)', quantity: 1 },
      { name: 'Запеченный ролл с мидиями (8 шт)', quantity: 1 },
      { name: 'Темпура ролл с креветкой (8 шт)', quantity: 1 }
    ],
    isAvailable: true,
    imageColor: 'from-orange-500 to-red-600'
  },
  {
    id: 'm-roll-philadelphia',
    name: 'Ролл "Филадельфия Классик"',
    type: 'product',
    category: 'rolls',
    price: 490,
    description: 'Нежный сыр Cremette, свежайший охлажденный лосось премиум-качества, рис и нори.',
    ingredients: ['Лосось', 'Сливочный сыр Cremette', 'Рис', 'Нори'],
    isAvailable: true,
    imageColor: 'from-pink-500 to-rose-400'
  },
  {
    id: 'm-roll-california',
    name: 'Ролл "Калифорния с крабом"',
    type: 'product',
    category: 'rolls',
    price: 450,
    description: 'Мясо снежного краба, спелый авокадо, огурец, японский майонез, икра летучей рыбы Масаго.',
    ingredients: ['Снежный краб', 'Авокадо', 'Огурец', 'Икра Масаго', 'Майонез'],
    isAvailable: true,
    imageColor: 'from-orange-400 to-amber-500'
  },
  {
    id: 'm-roll-canada',
    name: 'Ролл "Канада с угрем"',
    type: 'product',
    category: 'rolls',
    price: 580,
    description: 'Жареный угорь, сливочный сыр, огурец, унаги соус, обсыпка из белого кунжута.',
    ingredients: ['Угорь', 'Сливочный сыр', 'Огурец', 'Унаги соус', 'Кунжут'],
    isAvailable: true,
    imageColor: 'from-yellow-600 to-amber-700'
  },
  {
    id: 'm-sushi-salmon',
    name: 'Суши Сяке (Лосось)',
    type: 'product',
    category: 'sushi',
    price: 150,
    description: 'Классическое нигири-суши со слайсом нежного норвежского лосося.',
    ingredients: ['Лосось', 'Рис', 'Васаби'],
    isAvailable: true,
    imageColor: 'from-red-400 to-rose-400'
  },
  {
    id: 'm-sushi-eel',
    name: 'Суши Унаги (Угорь)',
    type: 'product',
    category: 'sushi',
    price: 180,
    description: 'Нигири-суши с подкопченным угрем, соусом унаги и семенами кунжута.',
    ingredients: ['Угорь', 'Рис', 'Унаги соус', 'Кунжут', 'Нори'],
    isAvailable: true,
    imageColor: 'from-yellow-700 to-stone-700'
  },
  {
    id: 'm-gunkan-spicy-tuna',
    name: 'Гункан Спайси Магуро (Тунец)',
    type: 'product',
    category: 'sushi',
    price: 190,
    description: 'Острый гункан с мелкорубленным филе дикого тунца и пикантным соусом спайси.',
    ingredients: ['Тунец', 'Спайси соус', 'Рис', 'Нори'],
    isAvailable: true,
    imageColor: 'from-red-600 to-pink-700'
  },
  {
    id: 'm-drink-mors',
    name: 'Морс Клюквенный (домашний)',
    type: 'product',
    category: 'drinks',
    price: 150,
    description: 'Натуральный охлаждающий морс из спелой лесной клюквы собственного приготовления. 0.5л',
    isAvailable: true,
    imageColor: 'from-red-700 to-rose-800'
  },
  {
    id: 'm-drink-cola',
    name: 'Добрый Кола 0.5л',
    type: 'product',
    category: 'drinks',
    price: 120,
    description: 'Классический газированный прохладительный напиток в пластиковой бутылке.',
    isAvailable: true,
    imageColor: 'from-gray-800 to-stone-900'
  },
  {
    id: 'm-dessert-mochi',
    name: 'Моти Клубника-Кокос',
    type: 'product',
    category: 'desserts',
    price: 220,
    description: 'Традиционный японский десерт из рисовой муки с нежной сливочной клубнично-кокосовой начинкой.',
    ingredients: ['Рисовая мука', 'Клубничный джем', 'Кокосовые сливки'],
    isAvailable: false, // Out of stock to show how it looks
    imageColor: 'from-pink-300 to-purple-400'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'СУШИ-5812',
    customerName: 'Дмитрий Радонежский',
    customerPhone: '+7 (921) 123-45-67',
    customerAddress: 'г. Москва, ул. Ленина, д. 45, кв. 12, под. 1, эт. 4',
    items: [
      {
        id: 'oi-1',
        menuItemId: 'm-set-imperator',
        name: 'Сет "Император"',
        price: 2450,
        quantity: 1,
        type: 'set'
      },
      {
        id: 'oi-2',
        menuItemId: 'm-drink-cola',
        name: 'Добрый Кола 0.5л',
        price: 120,
        quantity: 2,
        type: 'product'
      }
    ],
    subtotal: 2690,
    deliveryFee: 150,
    tax: 0,
    total: 2840,
    status: 'new',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    paymentMethod: 'card_online',
    notes: 'Пожалуйста, привезите бесконтактно. Оставить у двери.'
  },
  {
    id: 'ord-1002',
    orderNumber: 'СУШИ-5811',
    customerName: 'Анна Воробей',
    customerPhone: '+7 (999) 765-43-21',
    customerAddress: 'г. Москва, Московский пр., д. 102, под. 3, эт. 5, кв. 144',
    items: [
      {
        id: 'oi-3',
        menuItemId: 'm-roll-philadelphia',
        name: 'Ролл "Филадельфия Классик"',
        price: 490,
        quantity: 2,
        type: 'product'
      },
      {
        id: 'oi-4',
        menuItemId: 'm-gunkan-spicy-tuna',
        name: 'Гункан Спайси Магуро (Тунец)',
        price: 190,
        quantity: 4,
        type: 'product'
      }
    ],
    subtotal: 1740,
    deliveryFee: 0, // free delivery threshold reached
    tax: 0,
    total: 1740,
    status: 'preparing',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(), // 18 min ago
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    prepTimeMinutes: 25,
    paymentMethod: 'card_terminal',
    notes: 'Положите больше имбиря и васаби, спасибо!'
  },
  {
    id: 'ord-1003',
    orderNumber: 'СУШИ-5810',
    customerName: 'Владимир Соболев',
    customerPhone: '+7 (905) 555-88-22',
    customerAddress: 'г. Москва, ул. Пушкина, д. 12, кв. 4, код домофона 44к2231',
    items: [
      {
        id: 'oi-5',
        menuItemId: 'm-set-dragon',
        name: 'Сет "Три Дракона"',
        price: 1990,
        quantity: 1,
        type: 'set'
      },
      {
        id: 'oi-6',
        menuItemId: 'm-drink-mors',
        name: 'Морс Клюквенный (домашний)',
        price: 150,
        quantity: 1,
        type: 'product'
      }
    ],
    subtotal: 2140,
    deliveryFee: 0,
    tax: 0,
    total: 2140,
    status: 'ready',
    createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(), // 32 min ago
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    prepTimeMinutes: 20,
    paymentMethod: 'cash',
    notes: 'Нужна сдача с 5000 рублей.'
  },
  {
    id: 'ord-1004',
    orderNumber: 'СУШИ-5809',
    customerName: 'Елена прекрасная',
    customerPhone: '+7 (911) 456-78-90',
    customerAddress: 'г. Москва, пр. Мира, д. 7, кв. 89',
    items: [
      {
        id: 'oi-7',
        menuItemId: 'm-roll-california',
        name: 'Ролл "Калифорния с крабом"',
        price: 450,
        quantity: 2,
        type: 'product'
      },
      {
        id: 'oi-8',
        menuItemId: 'm-sushi-eel',
        name: 'Суши Унаги (Угорь)',
        price: 180,
        quantity: 4,
        type: 'product'
      }
    ],
    subtotal: 1620,
    deliveryFee: 150,
    tax: 0,
    total: 1770,
    status: 'delivering',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 min ago
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    prepTimeMinutes: 25,
    driverName: 'Сергей (Курьер-1)',
    paymentMethod: 'card_online'
  },
  {
    id: 'ord-1005',
    orderNumber: 'СУШИ-5808',
    customerName: 'Артем Быков',
    customerPhone: '+7 (981) 111-22-33',
    customerAddress: 'г. Москва, ул. Чехова, д. 19, кв. 42',
    items: [
      {
        id: 'oi-9',
        menuItemId: 'm-set-imperator',
        name: 'Сет "Император"',
        price: 2450,
        quantity: 1,
        type: 'set'
      }
    ],
    subtotal: 2450,
    deliveryFee: 0,
    tax: 0,
    total: 2450,
    status: 'completed',
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 1.5h ago
    updatedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    prepTimeMinutes: 30,
    driverName: 'Алексей (Курьер-3)',
    paymentMethod: 'card_online'
  },
  {
    id: 'ord-1006',
    orderNumber: 'СУШИ-5807',
    customerName: 'Ольга Смирнова',
    customerPhone: '+7 (903) 999-00-11',
    customerAddress: 'г. Москва, ул. Садовая, д. 8, кв. 11',
    items: [
      {
        id: 'oi-10',
        menuItemId: 'm-set-hot',
        name: 'Сет "Горячий Самурай"',
        price: 1350,
        quantity: 1,
        type: 'set'
      }
    ],
    subtotal: 1350,
    deliveryFee: 150,
    tax: 0,
    total: 1500,
    status: 'cancelled',
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
    cancelReason: 'Клиент передумал, оформил ошибочный заказ',
    paymentMethod: 'card_online'
  }
];

export const INITIAL_LOGS: OperationLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    userRole: 'cashier',
    action: 'Заказ СУШИ-5807 отменен. Причина: Ошибка клиента.',
    type: 'order',
    targetId: 'ord-1006'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    userRole: 'cashier',
    action: 'Зарегистрирован новый заказ СУШИ-5808 на сумму 2,450 ₽',
    type: 'order',
    targetId: 'ord-1005'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    userRole: 'chef',
    action: 'Начато приготовление заказа СУШИ-5808 (Сет "Император")',
    type: 'order',
    targetId: 'ord-1005'
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    userRole: 'chef',
    action: 'Заказ СУШИ-5808 передан на выдачу курьеру Алексей',
    type: 'order',
    targetId: 'ord-1005'
  },
  {
    id: 'log-5',
    timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    userRole: 'manager',
    action: 'Заказ СУШИ-5808 успешно доставлен и закрыт.',
    type: 'order',
    targetId: 'ord-1005'
  },
  {
    id: 'log-6',
    timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    userRole: 'manager',
    action: 'Позиция меню "Моти Клубника-Кокос" отмечена как "Нет в наличии"',
    type: 'menu',
    targetId: 'm-dessert-mochi'
  },
  {
    id: 'log-7',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    userRole: 'system',
    action: 'Получен новый онлайн заказ СУШИ-5812 на сумму 2,840 ₽',
    type: 'order',
    targetId: 'ord-1001'
  }
] as any[];

export const DEFAULT_STATS: DashboardStats = {
  activeOrdersCount: 4,
  avgPrepTimeMinutes: 22,
  activeDriversCount: 3,
  totalRevenueToday: 8490
};
