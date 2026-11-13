import React from 'react';
import { AppState } from '../types';
import { calcCartTotals, calcNutrition, clamp, round0 } from '../utils/nutrition';

interface GlobalStatusBarProps {
  state: AppState;
}

export const GlobalStatusBar: React.FC<GlobalStatusBarProps> = ({ state }) => {
  const r = calcNutrition(state);
  const t = calcCartTotals(state);

  if (r.err) {
    return (
      <div className="sticky top-0 z-30 bg-[#0b0d0b]/95 backdrop-blur-md border-b border-[#262b24] px-3 py-2.5">
        <div className="max-w-5xl mx-auto text-xs text-[#c45d51] font-semibold truncate">
          {r.err}
        </div>
      </div>
    );
  }

  const cells = [
    {
      label: 'سعرات',
      remaining: Math.max(0, r.kcal - t.kcal),
      target: r.kcal,
      planned: t.kcal,
      color: '#e5cf94',
      barColor: '#c9a85c',
      unit: '',
    },
    {
      label: 'بروتين',
      remaining: Math.max(0, r.fp - t.p),
      target: r.fp,
      planned: t.p,
      color: '#d4a24c',
      barColor: '#d4a24c',
      unit: 'غ',
    },
    {
      label: 'كارب',
      remaining: Math.max(0, r.C - t.c),
      target: r.C,
      planned: t.c,
      color: '#5aa882',
      barColor: '#5aa882',
      unit: 'غ',
    },
    {
      label: 'دهون',
      remaining: Math.max(0, r.F - t.f),
      target: r.F,
      planned: t.f,
      color: '#c97a57',
      barColor: '#c97a57',
      unit: 'غ',
    },
  ];

  return (
    <div className="sticky top-0 z-30 bg-[#0b0d0b]/95 backdrop-blur-md border-b border-[#262b24] px-3 py-2">
      <div className="max-w-5xl mx-auto grid grid-cols-4 gap-1.5 sm:gap-3">
        {cells.map((c) => {
          const pct = c.target > 0 ? clamp((c.planned / c.target) * 100, 0, 100) : 0;
          return (
            <div
              key={c.label}
              className="bg-[#131613] border border-[#262b24] rounded-xl px-2 py-1.5 text-center"
            >
              <div
                className="text-sm sm:text-base font-bold leading-tight tabular-nums"
                style={{ color: c.color }}
              >
                {round0(c.remaining)}
                {c.unit && (
                  <span className="text-[10px] mr-0.5 font-normal text-[#9b988d]">
                    {c.unit}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#9b988d] font-medium truncate">
                {c.label} متبقٍ
              </div>
              <div className="h-[2px] bg-[#262b24] rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: c.barColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
