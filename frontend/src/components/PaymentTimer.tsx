import { useEffect, useState } from 'react';

interface PaymentTimerProps {
  /** Оставшееся время в миллисекундах */
  timeRemaining: number;
  /** Истекло ли время */
  isExpired: boolean;
}

/** Формат MM:SS из миллисекунд */
function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Лаконичный круговой SVG-таймер с анимацией */
export default function PaymentTimer({ timeRemaining, isExpired }: PaymentTimerProps) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const TOTAL_MS = 10 * 60 * 1000; // 10 минут
  const progress = Math.min(1, timeRemaining / TOTAL_MS);
  const dashOffset = circumference * (1 - progress);

  // Цвет: зелёный → жёлтый (при < 2 мин) → красный (при < 1 мин или истекло)
  const getColor = () => {
    if (isExpired || timeRemaining <= 0) return '#EF4444';
    if (timeRemaining < 60_000) return '#EF4444';
    if (timeRemaining < 120_000) return '#F59E0B';
    return '#10B981';
  };

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative w-28 h-28 select-none">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="4"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          />
        </svg>
        {/* Time display centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-xl font-black tracking-tight"
            style={{ color: getColor() }}
          >
            {isExpired ? '00:00' : formatTime(timeRemaining)}
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">
            {isExpired ? 'Истекло' : 'на оплату'}
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500 text-center max-w-[220px] leading-relaxed">
        {isExpired
          ? 'Время оплаты истекло. Заказ будет отменён.'
          : 'Ожидаем подтверждение оплаты от банка'}
      </p>
    </div>
  );
}
