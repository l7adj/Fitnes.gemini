import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_MEAL_NAMES } from '../data/seed';
import { AppState, AppTab, CartItem, DishItem, FoodItem } from '../types';
import { CATEGORY_LABELS, getDishImage, getFoodImage } from '../utils/media';
import {
  calcCartTotals,
  calcGaps,
  calcNutrition,
  cartItemMacros,
  clamp,
  dishMacros,
  foodMacros,
  formatAllergenList,
  getBlockedAllergensForDish,
  getBlockedAllergensForFood,
  getDominantMacro,
  getFoodGramDefaults,
  getMealSlotName,
  round0,
  round1,
  round2,
} from '../utils/nutrition';
import {
  ArrowRight,
  Check,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';

interface MenuViewProps {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onNavigate: (tab: AppTab) => void;
  onToast: (msg: string) => void;
  pickerRequest?: { slot: number; seq: number } | null;
}

type PortionModalState =
  | { type: 'food'; foodId: string; grams: number; slot: number }
  | { type: 'dish'; dishId: string; mult: number; slot: number }
  | null;

export const MenuView: React.FC<MenuViewProps> = ({
  state,
  onUpdate,
  onNavigate,
  onToast,
  pickerRequest,
}) => {
  const [pickerSlot, setPickerSlot] = useState<number | null>(
    pickerRequest ? pickerRequest.slot : null
  );
  const [pickerTab, setPickerTab] = useState<'ingredients' | 'dishes' | 'juices'>('ingredients');
  const [ingCat, setIngCat] = useState<'all' | 'protein' | 'carb' | 'fat' | 'veg'>('all');
  const [search, setSearch] = useState('');
  const [portionModal, setPortionModal] = useState<PortionModalState>(null);

  useEffect(() => {
    if (pickerRequest) {
      setPickerSlot(pickerRequest.slot);
      setPickerTab('ingredients');
      setIngCat('all');
      setSearch('');
    }
  }, [pickerRequest]);

  const res = calcNutrition(state);
  const gaps = calcGaps(state);
  const cartTotals = calcCartTotals(state);

  const slotSummaries = useMemo(() => {
    return Array.from({ length: state.n }, (_, idx) => {
      const items = state.meals.filter((m) => clamp(m.slot || 0, 0, state.n - 1) === idx);
      const totals = items.reduce(
        (acc, m) => {
          const mac = cartItemMacros(m, state.foods, state.dishes);
          acc.kcal += mac.kcal;
          acc.p += mac.p;
          acc.c += mac.c;
          acc.f += mac.f;
          acc.price += mac.price;
          acc.grams += mac.grams;
          return acc;
        },
        { kcal: 0, p: 0, c: 0, f: 0, price: 0, grams: 0 }
      );
      return { idx, items, totals };
    });
  }, [state.meals, state.n, state.foods, state.dishes]);

  const filteredIngredients = useMemo(
    () =>
      state.foods.filter((f) => {
        if (f.cat === 'juice') return false;
        if (ingCat !== 'all' && f.cat !== ingCat) return false;
        if (search.trim() && !f.name.includes(search.trim())) return false;
        return true;
      }),
    [state.foods, ingCat, search]
  );

  const filteredDishes = useMemo(
    () =>
      state.dishes.filter(
        (d) => !search.trim() || d.name.includes(search.trim())
      ),
    [state.dishes, search]
  );

  const filteredJuices = useMemo(
    () =>
      state.foods.filter((f) => {
        if (f.cat !== 'juice') return false;
        if (search.trim() && !f.name.includes(search.trim())) return false;
        return true;
      }),
    [state.foods, search]
  );

  if (res.err) {
    return (
      <div className="bg-[#1f1412] border border-[#c45d51]/50 rounded-2xl p-4 text-sm text-[#f3f1ec]">
        {res.err}
      </div>
    );
  }

  const openPickerForSlot = (slotIdx: number) => {
    setSearch('');
    setPickerTab('ingredients');
    setIngCat('all');
    setPickerSlot(slotIdx);
    onUpdate((prev) => ({ ...prev, activeSlot: slotIdx }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addItemToSlot = (item: CartItem) => {
    onUpdate((prev) => ({
      ...prev,
      activeSlot: item.slot,
      meals: [...prev.meals, item],
    }));
    setPortionModal(null);
    onToast(`أُضيف إلى ${getMealSlotName(state, item.slot)}`);
  };

  const updateCartItemGrams = (uid: string, grams: number) => {
    onUpdate((prev) => ({
      ...prev,
      meals: prev.meals.map((m) =>
        m.uid === uid ? { ...m, grams: Math.max(0, grams) } : m
      ),
    }));
  };

  const updateDishMult = (uid: string, mult: number) => {
    onUpdate((prev) => ({
      ...prev,
      meals: prev.meals.map((m) => (m.uid === uid ? { ...m, mult } : m)),
    }));
  };

  const removeCartItem = (uid: string) => {
    onUpdate((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.uid !== uid),
    }));
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

  const resolveItemVisual = (m: CartItem): { title: string; image: string; foodObj: FoodItem | null } => {
    if (m.kind === 'food') {
      const f = state.foods.find((x) => x.id === m.id) || null;
      return {
        title: f ? f.name : 'مكوّن',
        image: getFoodImage(f),
        foodObj: f,
      };
    }
    if (m.kind === 'dish') {
      const d = state.dishes.find((x) => x.id === m.id) || null;
      return {
        title: d ? d.name : 'طبق جاهز',
        image: getDishImage(d, state.foods),
        foodObj: null,
      };
    }
    return {
      title: m.name || 'وجبة مخصصة',
      image: getFoodImage(state.foods[0]),
      foodObj: null,
    };
  };

  const activeFood =
    portionModal?.type === 'food'
      ? state.foods.find((f) => f.id === portionModal.foodId)
      : null;
  const activeDish =
    portionModal?.type === 'dish'
      ? state.dishes.find((d) => d.id === portionModal.dishId)
      : null;

  const renderLuxuryFoodGrid = (foods: FoodItem[], isJuice: boolean, targetSlot: number) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {foods.map((f) => {
        const blocked = getBlockedAllergensForFood(f, state.al);
        const isBlocked = blocked.length > 0;
        const isUnavailable = f.available === false;
        const unit = isJuice ? '100مل' : '100غ';
        const perGram = f.price / 100;
        const dom = getDominantMacro(f);
        const defaults = getFoodGramDefaults(f);
        const imgUrl = getFoodImage(f);

        return (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              if (isUnavailable) {
                onToast('هذا الصنف غير متوفر في قائمة اليوم');
                return;
              }
              if (isBlocked) {
                onToast(`محجوب بسبب الحساسية: ${formatAllergenList(blocked)}`);
                return;
              }
              setPortionModal({
                type: 'food',
                foodId: f.id,
                grams: defaults.def,
                slot: targetSlot,
              });
            }}
            className={`group text-right bg-[#111411] border border-[#252823] rounded-2xl overflow-hidden flex flex-col transition-colors cursor-pointer ${
              isBlocked || isUnavailable
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:border-[#c9a85c]/65'
            }`}
          >
            {/* Editorial Studio Photography Header */}
            <div className="relative w-full h-32 bg-[#171a16] overflow-hidden">
              <img
                src={imgUrl}
                alt={f.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111411] via-[#111411]/35 to-transparent" />
              <div className="absolute bottom-2.5 right-3.5 left-3.5 flex items-end justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-wide text-[#d4cfc2]">
                  {CATEGORY_LABELS[f.cat]}
                </span>
                <span className="text-xs font-bold text-[#e5cf94] tabular-nums">
                  {round1(f.price)} دج / {unit}
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5 w-full">
              <div>
                <h3 className="text-sm font-bold text-[#f3f1ec] leading-snug">
                  {f.name}
                </h3>
                {isUnavailable ? (
                  <div className="text-[11px] text-[#c45d51] font-semibold mt-1">
                    غير متوفر اليوم
                  </div>
                ) : (
                  <div className="text-xs text-[#9b988d] mt-1 tabular-nums">
                    <span className="text-[#f3f1ec] font-semibold">{round0(f.per100.kcal)}</span> سعرة لكل {unit}
                    <span className="mx-1.5 text-[#51524a]">·</span>
                    <span style={{ color: dom.color }}>{dom.shortLabel}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] border-t border-[#222520] pt-2.5 tabular-nums">
                <div className="flex items-center gap-3">
                  <span className="text-[#d4a24c]">بروتين {round1(f.per100.p)}غ</span>
                  <span className="text-[#5aa882]">كارب {round1(f.per100.c)}غ</span>
                  <span className="text-[#c97a57]">دهون {round1(f.per100.f)}غ</span>
                </div>
                <span className="text-[#6d6b62]">{round2(perGram)} دج/{isJuice ? 'مل' : 'غ'}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderLuxuryDishesGrid = (dishes: DishItem[], targetSlot: number) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {dishes.map((d) => {
        const mac = dishMacros(d, state.foods, 1);
        const blocked = getBlockedAllergensForDish(d, state.foods, state.al);
        const isBlocked = blocked.length > 0;
        const isUnavailable = d.available === false;
        const imgUrl = getDishImage(d, state.foods);

        return (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              if (isUnavailable) {
                onToast('هذا الطبق غير متوفر اليوم');
                return;
              }
              if (isBlocked) {
                onToast(`يحتوي على حساسية: ${formatAllergenList(blocked)}`);
                return;
              }
              setPortionModal({
                type: 'dish',
                dishId: d.id,
                mult: 1,
                slot: targetSlot,
              });
            }}
            className={`group text-right bg-[#111411] border border-[#252823] rounded-2xl overflow-hidden flex flex-col transition-colors cursor-pointer ${
              isBlocked || isUnavailable
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:border-[#c9a85c]/65'
            }`}
          >
            <div className="relative w-full h-36 bg-[#171a16] overflow-hidden">
              <img
                src={imgUrl}
                alt={d.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111411] via-[#111411]/35 to-transparent" />
              <div className="absolute bottom-2.5 right-3.5 left-3.5 flex items-end justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#d4cfc2]">
                  طبق محسوب بالميزان · {round0(mac.grams)} غ
                </span>
                <span className="text-xs font-bold text-[#e5cf94] tabular-nums">
                  {round0(mac.price)} دج
                </span>
              </div>
            </div>

            <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5 w-full">
              <div>
                <h3 className="text-sm font-bold text-[#f3f1ec] leading-snug">
                  {d.name}
                </h3>
                {isUnavailable ? (
                  <div className="text-[11px] text-[#c45d51] font-semibold mt-1">
                    غير متوفر اليوم
                  </div>
                ) : (
                  <div className="text-xs text-[#9b988d] mt-1 tabular-nums">
                    <span className="text-[#f3f1ec] font-semibold">{round0(mac.kcal)}</span> سعرة إجمالية
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] border-t border-[#222520] pt-2.5 tabular-nums">
                <span className="text-[#d4a24c]">بروتين {round0(mac.p)}غ</span>
                <span className="text-[#5aa882]">كارب {round0(mac.c)}غ</span>
                <span className="text-[#c97a57]">دهون {round0(mac.f)}غ</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  // ============================================================================
  // VIEW B: DEDICATED LUXURY PLATE COMPOSER FOR SELECTED MEAL
  // ============================================================================
  if (pickerSlot !== null) {
    const safeSlot = clamp(pickerSlot, 0, state.n - 1);
    const currentMeal = slotSummaries[safeSlot] || {
      idx: safeSlot,
      items: [],
      totals: { kcal: 0, p: 0, c: 0, f: 0, price: 0, grams: 0 },
    };

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPickerSlot(null)}
            className="px-3.5 py-2 rounded-xl bg-[#111411] border border-[#252823] hover:border-[#c9a85c]/50 text-xs font-bold text-[#f3f1ec] flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-[#c9a85c]" />
            العودة إلى وجبات اليوم
          </button>

          <button
            type="button"
            onClick={() => setPickerSlot(null)}
            className="px-4 py-2 rounded-xl font-bold text-xs text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            اعتماد الوجبة
          </button>
        </div>

        {/* Selected Meal Plate Summary */}
        <div className="bg-[#111411] border border-[#c9a85c]/45 rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold text-[#c9a85c]">
                تختار الآن مكونات وأطباق:
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-[#f3f1ec] mt-0.5">
                {getMealSlotName(state, safeSlot)}
              </h1>
            </div>
            <div className="text-left tabular-nums">
              <div className="text-sm font-bold text-[#e5cf94]">
                {round0(currentMeal.totals.kcal)} kcal · {round0(currentMeal.totals.price)} دج
              </div>
              <div className="text-[11px] font-semibold mt-0.5">
                <span className="text-[#d4a24c]">بروتين {round0(currentMeal.totals.p)}غ</span>
                <span className="text-[#51524a] mx-1.5">·</span>
                <span className="text-[#5aa882]">كارب {round0(currentMeal.totals.c)}غ</span>
                <span className="text-[#51524a] mx-1.5">·</span>
                <span className="text-[#c97a57]">دهون {round0(currentMeal.totals.f)}غ</span>
              </div>
            </div>
          </div>

          {currentMeal.items.length === 0 ? (
            <div className="border-t border-[#222520] pt-3 text-xs text-[#9b988d]">
              اختر من قائمة الأطعمة الفاخرة بالأسفل لبناء طبق هذه الوجبة بالغرام الدقيق.
            </div>
          ) : (
            <div className="border-t border-[#222520] divide-y divide-[#222520]">
              {currentMeal.items.map((m) => {
                const mac = cartItemMacros(m, state.foods, state.dishes);
                const vis = resolveItemVisual(m);
                const step = vis.foodObj ? getFoodGramDefaults(vis.foodObj).step : 10;
                const unit = vis.foodObj?.cat === 'juice' ? 'مل' : 'غ';

                return (
                  <div
                    key={m.uid}
                    className="py-2.5 flex items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={vis.image}
                        alt={vis.title}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-[#252823] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-[#f3f1ec] truncate">{vis.title}</div>
                        <div className="text-[11px] text-[#9b988d] tabular-nums">
                          {round0(mac.kcal)} kcal · P{round0(mac.p)} · {round0(mac.price)} دج
                        </div>
                      </div>
                    </div>

                    {m.kind === 'food' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItemGrams(
                              m.uid,
                              Math.max(step, (m.grams || 0) - step)
                            )
                          }
                          className="w-7 h-7 rounded-lg bg-[#171a16] border border-[#252823] flex items-center justify-center text-[#c9a85c] cursor-pointer"
                          aria-label="إنقاص"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-12 text-center font-bold text-[#f3f1ec] tabular-nums">
                          {round0(m.grams || 0)}{unit}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItemGrams(m.uid, (m.grams || 0) + step)
                          }
                          className="w-7 h-7 rounded-lg bg-[#171a16] border border-[#252823] flex items-center justify-center text-[#c9a85c] cursor-pointer"
                          aria-label="زيادة"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => removeCartItem(m.uid)}
                      className="p-1.5 text-[#9b988d] hover:text-[#c45d51] cursor-pointer shrink-0"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between">
          <div className="flex gap-1.5 p-1 bg-[#111411] border border-[#252823] rounded-xl overflow-x-auto no-scrollbar">
            {(
              [
                ['ingredients', 'مكونات لصنع الطبق'],
                ['dishes', 'أطباق الشيف الجاهزة'],
                ['juices', `عصائر طازجة (${filteredJuices.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPickerTab(id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  pickerTab === id
                    ? 'bg-[#242117] text-[#e5cf94] border border-[#c9a85c]/40'
                    : 'text-[#9b988d] hover:text-[#f3f1ec]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-[#6d6b62] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن صنف أو طبق..."
              className="w-full bg-[#111411] border border-[#252823] rounded-xl pr-9 pl-3 py-2 text-xs text-[#f3f1ec] placeholder:text-[#6d6b62]"
            />
          </div>
        </div>

        {pickerTab === 'ingredients' && (
          <>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  ['all', 'الكل'],
                  ['protein', 'البروتينات'],
                  ['carb', 'الكاربوهيدرات'],
                  ['fat', 'الدهون الصحية'],
                  ['veg', 'الخضر الطازجة'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIngCat(id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    ingCat === id
                      ? 'bg-[#242117] border-[#c9a85c] text-[#e5cf94]'
                      : 'bg-[#111411] border-[#252823] text-[#9b988d]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {renderLuxuryFoodGrid(filteredIngredients, false, safeSlot)}
          </>
        )}

        {pickerTab === 'dishes' && renderLuxuryDishesGrid(filteredDishes, safeSlot)}
        {pickerTab === 'juices' && renderLuxuryFoodGrid(filteredJuices, true, safeSlot)}

        {/* PRECISION GRAM / PORTION MODAL */}
        {portionModal && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPortionModal(null);
            }}
          >
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0c0e0c] border border-[#c9a85c]/70 rounded-t-3xl sm:rounded-2xl overflow-hidden">
              {portionModal.type === 'food' && activeFood && (() => {
                const isJuice = activeFood.cat === 'juice';
                const unit = isJuice ? 'مل' : 'غ';
                const gramCfg = getFoodGramDefaults(activeFood);
                const dom = getDominantMacro(activeFood);
                const mac = foodMacros(activeFood, portionModal.grams);
                const perUnitPrice = activeFood.price / 100;

                let smartFill: { label: string; grams: number } | null = null;
                if (dom.key === 'P' && activeFood.per100.p >= 3 && gaps.P > 2) {
                  const g = clamp(
                    Math.round(((gaps.P / activeFood.per100.p) * 100) / gramCfg.step) * gramCfg.step,
                    gramCfg.min,
                    gramCfg.max
                  );
                  smartFill = { label: `املأ فجوة البروتين (${g}${unit})`, grams: g };
                } else if (dom.key === 'C' && activeFood.per100.c >= 3 && gaps.C > 5) {
                  const g = clamp(
                    Math.round(((gaps.C / activeFood.per100.c) * 100) / gramCfg.step) * gramCfg.step,
                    gramCfg.min,
                    gramCfg.max
                  );
                  smartFill = { label: `املأ فجوة الكارب (${g}${unit})`, grams: g };
                } else if (dom.key === 'F' && activeFood.per100.f >= 3 && gaps.F > 2) {
                  const g = clamp(
                    Math.round(((gaps.F / activeFood.per100.f) * 100) / gramCfg.step) * gramCfg.step,
                    gramCfg.min,
                    gramCfg.max
                  );
                  smartFill = { label: `املأ فجوة الدهون (${g}${unit})`, grams: g };
                }

                const mealBefore = currentMeal.totals.kcal;
                const mealAfter = mealBefore + mac.kcal;
                const remKcalAfter = Math.max(0, res.kcal - (cartTotals.kcal + mac.kcal));
                const remPAfter = Math.max(0, res.fp - (cartTotals.p + mac.p));
                const remCAfter = Math.max(0, res.C - (cartTotals.c + mac.c));
                const remFAfter = Math.max(0, res.F - (cartTotals.f + mac.f));

                return (
                  <div>
                    {/* Editorial Image Header */}
                    <div className="relative h-36 bg-[#171a16]">
                      <img
                        src={getFoodImage(activeFood)}
                        alt={activeFood.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e0c] via-[#0c0e0c]/55 to-transparent" />
                      <button
                        type="button"
                        onClick={() => setPortionModal(null)}
                        className="absolute top-3 left-3 p-2 rounded-xl bg-black/60 text-[#f3f1ec] hover:text-[#e5cf94] cursor-pointer"
                        aria-label="إغلاق"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-3 right-5 left-5">
                        <div className="text-[11px] font-semibold text-[#c9a85c]">
                          {CATEGORY_LABELS[activeFood.cat]} · {round1(activeFood.price)} دج / 100{unit}
                        </div>
                        <h2 className="text-xl font-bold text-[#f3f1ec] mt-0.5">
                          {activeFood.name}
                        </h2>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Precision Gram Controls */}
                      <div className="bg-[#111411] border border-[#252823] rounded-2xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#f3f1ec]">
                            تحديد الوزن بالغرام ({unit})
                          </span>
                          {smartFill && (
                            <button
                              type="button"
                              onClick={() => setPortionModal({ ...portionModal, grams: smartFill.grams })}
                              className="px-2.5 py-1 rounded-lg bg-[#242117] border border-[#c9a85c]/50 text-[11px] font-bold text-[#e5cf94] cursor-pointer tabular-nums"
                            >
                              {smartFill.label}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center bg-[#171a16] border border-[#252823] rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setPortionModal({
                                ...portionModal,
                                grams: Math.max(0, portionModal.grams - gramCfg.step),
                              })
                            }
                            className="w-14 h-12 text-xl font-bold text-[#c9a85c] hover:bg-[#242117] cursor-pointer"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={portionModal.grams}
                            onChange={(e) =>
                              setPortionModal({
                                ...portionModal,
                                grams: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="flex-1 bg-transparent text-center text-2xl font-bold text-[#f3f1ec] tabular-nums focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPortionModal({
                                ...portionModal,
                                grams: portionModal.grams + gramCfg.step,
                              })
                            }
                            className="w-14 h-12 text-xl font-bold text-[#c9a85c] hover:bg-[#242117] cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div>
                          <input
                            type="range"
                            min={gramCfg.min}
                            max={gramCfg.max}
                            step={gramCfg.step}
                            value={clamp(portionModal.grams, gramCfg.min, gramCfg.max)}
                            onChange={(e) =>
                              setPortionModal({
                                ...portionModal,
                                grams: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full accent-[#c9a85c] cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-[#6d6b62] tabular-nums">
                            <span>{gramCfg.min}{unit}</span>
                            <span>{gramCfg.max}{unit}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          {gramCfg.presets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setPortionModal({ ...portionModal, grams: preset })}
                              className={`py-1.5 rounded-lg border text-xs font-semibold tabular-nums cursor-pointer ${
                                portionModal.grams === preset
                                  ? 'bg-[#242117] border-[#c9a85c] text-[#e5cf94]'
                                  : 'bg-[#171a16] border-[#252823] text-[#f3f1ec] hover:border-[#c9a85c]/50'
                              }`}
                            >
                              {preset}{unit}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live Before -> After Impact Preview */}
                      <div className="bg-[#111411] border border-[#c9a85c]/40 rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#e5cf94]">معاينة الإضافة للوجبة</span>
                          <span className="text-sm font-bold text-[#c9a85c] tabular-nums">
                            {round1(mac.price)} دج ({round2(perUnitPrice)}/{unit})
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center bg-[#171a16] rounded-xl py-2 px-1 tabular-nums text-xs">
                          <div>
                            <div className="font-bold text-[#e5cf94]">+{round0(mac.kcal)}</div>
                            <div className="text-[10px] text-[#9b988d]">سعرة</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#d4a24c]">+{round1(mac.p)}غ</div>
                            <div className="text-[10px] text-[#9b988d]">بروتين</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#5aa882]">+{round1(mac.c)}غ</div>
                            <div className="text-[10px] text-[#9b988d]">كارب</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#c97a57]">+{round1(mac.f)}غ</div>
                            <div className="text-[10px] text-[#9b988d]">دهون</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#9b988d] tabular-nums pt-1 border-t border-[#222520]">
                          <span>
                            الوجبة: {round0(mealBefore)} ←{' '}
                            <b className="text-[#f3f1ec]">{round0(mealAfter)} kcal</b>
                          </span>
                          <span>
                            المتبقي لليوم:{' '}
                            <b className="text-[#e5cf94]">{round0(remKcalAfter)}</b> · P{round0(remPAfter)} C{round0(remCAfter)} F{round0(remFAfter)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={portionModal.grams <= 0}
                        onClick={() =>
                          addItemToSlot({
                            uid: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                            kind: 'food',
                            id: activeFood.id,
                            grams: portionModal.grams,
                            slot: portionModal.slot,
                          })
                        }
                        className="w-full py-3.5 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] disabled:opacity-40 cursor-pointer"
                      >
                        إضافة إلى {getMealSlotName(state, portionModal.slot)} ({round1(mac.price)} دج)
                      </button>
                    </div>
                  </div>
                );
              })()}

              {portionModal.type === 'dish' && activeDish && (() => {
                const mac = dishMacros(activeDish, state.foods, portionModal.mult);
                const remKcalAfter = Math.max(0, res.kcal - (cartTotals.kcal + mac.kcal));
                return (
                  <div>
                    <div className="relative h-36 bg-[#171a16]">
                      <img
                        src={getDishImage(activeDish, state.foods)}
                        alt={activeDish.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e0c] via-[#0c0e0c]/55 to-transparent" />
                      <button
                        type="button"
                        onClick={() => setPortionModal(null)}
                        className="absolute top-3 left-3 p-2 rounded-xl bg-black/60 text-[#f3f1ec] hover:text-[#e5cf94] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-3 right-5 left-5">
                        <div className="text-[11px] font-semibold text-[#c9a85c]">
                          طبق جاهز محسوب · {round0(mac.grams)} غ
                        </div>
                        <h2 className="text-xl font-bold text-[#f3f1ec] mt-0.5">
                          {activeDish.name}
                        </h2>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { mult: 0.75, label: 'حصة خفيفة (0.75×)' },
                          { mult: 1, label: 'حصة قياسية (1×)' },
                          { mult: 1.5, label: 'حصة كبيرة (1.5×)' },
                        ].map((opt) => (
                          <button
                            key={opt.mult}
                            type="button"
                            onClick={() => setPortionModal({ ...portionModal, mult: opt.mult })}
                            className={`py-2 px-1 rounded-xl border text-xs font-semibold cursor-pointer ${
                              portionModal.mult === opt.mult
                                ? 'bg-[#242117] border-[#c9a85c] text-[#e5cf94]'
                                : 'bg-[#171a16] border-[#252823] text-[#9b988d]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <div className="bg-[#111411] border border-[#252823] rounded-xl p-3 space-y-1.5">
                        <div className="text-xs font-bold text-[#c9a85c] mb-1">مكونات الطبق بالغرام</div>
                        {activeDish.ing.map(([fid, g]) => {
                          const f = state.foods.find((x) => x.id === fid);
                          if (!f) return null;
                          return (
                            <div key={fid} className="flex justify-between text-xs text-[#9b988d]">
                              <span>{f.name}</span>
                              <span className="text-[#f3f1ec] font-semibold tabular-nums">
                                {round0(g * portionModal.mult)} غ
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-[#111411] border border-[#c9a85c]/40 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between tabular-nums text-xs font-bold">
                          <span className="text-[#e5cf94]">+{round0(mac.kcal)} kcal</span>
                          <span className="text-[#d4a24c]">P {round0(mac.p)}غ</span>
                          <span className="text-[#5aa882]">C {round0(mac.c)}غ</span>
                          <span className="text-[#c97a57]">F {round0(mac.f)}غ</span>
                        </div>
                        <div className="text-[11px] text-[#9b988d] pt-1 border-t border-[#222520] tabular-nums">
                          المتبقي لليوم بعد الإضافة: <b className="text-[#e5cf94]">{round0(remKcalAfter)} kcal</b>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          addItemToSlot({
                            uid: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                            kind: 'dish',
                            id: activeDish.id,
                            mult: portionModal.mult,
                            slot: portionModal.slot,
                          })
                        }
                        className="w-full py-3.5 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] cursor-pointer"
                      >
                        إضافة إلى {getMealSlotName(state, portionModal.slot)} ({round0(mac.price)} دج)
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // VIEW A: LUXURY MEAL CARDS OVERVIEW (الوجبة الأولى، الثانية، الثالثة...)
  // ============================================================================
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#f3f1ec]">قائمة وجباتك المخصصة</h1>
          <p className="text-xs text-[#9b988d] mt-0.5">
            صمّم كل وجبة في يومك باختيار أطعمة الشيف والمكونات الموزونة بالغرام
          </p>
        </div>
        {state.n < 5 && (
          <button
            type="button"
            onClick={() => {
              const nextN = state.n + 1;
              onUpdate((prev) => ({ ...prev, n: nextN, activeSlot: nextN - 1 }));
              onToast(`تمت إضافة ${getMealSlotName(state, nextN - 1)}`);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#111411] border border-[#c9a85c]/40 text-xs font-bold text-[#e5cf94] flex items-center gap-1.5 cursor-pointer hover:bg-[#242117]"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة وجبة أخرى ({state.n + 1})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {slotSummaries.map((slot) => {
          const isFocused = slot.idx === clamp(state.activeSlot ?? 0, 0, state.n - 1);
          return (
            <div
              key={slot.idx}
              className={`bg-[#111411] rounded-2xl p-4 sm:p-5 space-y-3.5 border transition-colors ${
                isFocused ? 'border-[#c9a85c]/55' : 'border-[#252823]'
              }`}
            >
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#222520]">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold text-[#6d6b62] tracking-wide mb-0.5 tabular-nums">
                    0{slot.idx + 1} · مخصصة بالغرام
                  </div>
                  <input
                    type="text"
                    value={getMealSlotName(state, slot.idx)}
                    onChange={(e) => updateMealName(slot.idx, e.target.value)}
                    className="w-full bg-transparent text-base font-bold text-[#e5cf94] focus:outline-none focus:border-b focus:border-[#c9a85c]"
                    aria-label={`اسم الوجبة ${slot.idx + 1}`}
                  />
                  <div className="text-xs font-semibold tabular-nums mt-1 flex items-center gap-2.5">
                    <span className="text-[#f3f1ec]">{round0(slot.totals.kcal)} kcal</span>
                    <span className="text-[#d4a24c]">P {round0(slot.totals.p)}غ</span>
                    <span className="text-[#5aa882]">C {round0(slot.totals.c)}غ</span>
                    <span className="text-[#c97a57]">F {round0(slot.totals.f)}غ</span>
                    {slot.totals.price > 0 && (
                      <span className="text-[#c9a85c]">· {round0(slot.totals.price)} دج</span>
                    )}
                  </div>
                </div>

                {state.n > 1 && slot.items.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = slot.idx;
                      onUpdate((prev) => ({
                        ...prev,
                        n: Math.max(1, prev.n - 1),
                        activeSlot: 0,
                        meals: prev.meals.map((m) => ({
                          ...m,
                          slot: m.slot > target ? m.slot - 1 : Math.min(m.slot, Math.max(0, prev.n - 2)),
                        })),
                      }));
                    }}
                    className="text-[11px] text-[#9b988d] hover:text-[#c45d51] px-2 py-1 cursor-pointer shrink-0"
                  >
                    حذف
                  </button>
                )}
              </div>

              {slot.items.length === 0 ? (
                <div className="bg-[#171a16] border border-[#252823] rounded-xl p-4 text-center space-y-1">
                  <div className="text-xs font-semibold text-[#d4cfc2]">
                    لم تُضف أطعمة لهذه الوجبة بعد
                  </div>
                  <div className="text-[11px] text-[#6d6b62]">
                    اضغط بالأسفل لاختيار أطعمة وتنسيق طبقك بدقة
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#222520]">
                  {slot.items.map((m) => {
                    const mac = cartItemMacros(m, state.foods, state.dishes);
                    const vis = resolveItemVisual(m);
                    const step = vis.foodObj ? getFoodGramDefaults(vis.foodObj).step : 10;
                    const unit = vis.foodObj?.cat === 'juice' ? 'مل' : 'غ';

                    return (
                      <div
                        key={m.uid}
                        className="py-2.5 flex items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={vis.image}
                            alt={vis.title}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover border border-[#252823] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-[#f3f1ec] truncate">{vis.title}</div>
                            <div className="text-[11px] text-[#9b988d] tabular-nums">
                              {round0(mac.kcal)} kcal ·{' '}
                              <span className="text-[#d4a24c]">P{round0(mac.p)}</span>{' '}
                              <span className="text-[#5aa882]">C{round0(mac.c)}</span>{' '}
                              <span className="text-[#c97a57]">F{round0(mac.f)}</span> ·{' '}
                              <span className="text-[#c9a85c]">{round0(mac.price)} دج</span>
                            </div>
                          </div>
                        </div>

                        {m.kind === 'food' ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItemGrams(
                                  m.uid,
                                  Math.max(step, (m.grams || 0) - step)
                                )
                              }
                              className="w-7 h-7 rounded-lg bg-[#171a16] border border-[#252823] flex items-center justify-center text-[#c9a85c] cursor-pointer"
                              aria-label="إنقاص الكمية"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-12 text-center font-bold text-[#f3f1ec] tabular-nums">
                              {round0(m.grams || 0)}{unit}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartItemGrams(m.uid, (m.grams || 0) + step)
                              }
                              className="w-7 h-7 rounded-lg bg-[#171a16] border border-[#252823] flex items-center justify-center text-[#c9a85c] cursor-pointer"
                              aria-label="زيادة الكمية"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : m.kind === 'dish' ? (
                          <select
                            value={m.mult || 1}
                            onChange={(e) =>
                              updateDishMult(m.uid, parseFloat(e.target.value) || 1)
                            }
                            className="bg-[#171a16] border border-[#252823] rounded-lg px-2 py-1 text-[11px] text-[#f3f1ec] shrink-0"
                          >
                            <option value={0.75}>0.75×</option>
                            <option value={1}>1×</option>
                            <option value={1.5}>1.5×</option>
                          </select>
                        ) : (
                          <span className="text-[11px] text-[#9b988d] tabular-nums shrink-0">
                            {round0(mac.grams)}غ
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeCartItem(m.uid)}
                          className="p-1.5 text-[#9b988d] hover:text-[#c45d51] cursor-pointer shrink-0"
                          aria-label="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => openPickerForSlot(slot.idx)}
                className="w-full py-3 rounded-xl font-bold text-xs text-[#e5cf94] bg-[#242117] border border-[#c9a85c]/50 hover:border-[#c9a85c] hover:bg-[#2c281b] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4 text-[#c9a85c]" />
                <span>
                  {slot.items.length === 0
                    ? `اختيار أطعمة لـ ${getMealSlotName(state, slot.idx)}`
                    : `إضافة أطعمة أخرى لـ ${getMealSlotName(state, slot.idx)}`}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {state.meals.length > 0 && (
        <div className="bg-[#111411] border border-[#c9a85c]/45 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 tabular-nums">
            <div className="text-sm font-bold text-[#f3f1ec]">
              إجمالي يومك: <span className="text-[#e5cf94]">{round0(cartTotals.kcal)} kcal</span> ·{' '}
              <span className="text-[#c9a85c]">{round0(cartTotals.price)} دج (مكونات)</span>
            </div>
            <div className="text-xs text-[#9b988d]">
              المتبقي من الهدف: {round0(gaps.kcal)} kcal ·{' '}
              <span className="text-[#d4a24c]">P{round0(gaps.P)}</span> ·{' '}
              <span className="text-[#5aa882]">C{round0(gaps.C)}</span> ·{' '}
              <span className="text-[#c97a57]">F{round0(gaps.F)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className="px-5 py-3 rounded-xl font-bold text-sm text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] flex items-center gap-2 cursor-pointer shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>مراجعة السلة وتأكيد الطلب</span>
          </button>
        </div>
      )}
    </div>
  );
};
