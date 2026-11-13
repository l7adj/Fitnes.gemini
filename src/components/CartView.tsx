import React, { useState } from 'react';
import { DEFAULT_MEAL_NAMES, DEFAULT_PRICING } from '../data/seed';
import { AppState, AppTab, Order } from '../types';
import {
  autoDistributeMeals,
  calcCartPrice,
  calcCartTotals,
  calcNutrition,
  cartItemMacros,
  clamp,
  formatArabicDate,
  getBlockedAllergensForDish,
  getBlockedAllergensForFood,
  getMealSlotName,
  getNextDelivery,
  getSelectedZone,
  round0,
  round1,
} from '../utils/nutrition';
import { MealSlotsSummary } from './MealSlotsSummary';
import { CheckCircle2, Clock, Minus, Plus, Sparkles, Trash2 } from 'lucide-react';

interface CartViewProps {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onNavigate: (tab: AppTab) => void;
  onSelectMealSlot: (slotIdx: number) => void;
  onToast: (msg: string, undo?: () => void) => void;
}

export const CartView: React.FC<CartViewProps> = ({
  state,
  onUpdate,
  onNavigate,
  onSelectMealSlot,
  onToast,
}) => {
  const [confirmModal, setConfirmModal] = useState<Order | null>(null);
  const res = calcNutrition(state);
  const totals = calcCartTotals(state);
  const pricingCfg = state.pricingConfig || DEFAULT_PRICING;
  const dlv = getNextDelivery(pricingCfg.cutoffHour);
  const selectedZone = getSelectedZone(state);
  const activeZones = state.zones.filter((z) => z.active);
  const zoneOptions = activeZones.length > 0 ? activeZones : state.zones;
  const pricing = calcCartPrice(totals.price, state.n, selectedZone.fee, pricingCfg);

  if (res.err) {
    return (
      <div className="bg-[#1f1412] border border-[#c45d51]/50 rounded-2xl p-4 text-sm text-[#f3f1ec]">
        {res.err}
      </div>
    );
  }

  const removeItem = (uid: string) => {
    const backup = [...state.meals];
    onUpdate((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.uid !== uid),
    }));
    onToast('حُذف الصنف من السلة', () => {
      onUpdate((prev) => ({ ...prev, meals: backup }));
    });
  };

  const handleAutoDistribute = () => {
    onUpdate((prev) => ({
      ...prev,
      meals: autoDistributeMeals(prev.meals, prev.n, prev.foods, prev.dishes),
    }));
    onToast('تم توزيع الأصناف تلقائيًا على وجبات اليوم');
  };

  const updateMealName = (slotIdx: number, newName: string) => {
    onUpdate((prev) => {
      const names = [...(prev.mealNames || DEFAULT_MEAL_NAMES)];
      while (names.length < 5) {
        names.push(DEFAULT_MEAL_NAMES[names.length] || `الوجبة ${names.length + 1}`);
      }
      names[slotIdx] = newName;
      return { ...prev, mealNames: names };
    });
  };

  const handlePlaceOrder = () => {
    if (state.meals.length === 0) {
      onToast('السلة فارغة؛ أضف وجباتك أولاً');
      return;
    }

    const emptySlot = Array.from({ length: state.n }, (_, slot) => slot).find(
      (slot) => !state.meals.some((item) => clamp(item.slot || 0, 0, state.n - 1) === slot)
    );
    if (emptySlot !== undefined) {
      onToast(`أكمل ${getMealSlotName(state, emptySlot)} قبل حفظ الطلب التجريبي`);
      return;
    }

    for (const m of state.meals) {
      if (m.kind === 'food') {
        const f = state.foods.find((x) => x.id === m.id);
        if (!f) {
          onToast('أحد المكونات لم يعد موجودًا في القائمة؛ احذفه ثم أعد اختياره');
          return;
        }
        if (f.available === false) {
          onToast(`الصنف "${f.name}" لم يعد متوفرًا اليوم`);
          return;
        }
        if (getBlockedAllergensForFood(f, state.al).length > 0) {
          onToast('تحتوي السلة على مكوّن يسبب لك حساسية');
          return;
        }
      } else if (m.kind === 'dish') {
        const d = state.dishes.find((x) => x.id === m.id);
        if (!d) {
          onToast('أحد الأطباق لم يعد موجودًا في القائمة؛ احذفه ثم أعد اختياره');
          return;
        }
        if (d.available === false) {
          onToast(`الطبق "${d.name}" لم يعد متوفرًا اليوم`);
          return;
        }
        if (d.ing.some(([foodId]) => !state.foods.some((food) => food.id === foodId))) {
          onToast('توجد مكونات ناقصة في أحد الأطباق؛ راجع قائمة الطعام');
          return;
        }
        if (d.ing.some(([foodId]) => state.foods.find((food) => food.id === foodId)?.available === false)) {
          onToast('أحد مكونات الطبق غير متوفر اليوم');
          return;
        }
        if (getBlockedAllergensForDish(d, state.foods, state.al).length > 0) {
          onToast('تحتوي السلة على طبق يسبب لك حساسية');
          return;
        }
      } else {
        const ingredients = m.ing || [];
        if (ingredients.length === 0) {
          onToast('توجد وجبة مخصصة بلا مكونات؛ أكملها أو احذفها');
          return;
        }
        for (const [foodId] of ingredients) {
          const food = state.foods.find((x) => x.id === foodId);
          if (!food || food.available === false) {
            onToast('توجد مكونات مخصصة غير متاحة؛ راجع الوجبة');
            return;
          }
          if (getBlockedAllergensForFood(food, state.al).length > 0) {
            onToast('تحتوي إحدى الوجبات المخصصة على مسبب حساسية مسجل لديك');
            return;
          }
        }
      }
    }

    const usedMeals = state.ord
      .filter((o) => o.date === dlv.date && o.status === 'C')
      .reduce((acc, o) => acc + o.n, 0);
    const status: 'C' | 'W' = usedMeals + state.n > state.cap ? 'W' : 'C';

    const items = state.meals.map((m) => {
      const mac = cartItemMacros(m, state.foods, state.dishes);
      const slotIdx = clamp(m.slot || 0, 0, state.n - 1);
      let label = m.name || 'وجبة مخصصة';
      if (m.kind === 'food') {
        label = state.foods.find((x) => x.id === m.id)?.name || 'مكوّن';
      } else if (m.kind === 'dish') {
        label = state.dishes.find((x) => x.id === m.id)?.name || 'طبق';
      }
      return {
        label,
        grams: round0(mac.grams),
        kcal: round0(mac.kcal),
        p: round0(mac.p),
        slot: slotIdx,
        slotName: getMealSlotName(state, slotIdx),
        rawIngredients: mac.rawIngredients,
      };
    });

    const newOrder: Order = {
      id: `NF-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      date: dlv.date,
      n: state.n,
      zoneTitle: selectedZone.title,
      zoneFee: selectedZone.fee,
      note: state.orderNote.trim(),
      ingCost: pricing.ing,
      handling: pricing.handling,
      service: pricing.service,
      total: pricing.total,
      kcal: round0(totals.kcal),
      p: round0(totals.p),
      c: round0(totals.c),
      f: round0(totals.f),
      status,
      productionStage: status === 'C' ? 'queued' : undefined,
      items,
    };

    onUpdate((prev) => ({
      ...prev,
      ord: [...prev.ord, newOrder],
      meals: [],
      orderNote: '',
    }));
    setConfirmModal(newOrder);
  };

  const cutoffLabel = `${String(dlv.cutoffHour).padStart(2, '0')}:00`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f3f1ec]">السلة وتأكيد الطلب</h1>
        {state.meals.length > 0 && (
          <button
            type="button"
            onClick={handleAutoDistribute}
            className="px-3 py-1.5 rounded-xl bg-[#191d19] border border-[#c9a85c]/40 text-xs font-bold text-[#e5cf94] flex items-center gap-1.5 cursor-pointer hover:bg-[#242117]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            توازن تلقائي
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[#d4a24c]/30 bg-[#241e12]/70 px-4 py-3 text-[11px] leading-6 text-[#d8cba9]" role="status">
        <strong className="text-[#e5cf94]">نسخة معاينة:</strong>
        يمكنك اختبار توزيع الوجبات والتكلفة وحفظ طلب تجريبي على هذا الجهاز فقط.
        لا يُرسل الطلب إلى مطبخ فعلي ولا يحجز موعد توصيل.
      </div>

      {state.meals.length === 0 ? (
        <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-8 text-center space-y-3">
          <div className="text-sm font-bold text-[#f3f1ec]">سلة وجبات الغد فارغة</div>
          <p className="text-xs text-[#9b988d]">
            اختر أطباقًا مختلفة للوجبة الصباحية وبعد التمرين والعشاء من القائمة.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('menu')}
            className="px-6 py-3 rounded-xl font-bold text-sm text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] cursor-pointer"
          >
            تصفح الوجبات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Macro Bars + Daily Meal Sections */}
          <div className="lg:col-span-7 space-y-4">
            {/* Purposeful Executive Macro Bars */}
            <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-4 space-y-2.5">
              {[
                { label: 'سعرات', val: totals.kcal, target: res.kcal, barColor: '#c9a85c', unit: '' },
                { label: 'بروتين', val: totals.p, target: res.fp, barColor: '#d4a24c', unit: 'غ' },
                { label: 'كارب', val: totals.c, target: res.C, barColor: '#5aa882', unit: 'غ' },
                { label: 'دهون', val: totals.f, target: res.F, barColor: '#c97a57', unit: 'غ' },
              ].map((b) => {
                const pct = b.target > 0 ? clamp((b.val / b.target) * 100, 0, 100) : 0;
                return (
                  <div key={b.label} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-[#9b988d] font-medium">{b.label}</span>
                    <div className="flex-1 h-1.5 bg-[#262b24] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: b.barColor }}
                      />
                    </div>
                    <span className="w-24 text-left font-bold text-[#f3f1ec] tabular-nums">
                      {round0(b.val)} / {round0(b.target)}{b.unit}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Daily Meals Count Control */}
            <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#f3f1ec]">تقسيم وجبات اليوم</div>
                <div className="text-xs text-[#9b988d] mt-0.5">
                  كل وجبة لها أطباقها الخاصة (صباحية، بعد التمرين، عشاء...)
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={state.n <= 1}
                  onClick={() => {
                    const nextN = Math.max(1, state.n - 1);
                    onUpdate((prev) => ({
                      ...prev,
                      n: nextN,
                      activeSlot: Math.min(prev.activeSlot ?? 0, nextN - 1),
                      meals: prev.meals.map((m) => ({
                        ...m,
                        slot: Math.min(m.slot, nextN - 1),
                      })),
                    }));
                  }}
                  className="w-9 h-9 rounded-xl bg-[#191d19] border border-[#262b24] flex items-center justify-center text-[#f3f1ec] disabled:opacity-35 cursor-pointer"
                  aria-label="تقليل وجبة"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-[#e5cf94] tabular-nums w-8 text-center">
                  {state.n}
                </span>
                <button
                  type="button"
                  disabled={state.n >= 5}
                  onClick={() =>
                    onUpdate((prev) => ({ ...prev, n: Math.min(5, prev.n + 1) }))
                  }
                  className="w-9 h-9 rounded-xl bg-[#191d19] border border-[#262b24] flex items-center justify-center text-[#f3f1ec] disabled:opacity-35 cursor-pointer"
                  aria-label="إضافة وجبة"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grouped by Distinct Daily Meal */}
            <div className="space-y-3">
              {Array.from({ length: state.n }, (_, slotIdx) => {
                const slotMeals = state.meals.filter(
                  (m) => clamp(m.slot || 0, 0, state.n - 1) === slotIdx
                );
                const slotTotals = slotMeals.reduce(
                  (acc, m) => {
                    const mac = cartItemMacros(m, state.foods, state.dishes);
                    acc.kcal += mac.kcal;
                    acc.p += mac.p;
                    acc.price += mac.price;
                    return acc;
                  },
                  { kcal: 0, p: 0, price: 0 }
                );

                return (
                  <div
                    key={slotIdx}
                    className="bg-[#131613] border border-[#262b24] rounded-2xl p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#262b24]">
                      <input
                        type="text"
                        value={getMealSlotName(state, slotIdx)}
                        onChange={(e) => updateMealName(slotIdx, e.target.value)}
                        className="bg-transparent text-sm font-bold text-[#e5cf94] focus:outline-none focus:border-b focus:border-[#c9a85c] min-w-0 flex-1"
                        aria-label={`اسم الوجبة ${slotIdx + 1}`}
                      />
                      <div className="text-xs text-[#9b988d] tabular-nums shrink-0">
                        {round0(slotTotals.kcal)} kcal · <span className="text-[#d4a24c]">P{round0(slotTotals.p)}</span>
                      </div>
                    </div>

                    {slotMeals.length === 0 ? (
                      <div className="flex items-center justify-between py-2 text-xs text-[#68665d]">
                        <span>لا توجد أصناف مخصصة لهذه الوجبة بعد.</span>
                        <button
                          type="button"
                          onClick={() => onSelectMealSlot(slotIdx)}
                          className="text-[#c9a85c] font-semibold hover:underline cursor-pointer"
                        >
                          + أضف طبقًا
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#262b24]">
                        {slotMeals.map((m) => {
                          const mac = cartItemMacros(m, state.foods, state.dishes);
                          let name = m.name || 'وجبة مخصصة';
                          let isJuice = false;
                          if (m.kind === 'food') {
                            const f = state.foods.find((x) => x.id === m.id);
                            if (f) {
                              name = f.name;
                              isJuice = f.cat === 'juice';
                            }
                          } else if (m.kind === 'dish') {
                            const d = state.dishes.find((x) => x.id === m.id);
                            if (d) {
                              name = d.name;
                            }
                          }

                          return (
                            <div
                              key={m.uid}
                              className="py-2.5 flex flex-wrap sm:flex-nowrap items-center gap-2"
                            >
                              <div className="flex-1 min-w-[140px]">
                                <div className="text-xs sm:text-sm font-semibold text-[#f3f1ec]">
                                  {name}
                                </div>
                                <div className="text-[11px] text-[#9b988d] tabular-nums mt-0.5">
                                  {round0(mac.kcal)} kcal ·{' '}
                                  <span className="text-[#d4a24c]">P{round0(mac.p)}</span>{' '}
                                  <span className="text-[#5aa882]">C{round0(mac.c)}</span>{' '}
                                  <span className="text-[#c97a57]">F{round0(mac.f)}</span> ·{' '}
                                  <span className="text-[#c9a85c] font-bold">{round1(mac.price)} دج</span>
                                </div>
                              </div>

                              {m.kind === 'food' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={m.grams || 0}
                                    onChange={(e) => {
                                      const g = Math.max(0, parseFloat(e.target.value) || 0);
                                      onUpdate((prev) => ({
                                        ...prev,
                                        meals: prev.meals.map((item) =>
                                          item.uid === m.uid ? { ...item, grams: g } : item
                                        ),
                                      }));
                                    }}
                                    className="w-16 bg-[#191d19] border border-[#262b24] rounded-lg px-2 py-1 text-center text-xs text-[#f3f1ec] tabular-nums"
                                  />
                                  <span className="text-[11px] text-[#68665d]">
                                    {isJuice ? 'مل' : 'غ'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-[#9b988d] px-2 tabular-nums">
                                  {m.kind === 'dish'
                                    ? m.mult === 0.75
                                      ? 'حصة خفيفة'
                                      : m.mult === 1.5
                                        ? 'حصة كبيرة'
                                        : 'حصة قياسية'
                                    : `${round0(mac.grams)}غ`}
                                </span>
                              )}

                              <select
                                value={slotIdx}
                                onChange={(e) => {
                                  const nextSlot = Number(e.target.value);
                                  onUpdate((prev) => ({
                                    ...prev,
                                    meals: prev.meals.map((item) =>
                                      item.uid === m.uid ? { ...item, slot: nextSlot } : item
                                    ),
                                  }));
                                }}
                                className="bg-[#191d19] border border-[#262b24] rounded-lg px-2 py-1.5 text-[11px] text-[#f3f1ec] max-w-[135px]"
                              >
                                {Array.from({ length: state.n }, (_, s) => (
                                  <option key={s} value={s}>
                                    {getMealSlotName(state, s)}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => removeItem(m.uid)}
                                className="p-1.5 text-[#9b988d] hover:text-[#c45d51] rounded-lg cursor-pointer"
                                aria-label="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-4">
              <div className="text-sm font-bold text-[#f3f1ec] mb-3">ملخص توزيع اليوم</div>
              <MealSlotsSummary state={state} onSelectSlot={onSelectMealSlot} />
            </div>
          </div>

          {/* Right Column: Delivery Zone, Note & Transparent Invoice */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-4 space-y-4">
              <div>
                <div className="text-sm font-bold text-[#f3f1ec] mb-2">منطقة التوصيل أو الاستلام</div>
                <div className="space-y-2">
                  {zoneOptions.map((z) => {
                    const active = selectedZone.id === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => onUpdate((prev) => ({ ...prev, zoneId: z.id }))}
                        className={`w-full text-right p-3 rounded-xl border transition cursor-pointer ${
                          active
                            ? 'bg-[#242117] border-[#c9a85c]'
                            : 'bg-[#191d19] border-[#262b24] hover:border-[#c9a85c]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-[#f3f1ec]">{z.title}</span>
                          <span className="text-[#c9a85c] tabular-nums">
                            {z.fee === 0 ? 'مجاني' : `${z.fee} دج`}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#9b988d] mt-0.5">
                          {z.areas} · {z.hours}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9b988d] mb-1.5">
                  ملاحظة للمطبخ (اختياري)
                </label>
                <input
                  type="text"
                  value={state.orderNote}
                  onChange={(e) =>
                    onUpdate((prev) => ({ ...prev, orderNote: e.target.value }))
                  }
                  placeholder="مثال: قليل الملح، بدون بصل..."
                  className="w-full bg-[#191d19] border border-[#262b24] rounded-xl px-3 py-2.5 text-xs text-[#f3f1ec]"
                />
              </div>

              <div className="pt-3 border-t border-[#262b24] space-y-2 text-xs">
                <div className="text-sm font-bold text-[#f3f1ec] mb-1">تفصيل السعر بشفافية</div>
                <div className="flex justify-between text-[#9b988d]">
                  <span>مكونات بسعر السوق</span>
                  <span className="font-bold text-[#f3f1ec] tabular-nums">{pricing.ing} دج</span>
                </div>
                <div className="flex justify-between text-[#9b988d]">
                  <span>مناولة معلنة ({pricingCfg.handlingPct}%)</span>
                  <span className="font-bold text-[#f3f1ec] tabular-nums">{pricing.handling} دج</span>
                </div>
                <div className="flex justify-between text-[#9b988d]">
                  <span>
                    أجر الخدمة ({pricingCfg.serviceFeePerMeal} دج × {state.n} وجبات)
                  </span>
                  <span className="font-bold text-[#f3f1ec] tabular-nums">{pricing.service} دج</span>
                </div>
                <div className="flex justify-between text-[#9b988d]">
                  <span>التوصيل ({selectedZone.title})</span>
                  <span className="font-bold text-[#f3f1ec] tabular-nums">
                    {pricing.delivery === 0 ? 'مجاني' : `${pricing.delivery} دج`}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2.5 border-t border-[#262b24]">
                  <span className="text-sm font-bold text-[#f3f1ec]">الإجمالي</span>
                  <span className="text-xl font-bold text-[#e5cf94] tabular-nums">
                    {pricing.total} دج
                  </span>
                </div>
              </div>

              <div className="bg-[#191d19] border border-[#262b24] rounded-xl p-3 text-xs text-[#c9a85c] font-medium">
                ربحنا هو أجر الخدمة فقط. الطعام بسعر السوق.
              </div>

              <div className="text-[11px] text-[#9b988d]">
                الدفع عند الاستلام · موعد التوصيل: <b className="text-[#f3f1ec]">{formatArabicDate(dlv.date)}</b>
                {dlv.closedToday && ` (تم تجاوز ${cutoffLabel}، يُرحّل للغد التالي)`}
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
              >
                تأكيد الطلب ({pricing.total} دج)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Orders History */}
      <div className="bg-[#131613] border border-[#262b24] rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-bold text-[#f3f1ec]">طلباتي</h2>
        {state.ord.length === 0 ? (
          <div className="text-xs text-[#68665d]">لا توجد طلبات مسجّلة بعد.</div>
        ) : (
          <div className="space-y-2">
            {[...state.ord].reverse().map((o) => (
              <div
                key={o.id}
                className="bg-[#191d19] border border-[#262b24] rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#f3f1ec]">
                    {formatArabicDate(o.date)} · <span className="text-[#9b988d] tabular-nums">{o.id}</span>
                  </div>
                  <div className="text-[11px] text-[#9b988d] tabular-nums mt-0.5">
                    {o.n} وجبات · {o.zoneTitle} · {o.kcal} kcal ·{' '}
                    <b className="text-[#e5cf94]">{o.total} دج</b>
                  </div>
                  <div
                    className={`text-[11px] font-bold mt-1 ${
                      o.status === 'C'
                        ? 'text-[#5aa882]'
                        : o.status === 'W'
                          ? 'text-[#d4a24c]'
                          : 'text-[#c45d51]'
                    }`}
                  >
                    {o.status === 'C'
                      ? 'مؤكد — في دورة الطبخ المسائية'
                      : o.status === 'W'
                        ? 'قائمة انتظار — الطاقة اليومية ممتلئة'
                        : 'ملغى'}
                  </div>
                </div>
                {o.status !== 'X' && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate((prev) => ({
                        ...prev,
                        ord: prev.ord.map((x) =>
                          x.id === o.id ? { ...x, status: 'X' } : x
                        ),
                      }));
                      onToast('تم إلغاء الطلب');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#4a2b26] bg-[#1f1412] text-xs font-bold text-[#c45d51] cursor-pointer"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#111411] border border-[#c9a85c]/70 rounded-2xl p-6 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center">
              {confirmModal.status === 'C' ? (
                <CheckCircle2 className="w-11 h-11 text-[#5aa882]" />
              ) : (
                <Clock className="w-11 h-11 text-[#d4a24c]" />
              )}
            </div>
            <h3 className="text-lg font-bold text-[#f3f1ec]">
              {confirmModal.status === 'C' ? 'تم حفظ طلبك التجريبي' : 'تم حفظ طلبك في قائمة الانتظار التجريبية'}
            </h3>
            <p className="text-xs text-[#9b988d] leading-relaxed">
              {confirmModal.status === 'C'
                ? `هذا سجل تجريبي محفوظ على هذا الجهاز. لم يُرسل إلى المطبخ ولم يُنشأ توصيل فعلي.`
                : 'هذه محاكاة محلية لقائمة الانتظار؛ لا توجد حالياً خدمة إرسال أو إشعارات للمطبخ.'}
            </p>
            <div className="bg-[#191d19] border border-[#262b24] rounded-xl p-3 text-xs flex justify-between tabular-nums">
              <span className="text-[#9b988d]">رقم الطلب: {confirmModal.id}</span>
              <span className="text-[#e5cf94] font-bold">{confirmModal.total} دج</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmModal(null);
                onNavigate('home');
              }}
              className="w-full py-3 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] cursor-pointer"
            >
              العودة إلى شاشة اليوم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
