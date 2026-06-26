import {
  ClipboardList,
  CreditCard,
  ChefHat,
  Truck,
  CheckCircle2,
  Package,
  CircleDot,
  type LucideIcon,
} from 'lucide-react';
import { TimelineStep } from '../types';

const ICON_MAP: Record<string, LucideIcon> = {
  ClipboardList,
  CreditCard,
  ChefHat,
  Truck,
  CheckCircle2,
  Package,
  CircleDot,
};

interface OrderTimelineProps {
  steps: TimelineStep[];
  statusLabel: string;
  status: string;
  estimatedMinutes: number;
}

export default function OrderTimeline({
  steps,
  statusLabel,
  status,
  estimatedMinutes,
}: OrderTimelineProps) {
  if (steps.length === 0) return null;

  // Цвет бара — от текущего статуса (как в виджете)
  const barColor = getColorByStatus(status);

  // Ширина бара — на основе позиции шагов, а не статического прогресса
  const currentIdx = steps.findIndex(s => s.isCurrent);
  const completedCount = steps.filter(s => s.isCompleted).length;
  const segments = steps.length - 1;
  let barWidth = 0;
  if (status === 'cancelled') {
    barWidth = 0;
  } else if (completedCount >= segments) {
    barWidth = 100;
  } else if (currentIdx >= 0) {
    // Бар идёт ровно до центра текущего кружка
    barWidth = (currentIdx / segments) * 100;
  } else {
    barWidth = (completedCount / segments) * 100;
  }

  return (
    <div className="px-5 py-6">
      {/* Badge статуса */}
      <div className="flex justify-center mb-6">
        <span
          className="inline-block px-5 py-1.5 rounded-full text-sm font-black tracking-tight text-white select-none shadow-sm"
          style={{ backgroundColor: barColor }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Бар с шариками */}
      <div className="relative h-10">
        {/* Фоновая линия (серая) */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-100 rounded-full" />

        {/* Заполненная линия */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
          style={{ width: `${barWidth}%`, backgroundColor: barColor }}
        >
          {/* Shimmer на активной части */}
          {barWidth > 0 && barWidth < 100 && (
            <div className="absolute inset-0 animate-shimmer" />
          )}
        </div>

        {/* Шарики с иконками — на линии */}
        <div className="absolute inset-0 flex items-center justify-between">
          {steps.map((step) => {
            const IconComp = ICON_MAP[step.iconName];
            return (
              <div key={step.key} className="flex flex-col items-center relative" style={{ zIndex: 1 }}>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 bg-white transition-all duration-500 ${
                    step.isCurrent ? 'shadow-lg' : ''
                  }`}
                  style={{
                    borderColor: step.isCompleted || step.isCurrent ? barColor : '#E2E8F0',
                    boxShadow: step.isCurrent
                      ? `0 0 0 4px ${barColor}22, 0 4px 12px ${barColor}44`
                      : 'none',
                  }}
                >
                  {IconComp && (
                    <IconComp
                      className="w-4.5 h-4.5"
                      style={{
                        color: step.isCompleted || step.isCurrent ? barColor : '#94A3B8',
                      }}
                      strokeWidth={2.5}
                    />
                  )}
                </div>
                {/* Подпись под шариком */}
                <span
                  className={`absolute -bottom-5 text-[10px] font-bold text-center select-none whitespace-nowrap transition-colors duration-500 ${
                    step.isCurrent
                      ? 'text-slate-900'
                      : step.isCompleted
                        ? 'text-slate-500'
                        : 'text-slate-300'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Примерное время */}
      {estimatedMinutes > 0 && (
        <p className="mt-8 text-center text-sm font-medium text-slate-400 select-none">
          ~{estimatedMinutes} мин
        </p>
      )}
    </div>
  );
}

/** Цвет бара по статусу (в одной палитре с виджетом). */
function getColorByStatus(status: string): string {
  switch (status) {
    case 'unpaid':
    case 'awaiting_payment':
      return '#EF4444';  // red
    case 'pending':
    case 'confirmed':
      return '#F59E0B';  // amber
    case 'preparing':
      return '#EA580C';  // orange
    case 'delivering':
    case 'ready':
      return '#3B82F6';  // blue
    case 'delivered':
    case 'completed':
      return '#10B981';  // green
    default:
      return '#6B7280';  // gray
  }
}
