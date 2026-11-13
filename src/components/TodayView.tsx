import React, { useEffect, useState } from 'react';
import { AppState, AppTab } from '../types';
import {
  algiersNow,
  calcCartTotals,
  calcGaps,
  calcNutrition,
  formatArabicDate,
  getNextDelivery,
  round0,
} from '../utils/nutrition';
import { SvgRing } from './SvgRing';
import { MealSlotsSummary } from './MealSlotsSummary';
import { Camera, Clock, Scale, UtensilsCrossed } from 'lucide-react';

interface TodayViewProps {
  state: AppState;
  onNavigate: (tab: AppTab) => void;
  onSelectMealSlot: (slotIdx: number) => void;
  onReopenCalc: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  state,
  onNavigate,
  onSelectMealSlot,
  onReopenCalc,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const res = calcNutrition(state);
  const now = algiersNow();
  const cutoffHour = state.pricingConfig?.cutoffHour ?? 16;
  const dlv = getNextDelivery(cutoffHour);
  const totals = calcCartTotals(state);
  const gaps = calcGaps(state);

  if (res.err) {
    return (
      <div className="space-y-4">
        <div className="text-xs text-[#9b988d]">{formatArabicDate(now.d)}</div>
        <div className="bg-[#1f1412] border border-[#c45d51]/50 rounded-2xl p-4 text-sm text-[#f3f1ec]">
          {res.err}
        </div>
        <button
          type="button"
          onClick={onReopenCalc}
          className="w-full py-3.5 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] cursor-pointer"
        >
          مراجعة الحاسبة العلمية
        </button>
      </div>
    );
  }

  const usedCap = state.ord
    .filter((o) => o.date === dlv.date && o.status === 'C')
    .reduce((acc, o) => acc + o.n, 0);
  const remainingCap = Math.max(0, state.cap - usedCap);
  const latestOrder = state.ord.length > 0 ? state.ord[state.ord.length - 1] : null;

  const hoursLeft = Math.floor(dlv.minutesLeft / 60);
  const minsLeft = dlv.minutesLeft % 60;
  const cutoffLabel = `${String(dlv.cutoffHour).padStart(2, '0')}:00`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#d4a24c]/25 bg-[#241e12]/60 px-4 py-2.5 text-[11px] leading-6 text-[#c9bd9e]">
        <strong className="text-[#e5cf94]">وضع المعاينة:</strong>
        الأرقام والسعة والطلبات هنا للتجربة على هذا الجهاز، وليست اتصالاً مباشراً بالمطبخ أو نظام توصيل.
      </div>

      {/* Greeting & Date */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-xs text-[#9b988d]">
            {formatArabicDate(now.d)} · توقيت الجزائر
          </div>
          <h1 className="text-2xl font-bold text-[#f3f1ec] mt-0.5">
            أهلًا {state.name || 'بك'}
          </h1>
        </div>
        <div className="text-xs text-[#9b988d] tabular-nums">
          سعة المعاينة للغد: <b className="text-[#c9a85c]">{remainingCap}</b> / {state.cap} وجبة
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 space-y-4">
          {/* Next Delivery & Cutoff */}
          <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-[#f3f1ec]">
                التوصيل القادم: {formatArabicDate(dlv.date)}
              </div>
              <div className="text-xs text-[#9b988d] mt-0.5">
                07:00–08:30 صباحًا · استلام مجاني من المطبخ 06:30–08:00
              </div>
            </div>
            <div className="text-left shrink-0">
              {dlv.closedToday ? (
                <div className="text-xs font-bold text-[#c45d51]">
                  أُغلق طلب الغد ({cutoffLabel})
                </div>
              ) : (
                <div>
                  <div className="text-[11px] text-[#9b988d] flex items-center justify-end gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#c9a85c]" />
                    إغلاق الطلبات ({cutoffLabel})
                  </div>
                  <div className="text-sm font-bold text-[#e5cf94] tabular-nums">
                    {hoursLeft}س {minsLeft}د
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hero Ring Card */}
          <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-5 text-center">
            <div className="text-xs font-medium text-[#9b988d] mb-3">
              المتبقي من احتياج اليوم
            </div>
            <SvgRing
              progress={totals.kcal / res.kcal}
              size={196}
              strokeWidth={8}
              color="#c9a85c"
              trackColor="#262b24"
            >
              <div className="text-4xl font-bold text-[#e5cf94] tabular-nums leading-none">
                {round0(gaps.kcal)}
              </div>
              <div className="text-xs text-[#9b988d] mt-1.5 tabular-nums">
                kcal متبقّي
              </div>
            </SvgRing>
            <div className="mt-4 text-xs sm:text-sm text-[#9b988d] tabular-nums">
              جسمك يحتاج <b className="text-[#f3f1ec]">{round0(res.kcal)}</b> · مخطّط{' '}
              <b className="text-[#c9a85c]">{round0(totals.kcal)} kcal</b>
            </div>

            {/* 3 Purposeful Executive Macro Rings */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 pt-5 border-t border-[#262b24]">
              {[
                {
                  label: 'بروتين متبقٍ',
                  planned: totals.p,
                  target: res.fp,
                  rem: gaps.P,
                  ringColor: '#d4a24c',
                },
                {
                  label: 'كارب متبقٍ',
                  planned: totals.c,
                  target: res.C,
                  rem: gaps.C,
                  ringColor: '#5aa882',
                },
                {
                  label: 'دهون متبقية',
                  planned: totals.f,
                  target: res.F,
                  rem: gaps.F,
                  ringColor: '#c97a57',
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-[#191d19] border border-[#262b24] rounded-xl py-3 px-1.5 flex flex-col items-center"
                >
                  <SvgRing
                    progress={m.target > 0 ? m.planned / m.target : 0}
                    size={68}
                    strokeWidth={5}
                    color={m.ringColor}
                    trackColor="#262b24"
                  >
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: m.ringColor }}
                    >
                      {round0(m.rem)}غ
                    </span>
                  </SvgRing>
                  <span className="text-[11px] text-[#9b988d] mt-2 font-medium">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onNavigate('jr')}
              className="bg-[#131613] border border-[#262b24] hover:border-[#c9a85c]/50 rounded-xl p-3 flex flex-col items-center gap-1.5 text-xs font-semibold text-[#f3f1ec] cursor-pointer transition"
            >
              <Scale className="w-4 h-4 text-[#c9a85c]" />
              <span>سجّل وزنك</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="bg-[#131613] border border-[#262b24] hover:border-[#c9a85c]/50 rounded-xl p-3 flex flex-col items-center gap-1.5 text-xs font-semibold text-[#f3f1ec] cursor-pointer transition"
            >
              <UtensilsCrossed className="w-4 h-4 text-[#c9a85c]" />
              <span>وجبات الغد</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('jr')}
              className="bg-[#131613] border border-[#262b24] hover:border-[#c9a85c]/50 rounded-xl p-3 flex flex-col items-center gap-1.5 text-xs font-semibold text-[#f3f1ec] cursor-pointer transition"
            >
              <Camera className="w-4 h-4 text-[#c9a85c]" />
              <span>صور التقدم</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          {state.meals.length === 0 ? (
            <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-4 space-y-3">
              <div className="text-sm font-bold text-[#f3f1ec]">لم تخطّط وجبات الغد بعد</div>
              <p className="text-xs text-[#9b988d] leading-relaxed">
                اختر أطباقًا محسوبة للوجبة الصباحية وبعد التمرين والعشاء قبل إغلاق الساعة {cutoffLabel}.
              </p>
              <button
                type="button"
                onClick={() => onSelectMealSlot(0)}
                className="w-full py-3 rounded-xl font-bold text-sm text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] cursor-pointer"
              >
                ابدأ بالوجبة الأولى
              </button>
            </div>
          ) : gaps.P > 5 || gaps.C > 10 || gaps.F > 5 || gaps.kcal > 80 ? (
            <div className="bg-[#131613] border border-[#c9a85c]/40 rounded-2xl p-4 space-y-2.5">
              <div className="text-sm font-bold text-[#e5cf94]">ما زال ينقصك لإتمام الهدف</div>
              <p className="text-xs text-[#f3f1ec] leading-relaxed tabular-nums">
                {gaps.P > 5 && <span className="text-[#d4a24c]">بروتين {round0(gaps.P)} غ · </span>}
                {gaps.C > 10 && <span className="text-[#5aa882]">كارب {round0(gaps.C)} غ · </span>}
                {gaps.F > 5 && <span className="text-[#c97a57]">دهون {round0(gaps.F)} غ · </span>}
                <span className="text-[#e5cf94] font-bold">سعرات {round0(gaps.kcal)} kcal</span>
              </p>
              <button
                type="button"
                onClick={() => onNavigate('menu')}
                className="w-full py-2.5 rounded-xl bg-[#191d19] border border-[#262b24] hover:border-[#c9a85c]/50 text-xs font-bold text-[#e5cf94] cursor-pointer"
              >
                أكمل الفجوة من القائمة
              </button>
            </div>
          ) : (
            <div className="bg-[#131613] border border-[#5aa882]/50 rounded-2xl p-4">
              <div className="text-sm font-bold text-[#5aa882]">
                مخطّط وجباتك متوازن مع احتياجك اليومي
              </div>
              <p className="text-xs text-[#9b988d] mt-1">
                يمكنك مراجعة التوزيع وتأكيد الطلب من السلة قبل الساعة {cutoffLabel}.
              </p>
            </div>
          )}

          {/* Daily Meal Distribution */}
          <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#f3f1ec]">توزيع وجبات اليوم</h2>
              <button
                type="button"
                onClick={() => onNavigate('cart')}
                className="text-xs font-bold text-[#c9a85c] hover:underline cursor-pointer"
              >
                فتح السلة
              </button>
            </div>
            <MealSlotsSummary state={state} onSelectSlot={onSelectMealSlot} />
          </div>

          {latestOrder && (
            <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-[#9b988d]">آخر طلب تجريبي محفوظ</div>
                <span
                  className={`text-xs font-bold ${
                    latestOrder.status === 'C'
                      ? 'text-[#5aa882]'
                      : latestOrder.status === 'W'
                        ? 'text-[#d4a24c]'
                        : 'text-[#c45d51]'
                  }`}
                >
                  {latestOrder.status === 'C'
                    ? 'محفوظ محلياً · غير مرسل'
                    : latestOrder.status === 'W'
                      ? 'انتظار تجريبي · غير مرسل'
                      : 'ملغى محلياً'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-sm font-bold text-[#f3f1ec]">
                  {formatArabicDate(latestOrder.date)} · {latestOrder.n} وجبات
                </div>
                <div className="text-sm font-bold text-[#e5cf94] tabular-nums">
                  {latestOrder.total} دج
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
