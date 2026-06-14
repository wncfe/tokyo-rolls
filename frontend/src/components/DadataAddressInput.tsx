import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { suggestAddress, DaDataSuggestion } from '../utils/dadata';

interface DadataAddressInputProps {
  value: string;
  onChange: (address: string) => void;
}

export default function DadataAddressInput({
  value,
  onChange,
}: DadataAddressInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<DaDataSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Синхронизировать внешнее значение (например, при очистке из родителя)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Закрыть выпадашку при клике снаружи
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced запрос к DaData
  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      const results = await suggestAddress(q);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setHighlightIndex(-1);
      setIsLoading(false);
    }, 300);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    onChange(v); // Сразу синхронизируем в родительский стейт (ручной ввод)
    fetchSuggestions(v);
  };

  const handleSelect = (suggestion: DaDataSuggestion) => {
    setInputValue(suggestion.value);
    onChange(suggestion.value); // Лаконичная версия: «г Пермь, ул Ленина, д 1»
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1,
      );
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Поле ввода */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Введите адрес доставки"
          className="w-full pl-9 pr-10 py-3 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
      </div>

      {/* Выпадашка с подсказками */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50">
          {suggestions.map((s, idx) => (
            <button
              key={s.value}
              type="button"
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer border-b border-slate-50 last:border-b-0 ${
                idx === highlightIndex
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="block truncate">{s.value}</span>
            </button>
          ))}
          {/* Powered by DaData */}
          <div className="px-4 py-1.5 bg-slate-50/50 border-t border-slate-100">
            <span className="text-[9px] text-slate-400 font-mono select-none">
              Подсказки —{' '}
              <a
                href="https://dadata.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-slate-700 underline underline-offset-2"
              >
                DaData.ru
              </a>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
