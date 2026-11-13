import React from 'react';
import { Order } from '../types';
import { Check } from 'lucide-react';

export const PREP_STAGES: {
  key: NonNullable<Order['productionStage']>;
  label: string;
}[] = [
  { key: 'queued', label: 'مسجّل' },
  { key: 'preparing', label: 'التحضير' },
  { key: 'packed', label: 'وزن وتعبئة' },
  { key: 'out_for_delivery', label: 'في الطريق' },
  { key: 'delivered', label: 'تم التسليم' },
];

interface OrderPrepTimelineProps {
  order: Order;
  compact?: boolean;
}

export const OrderPrepTimeline: React.FC<OrderPrepTimelineProps> = ({
  order,
  compact = false,
}) => {
  if (order.status === 'X') {
    return (
      <div className="text-[11px] font-semibold text-[#b86157]">
        تم إلغاء هذا الطلب.
      </div>
    );
  }

  if (order.status === 'W') {
    return (
      <div className="text-[11px] font-semibold text-[#c89a56]">
        في قائمة الانتظار — يبدأ التحضير بعد تأكيد توفر السعة اليومية.
      </div>
    );
  }

  const stageKey = order.productionStage ?? 'queued';
  const currentIdx = Math.max(
    0,
    PREP_STAGES.findIndex((s) => s.key === stageKey)
  );

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="grid grid-cols-5 gap-1.5 items-start">
        {PREP_STAGES.map((stage, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <div key={stage.key} className="flex flex-col items-center text-center gap-1.5">
              <div className="w-full flex items-center">
                <div
                  className={`h-[2px] flex-1 ${
                    idx === 0
                      ? 'bg-transparent'
                      : idx <= currentIdx
                        ? 'bg-[#c8a96e]'
                        : 'bg-[#232329]'
                  }`}
                />
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums border shrink-0 transition-colors ${
                    done
                      ? 'bg-[#c8a96e] border-[#c8a96e] text-[#141108]'
                      : active
                        ? 'bg-[#1c1a15] border-[#c8a96e] text-[#e6d1a3]'
                        : 'bg-[#18181c] border-[#232329] text-[#66645e]'
                  }`}
                >
                  {done ? <Check className="w-3 h-3" /> : idx + 1}
                </div>
                <div
                  className={`h-[2px] flex-1 ${
                    idx === PREP_STAGES.length - 1
                      ? 'bg-transparent'
                      : idx < currentIdx
                        ? 'bg-[#c8a96e]'
                        : 'bg-[#232329]'
                  }`}
                />
              </div>

              <span
                className={`text-[10px] leading-tight ${
                  active
                    ? 'text-[#e6d1a3] font-bold'
                    : done
                      ? 'text-[#f3f1ec] font-medium'
                      : 'text-[#66645e]'
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
