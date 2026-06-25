import { TimelineStep } from '../types';

interface OrderTimelineProps {
  steps: TimelineStep[];
}

export default function OrderTimeline({ steps }: OrderTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <div className="px-5 py-4">
      {/* Горизонтальный таймлайн */}
      <div className="flex items-center justify-between gap-1">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex flex-col items-center flex-1 min-w-0">
            {/* Кружок с иконкой */}
            <div className="relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
                  step.isCurrent
                    ? 'bg-[#E11D48] text-white shadow-lg shadow-rose-200 animate-pulse2'
                    : step.isCompleted
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-slate-300'
                }`}
              >
                {step.isCompleted ? (
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-xs leading-none">{step.icon}</span>
                )}
              </div>
            </div>

            {/* Подпись */}
            <span
              className={`mt-1.5 text-[10px] font-bold leading-tight text-center select-none transition-colors duration-500 ${
                step.isCurrent
                  ? 'text-[#E11D48]'
                  : step.isCompleted
                    ? 'text-emerald-700'
                    : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Соединительные линии между кружками */}
      <div className="relative h-0.5 -mt-[28px] mx-[20px] pointer-events-none">
        <div className="absolute inset-0 bg-slate-200 rounded-full" />
        {/* Active progress line */}
        {(() => {
          const completedCount = steps.filter(s => s.isCompleted).length;
          const currentIdx = steps.findIndex(s => s.isCurrent);
          const activeCount = currentIdx >= 0 ? Math.max(completedCount, currentIdx) : completedCount;
          const segments = steps.length - 1;
          if (activeCount <= 0) return null;
          const widthPct = (activeCount / segments) * 100;
          return (
            <div
              className="absolute inset-y-0 left-0 bg-[#E11D48] rounded-full transition-all duration-700"
              style={{ width: `${widthPct}%` }}
            />
          );
        })()}
      </div>
    </div>
  );
}
