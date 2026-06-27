/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MenuItem, MenuCategory, MenuItemType, SetSubItem } from '../types';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ListPlus, Search, Info, Package, Sparkles } from 'lucide-react';

interface MenuManagementProps {
  menuItems: MenuItem[];
  onAddItem: (item: MenuItem) => void;
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (item: MenuItem) => void;
  onToggleAvailability: (item: MenuItem) => void;
}

export default function MenuManagement({
  menuItems,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggleAvailability
}: MenuManagementProps) {
  const [activeCategory, setActiveCategory] = useState<MenuCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<MenuItemType>('product');
  const [formCategory, setFormCategory] = useState<MenuCategory>('rolls');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formDescription, setFormDescription] = useState('');
  const [formIngredients, setFormIngredients] = useState('');
  const [formSubItemsText, setFormSubItemsText] = useState(''); // comma sep or simple list for set sub-items
  const [formImageUrl, setFormImageUrl] = useState('');

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormType('product');
    setFormCategory('rolls');
    setFormPrice(0);
    setFormDescription('');
    setFormIngredients('');
    setFormSubItemsText('');
    setFormImageUrl('');
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormType(item.type);
    setFormCategory(item.category);
    setFormPrice(item.price);
    setFormDescription(item.description);
    setFormIngredients(item.ingredients ? item.ingredients.join(', ') : '');
    setFormSubItemsText(item.subItems ? item.subItems.map(si => `${si.name}:${si.quantity}`).join(', ') : '');
    setFormImageUrl(item.imageUrl || '');
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPrice <= 0) return;

    // Parse ingredients
    const parsedIngredients = formIngredients
      ? formIngredients.split(',').map(i => i.trim()).filter(Boolean)
      : undefined;

    // Parse set sub-items if it's a set
    let parsedSubItems: SetSubItem[] | undefined = undefined;
    if (formType === 'set' && formSubItemsText) {
      parsedSubItems = formSubItemsText.split(',').map(part => {
        const [name, qty] = part.split(':');
        return {
          name: name ? name.trim() : 'Компонент сета',
          quantity: qty ? parseInt(qty.trim(), 10) || 1 : 1
        };
      }).filter(si => si.name);
    }

    const itemData: MenuItem = {
      id: editingItem ? editingItem.id : Date.now(),
      slug: editingItem ? editingItem.slug : formName.toLowerCase().replace(/[^a-zа-я0-9]+/g, '-'),
      name: formName,
      type: formType,
      category: formCategory,
      price: Number(formPrice),
      description: formDescription,
      ingredients: formType === 'product' ? parsedIngredients : undefined,
      subItems: formType === 'set' ? parsedSubItems : undefined,
      isAvailable: editingItem ? editingItem.isAvailable : true,
      imageColor: editingItem ? editingItem.imageColor : getRandomGradient(),
      imageUrl: formImageUrl || undefined
    };

    if (editingItem) {
      onEditItem(itemData);
    } else {
      onAddItem(itemData);
    }

    setIsFormOpen(false);
  };

  const getRandomGradient = () => {
    const gradients = [
      'from-rose-500 to-amber-500',
      'from-emerald-600 to-teal-500',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-400',
      'from-orange-400 to-amber-500',
      'from-yellow-600 to-amber-700',
      'from-red-600 to-pink-700',
      'from-indigo-500 to-purple-600'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  };

  // Filter items
  const filteredItems = menuItems.filter(item => {
    // Category match
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    
    // Search term match
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term);
  });

  const getCategoryNameRu = (cat: MenuCategory) => {
    switch (cat) {
      case 'sets': return 'Сеты';
      case 'rolls': return 'Роллы';
      case 'sushi': return 'Суши и Гунканы';
      case 'drinks': return 'Напитки';
      case 'desserts': return 'Десерты';
    }
  };

  return (
    <div className="space-y-6">
      {/* Menu Header / Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
          <input
            id="inp-search-menu"
            type="text"
            placeholder="Быстрый поиск блюда..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#E11D48] text-slate-900 font-semibold placeholder-slate-400 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Add item trigger */}
        <button
          id="btn-add-menu-item"
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-[#E11D48] hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center space-x-1.5"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Добавить позицию</span>
        </button>
      </div>

      {/* Category filters */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-2 min-w-max">
          {(['all', 'sets', 'rolls', 'sushi', 'drinks', 'desserts'] as const).map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                id={`tab-category-${cat}`}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl border font-semibold text-xs transition-all active:scale-95 ${
                  isActive
                    ? 'bg-[#E11D48] text-white border-[#E11D48] shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200 shadow-sm'
                }`}
              >
                {cat === 'all' ? 'Все меню' : getCategoryNameRu(cat)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Menu Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            id={`menu-item-card-${item.id}`}
            className={`bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 ${
              !item.isAvailable ? 'opacity-70 bg-slate-50' : 'shadow-sm hover:shadow-md'
            }`}
          >
            {/* Visual Header representing sushi image */}
            <div className="h-44 relative overflow-hidden border-b border-slate-100 flex flex-col justify-between p-4">
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${item.imageColor || 'from-rose-500 to-amber-500'}`}></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/30"></div>
              
              <div className="flex justify-between items-start z-10 w-full">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white uppercase tracking-wider shadow-sm">
                  {item.type === 'set' ? 'Сет' : getCategoryNameRu(item.category)}
                </span>

                <button
                  id={`btn-toggle-availability-${item.id}`}
                  onClick={() => onToggleAvailability(item)}
                  className="bg-white/95 text-slate-900 border border-slate-200 p-1 rounded-lg hover:bg-white transition-transform active:scale-95 shadow-sm"
                  title={item.isAvailable ? "Снять с продажи (Выключить)" : "Вернуть в продажу (Включить)"}
                >
                  {item.isAvailable ? (
                    <div className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600 px-1">
                      <span>В сети</span>
                      <ToggleRight className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-500 px-1">
                      <span>Стоп-лист</span>
                      <ToggleLeft className="h-4 w-4" />
                    </div>
                  )}
                </button>
              </div>

              {/* Price Tag */}
              <div className="z-10 bg-white/95 border border-slate-200 px-2.5 py-1 rounded-xl self-start text-[#E11D48] font-bold text-xs font-mono shadow-sm">
                {item.price} ₽
              </div>
            </div>

            {/* Card Info */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-base text-slate-900 leading-tight">
                  {item.name}
                </h4>
                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Display products in Set or Ingredients for Single Products */}
              <div className="pt-2 border-t border-dashed border-slate-100 text-[11px]">
                {item.type === 'set' && item.subItems && (
                  <div className="space-y-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider block">Состав сета:</span>
                    <ul className="text-slate-700 font-semibold space-y-0.5 list-disc pl-3">
                      {item.subItems.map((si, idx) => (
                        <li key={idx} className="truncate">
                          {si.name} — <span className="text-[#E11D48]">{si.quantity} шт</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.type === 'product' && item.ingredients && (
                  <p className="text-slate-600 font-semibold">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">Ингредиенты:</span>{' '}
                    <span className="italic">{item.ingredients.join(', ')}</span>
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  id={`btn-menu-edit-${item.id}`}
                  onClick={() => handleOpenEditModal(item)}
                  className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl transition-all font-semibold text-xs flex items-center justify-center space-x-1 shadow-sm"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Правка</span>
                </button>
                <button
                  id={`btn-menu-delete-${item.id}`}
                  onClick={() => onDeleteItem(item)}
                  className="px-3 py-2 bg-white hover:bg-rose-50 text-slate-500 hover:text-[#E11D48] border border-slate-200 rounded-xl transition-all font-semibold text-xs shadow-sm"
                  title="Удалить блюдо"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            {/* Modal Head */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800">
              <h3 className="text-lg font-black tracking-tight">
                {editingItem ? 'Редактировать блюдо' : 'Добавить блюдо в меню'}
              </h3>
              <button
                id="btn-form-close"
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 font-semibold text-xs"
              >
                Закрыть
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Название позиции *</label>
                <input
                  id="inp-form-name"
                  type="text"
                  required
                  placeholder="Например: Ролл Филадельфия Люкс"
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#E11D48]"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              {/* Row: Type and Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Тип сущности</label>
                  <select
                    id="select-form-type"
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#E11D48]"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as MenuItemType)}
                  >
                    <option value="product">Одиночный Ролл/Суши/Напиток</option>
                    <option value="set">Большой Сет (Комбо)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Категория</label>
                  <select
                    id="select-form-category"
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#E11D48]"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MenuCategory)}
                  >
                    <option value="sets">Сеты</option>
                    <option value="rolls">Роллы</option>
                    <option value="sushi">Суши и Гунканы</option>
                    <option value="drinks">Напитки</option>
                    <option value="desserts">Десерты</option>
                  </select>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Цена продажи (рублей) *</label>
                <input
                  id="inp-form-price"
                  type="number"
                  required
                  min="1"
                  placeholder="Например: 550"
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#E11D48]"
                  value={formPrice || ''}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Описание блюда</label>
                <textarea
                  id="txt-form-desc"
                  rows={2}
                  placeholder="Краткое описание для сайта и операторов"
                  className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#E11D48]"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* Image Selection / Uploader */}
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase">Изображение блюда</label>
                
                {formImageUrl && (
                  <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 mb-2">
                    <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 text-[10px] font-bold"
                    >
                      Удалить
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-2">
                  <input
                    id="inp-form-image-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormImageUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400 font-semibold">Или URL:</span>
                    <input
                      id="inp-form-image-url"
                      type="text"
                      placeholder="https://example.com/sushi.jpg"
                      className="flex-1 px-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white"
                      value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Conditional parameters */}
              {formType === 'product' ? (
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="text-xs font-bold text-slate-400 uppercase">Ингредиенты (через запятую)</label>
                  <input
                    id="inp-form-ingredients"
                    type="text"
                    placeholder="Лосось, Сливочный сыр, Огурец, Кунжут"
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#E11D48] bg-white mt-1"
                    value={formIngredients}
                    onChange={(e) => setFormIngredients(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block leading-normal">Поможет поварам сразу видеть из чего готовить блюдо.</span>
                </div>
              ) : (
                <div className="space-y-1 bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                  <label className="text-xs font-bold text-slate-400 uppercase">Роллы входящие в сет (Название:Количество, через запятую)</label>
                  <input
                    id="inp-form-subitems"
                    type="text"
                    placeholder="Филадельфия классик:8, Калифорния с крабом:8, Суши Сяке:4"
                    className="w-full px-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#E11D48] bg-white mt-1"
                    value={formSubItemsText}
                    onChange={(e) => setFormSubItemsText(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block leading-normal">Пример ввода: Филадельфия классик:8, Калифорния с крабом:8.</span>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  id="btn-form-abort"
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Отмена
                </button>
                <button
                  id="btn-form-save"
                  type="submit"
                  className="px-4 py-2 bg-[#E11D48] hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
                >
                  {editingItem ? 'Сохранить изменения' : 'Добавить блюдо'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
