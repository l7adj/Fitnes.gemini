import React from 'react';
import { ACTIVITY_BANDS, ALLERGENS, GOALS } from '../data/seed';
import { ActivityBand, AllergenKey, AppState, GoalType, SafetyFlags } from '../types';
import { bandRangeText, calcNutrition, round0, round2, safetyGateError } from '../utils/nutrition';
import { EquationTable } from './EquationTable';
import { SvgRing } from './SvgRing';
import { AlertTriangle, ArrowRight, Check, ShieldAlert } from 'lucide-react';

interface CalculatorWizardProps {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onFinish: () => void;
}

const Stepper: React.FC<{
  label: string;
  value: number;
  unit: string;
  step: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}> = ({ label, value, unit, step, min = 0, max = 500, onChange }) => (
  <div className="mt-3">
    <label className="block text-xs font-semibold text-[#a8a493] mb-1.5">{label}</label>
    <div className="flex items-center bg-[#1c2216] border border-[#2b3322] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, round2(value - step)))}
        className="w-14 h-12 flex items-center justify-center text-xl font-bold text-[#d8b25c] hover:bg-[#2a2410] active:scale-95 transition"
        aria-label={`إنقاص ${label}`}
      >
        −
      </button>
      <div className="flex-1 text-center py-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isNaN(v) ? 0 : Math.min(max, v));
          }}
          className="w-full bg-transparent border-0 text-center font-num text-xl font-bold text-[#f4f1e6] focus:outline-none"
        />
        <span className="block text-[10px] text-[#716e5e] -mt-1">{unit}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, round2(value + step)))}
        className="w-14 h-12 flex items-center justify-center text-xl font-bold text-[#d8b25c] hover:bg-[#2a2410] active:scale-95 transition"
        aria-label={`زيادة ${label}`}
      >
        +
      </button>
    </div>
  </div>
);

export const CalculatorWizard: React.FC<CalculatorWizardProps> = ({
  state,
  onUpdate,
  onFinish,
}) => {
  const step = state.ob;
  const gateErr = safetyGateError(state);
  const res = calcNutrition(state);

  const setStep = (n: number) => onUpdate((prev) => ({ ...prev, ob: n }));

  const toggleFlag = (key: keyof SafetyFlags) =>
    onUpdate((prev) => ({
      ...prev,
      fl: { ...prev.fl, [key]: !prev.fl[key] },
    }));

  const toggleAllergen = (key: AllergenKey) =>
    onUpdate((prev) => {
      const exists = prev.al.includes(key);
      const nextAl = exists ? prev.al.filter((a) => a !== key) : [...prev.al, key];
      return { ...prev, al: nextAl };
    });

  const bmi = state.h > 0 ? state.w / Math.pow(state.h / 100, 2) : 0;

  if (step === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center space-y-3 mb-8">
          <div className="text-xs font-semibold text-[#d8b25c] tracking-wide">
            الجزائر · معاينة تفاعلية
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#f4f1e6] text-balance">
            NutriFit DZ
          </h1>
          <p className="text-base sm:text-lg text-[#f2d491] font-semibold max-w-md mx-auto text-balance">
            يحسب احتياجك بالغرام، يطبخ وجباتك، ويوصلها لبابك صباحًا.
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-[#d4a24c]/30 bg-[#241e12]/70 px-4 py-3 text-[11px] leading-6 text-[#d8cba9]">
          <strong className="text-[#e5cf94]">نسخة معاينة:</strong>
          هذه الواجهة تختبر رحلة العميل والحسابات محلياً. لم تُربط بعد بخدمة طلبات أو مطبخ أو توصيل مباشر.
        </div>

        <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-5 space-y-4 mb-6">
          <div className="text-sm font-bold text-[#f4f1e6]">الرحلة الكاملة في نظام واحد</div>
          <div className="space-y-3 text-sm text-[#a8a493] leading-relaxed">
            <div className="flex gap-3">
              <span className="font-num font-bold text-[#d8b25c]">01</span>
              <span>حاسبة علمية شفافة بالمعادلات المنشورة مع بوابة سلامة طبية.</span>
            </div>
            <div className="flex gap-3">
              <span className="font-num font-bold text-[#d8b25c]">02</span>
              <span>تختار وجباتك ومكوناتك بالغرام، وتوزعها على يومك كما تشاء.</span>
            </div>
            <div className="flex gap-3">
              <span className="font-num font-bold text-[#d8b25c]">03</span>
              <span>تُحدّد نافذة التحضير والتوصيل في ملف التشغيل بعد اعتماد المنطقة والطاقة اليومية.</span>
            </div>
            <div className="flex gap-3">
              <span className="font-num font-bold text-[#d8b25c]">04</span>
              <span>هيكل تكلفة قابل للتفصيل: مكونات + مناولة + خدمة + توصيل، وتُعتمد الأسعار الفعلية من الإدارة.</span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full py-3.5 px-6 rounded-xl font-extrabold text-[#171204] bg-gradient-to-l from-[#f2d491] to-[#d8b25c] hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
          >
            ابدأ الحاسبة العلمية
          </button>
        </div>

        <p className="text-center text-[11px] text-[#716e5e] mt-5">
          أداة تغذية رياضية محسوبة، وليست بديلًا عن الاستشارة الطبية المتخصصة.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-16">
      <div className="flex items-center gap-1.5 mb-6" aria-label="تقدم الخطوات">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i <= step ? 'bg-[#d8b25c]' : 'bg-[#2b3322]'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#f4f1e6]">أولًا: بوابة السلامة</h2>
            <p className="text-xs text-[#a8a493] mt-1">
              سلامتك أولوية قصوى قبل أي حسابات. لا نصدر خططًا آلية في الحالات الخاصة.
            </p>
          </div>

          <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4">
            <label className="block text-xs font-semibold text-[#a8a493] mb-1.5">
              الاسم أو اللقب (يُطبع على العلبة)
            </label>
            <input
              type="text"
              value={state.name}
              onChange={(e) => onUpdate((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-[#1c2216] border border-[#2b3322] rounded-xl px-3 py-2.5 text-sm text-[#f4f1e6]"
              placeholder="مثال: أمين بن علي"
            />
            <Stepper
              label="العمر"
              value={state.age}
              unit="سنة"
              step={1}
              min={18}
              max={100}
              onChange={(age) => onUpdate((prev) => ({ ...prev, age }))}
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#a8a493]">هل ينطبق عليك أي مما يلي؟</div>
            {(
              [
                ['preg', 'حمل أو رضاعة طبيعية'],
                ['kid', 'مرض كلوي معروف'],
                ['dia', 'داء السكري أو أدوية خافضة للسكر'],
                ['ed', 'تاريخ مع اضطرابات الأكل'],
              ] as [keyof SafetyFlags, string][]
            ).map(([key, label]) => {
              const active = state.fl[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFlag(key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-right text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-[#2a1512] border-[#e86a5a] text-[#f4f1e6]'
                      : 'bg-[#141910] border-[#2b3322] text-[#f4f1e6] hover:border-[#d8b25c]/40'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      active ? 'bg-[#e86a5a] border-[#e86a5a] text-[#171204]' : 'border-[#716e5e]'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          {gateErr && (
            <div className="bg-[#2a1512] border border-[#e86a5a]/60 rounded-2xl p-4 flex gap-3 items-start text-xs text-[#f4f1e6]">
              <ShieldAlert className="w-5 h-5 text-[#e86a5a] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#e86a5a] mb-1">حجب آلي للسلامة</div>
                {gateErr}
              </div>
            </div>
          )}
          {!state.name.trim() && (
            <p className="text-[11px] text-[#d4a24c]">أدخل الاسم أو اللقب الذي سيظهر على ملفك قبل المتابعة.</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="px-4 py-3 rounded-xl bg-[#1c2216] border border-[#2b3322] text-sm font-bold text-[#f4f1e6] flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              رجوع
            </button>
            <button
              type="button"
              disabled={Boolean(gateErr) || !state.name.trim()}
              onClick={() => setStep(2)}
              className="flex-1 py-3 rounded-xl font-extrabold text-[#171204] bg-gradient-to-l from-[#f2d491] to-[#d8b25c] disabled:opacity-40 cursor-pointer"
            >
              التالي: قياسات الجسم
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-[#f4f1e6]">قياسات الجسم</h2>
          <div className="rounded-xl border border-[#d4a24c]/25 bg-[#241e12]/60 px-3 py-2.5 text-[11px] leading-5 text-[#d8cba9]">
            القيم الظاهرة مبدئياً أمثلة للمعاينة فقط. أدخل قياساتك الحقيقية قبل اعتماد أي نتيجة.
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['m', 'ذكر'],
                ['f', 'أنثى'],
              ] as const
            ).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => onUpdate((prev) => ({ ...prev, sex: val }))}
                className={`py-3 rounded-xl border text-sm font-bold transition cursor-pointer ${
                  state.sex === val
                    ? 'bg-[#2a2410] border-[#d8b25c] text-[#f2d491]'
                    : 'bg-[#141910] border-[#2b3322] text-[#a8a493]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4">
            <Stepper
              label="الطول"
              value={state.h}
              unit="سم"
              step={1}
              min={120}
              max={230}
              onChange={(h) => onUpdate((prev) => ({ ...prev, h }))}
            />
            <Stepper
              label="الوزن الحالي"
              value={state.w}
              unit="كغ"
              step={0.5}
              min={30}
              max={300}
              onChange={(w) => onUpdate((prev) => ({ ...prev, w }))}
            />
            <Stepper
              label="الوزن المستهدف (للجورنال)"
              value={state.targetWeight}
              unit="كغ"
              step={0.5}
              min={35}
              max={250}
              onChange={(targetWeight) => onUpdate((prev) => ({ ...prev, targetWeight }))}
            />
          </div>

          <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4">
            <div className="text-sm font-bold text-[#d8b25c]">
              الكتلة الخالية من الدهون LBM (اختياري)
            </div>
            <p className="text-xs text-[#a8a493] mt-1">
              أدخله فقط إذا كان لديك قياس موثوق مثل DEXA أو InBody بنسبة موثوقية 70% فأكثر لتفعيل معادلة Katch-McArdle.
            </p>
            <Stepper
              label="LBM"
              value={state.lbm}
              unit="كغ (اتركه 0 إن لم يتوفر)"
              step={0.5}
              min={0}
              max={150}
              onChange={(lbm) => onUpdate((prev) => ({ ...prev, lbm }))}
            />
            {state.lbm > 0 && (
              <>
                <div className="mt-2">
                  <label className="text-xs text-[#a8a493]">طريقة قياس LBM</label>
                  <select
                    value={state.lbmMethod ?? 'none'}
                    onChange={(e) => onUpdate((prev) => ({
                      ...prev,
                      lbmMethod: e.target.value as 'none' | 'dexa' | 'inbody' | 'other',
                    }))}
                    className="mt-1 w-full rounded-xl border border-[#2b3322] bg-[#111411] px-3 py-2.5 text-xs text-[#f4f1e6]"
                  >
                    <option value="none">لم أحدد / غير موثق</option>
                    <option value="dexa">DEXA</option>
                    <option value="inbody">InBody</option>
                    <option value="other">قياس آخر موثق</option>
                  </select>
                </div>
                <Stepper
                  label="موثوقية القياس"
                  value={state.rel}
                  unit="%"
                  step={5}
                  min={0}
                  max={100}
                  onChange={(rel) => onUpdate((prev) => ({ ...prev, rel }))}
                />
                {(!state.lbmMethod || state.lbmMethod === 'none' || state.rel < 70) && (
                  <p className="text-[10px] leading-5 text-[#d4a24c]">
                    ستُستخدم معادلة Mifflin حتى توثّق طريقة قياس LBM وتكون موثوقيتها 70% فأكثر.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-3 rounded-xl bg-[#1c2216] border border-[#2b3322] text-sm font-bold text-[#f4f1e6] cursor-pointer"
            >
              رجوع
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 rounded-xl font-extrabold text-[#171204] bg-gradient-to-l from-[#f2d491] to-[#d8b25c] cursor-pointer"
            >
              التالي: مستوى النشاط
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#f4f1e6]">مستوى النشاط (4 نطاقات)</h2>
            <p className="text-xs text-[#a8a493] mt-1">
              اختر النطاق الأقرب لأسبوعك ثم اضبط المعامل بدقة وفق مرجع FAO/WHO/UNU 2004.
            </p>
          </div>

          <div className="space-y-2">
            {(Object.keys(ACTIVITY_BANDS) as ActivityBand[]).map((key) => {
              const band = ACTIVITY_BANDS[key];
              const active = state.band === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    onUpdate((prev) => ({ ...prev, band: key, pal: band.def }))
                  }
                  className={`w-full text-right p-3.5 rounded-xl border transition cursor-pointer ${
                    active
                      ? 'bg-[#2a2410] border-[#d8b25c]'
                      : 'bg-[#141910] border-[#2b3322] hover:border-[#d8b25c]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#f4f1e6]">{band.label}</span>
                    <span className="font-num text-xs font-bold text-[#d8b25c]">
                      {bandRangeText(key)}
                    </span>
                  </div>
                  <div className="text-xs text-[#a8a493] mt-1">{band.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#a8a493] font-semibold">ضبط دقيق للمعامل</span>
              <span className="font-num text-base font-extrabold text-[#f2d491]">
                {state.pal.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={ACTIVITY_BANDS[state.band].min}
              max={ACTIVITY_BANDS[state.band].max}
              step={0.01}
              value={state.pal}
              onChange={(e) =>
                onUpdate((prev) => ({ ...prev, pal: parseFloat(e.target.value) }))
              }
              className="w-full accent-[#d8b25c] cursor-pointer"
            />
            <div className="flex justify-between font-num text-[10px] text-[#716e5e] mt-1">
              <span>{ACTIVITY_BANDS[state.band].min.toFixed(2)}</span>
              <span>{ACTIVITY_BANDS[state.band].max.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-3 rounded-xl bg-[#1c2216] border border-[#2b3322] text-sm font-bold text-[#f4f1e6] cursor-pointer"
            >
              رجوع
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 py-3 rounded-xl font-extrabold text-[#171204] bg-gradient-to-l from-[#f2d491] to-[#d8b25c] cursor-pointer"
            >
              التالي: الهدف والحساسيات
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-[#f4f1e6]">الهدف والحساسيات</h2>

          <div className="space-y-2">
            {(Object.keys(GOALS) as GoalType[]).map((key) => {
              const g = GOALS[key];
              const blockedByBmi = key === 'cut' && bmi < 18.5;
              const active = state.goal === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={blockedByBmi}
                  onClick={() =>
                    onUpdate((prev) => ({ ...prev, goal: key, pct: g.pct }))
                  }
                  className={`w-full text-right p-3.5 rounded-xl border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    active
                      ? 'bg-[#2a2410] border-[#d8b25c]'
                      : 'bg-[#141910] border-[#2b3322] hover:border-[#d8b25c]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#f4f1e6]">{g.label}</span>
                    <span className="font-num text-xs font-bold text-[#d8b25c]">
                      {g.multLabel} · {g.proteinPerKg}غ/كغ
                    </span>
                  </div>
                  <div className="text-xs text-[#a8a493] mt-1">
                    {blockedByBmi ? 'محجوب لأن BMI أقل من 18.5' : g.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4">
            <Stepper
              label="تعديل نسبة الفائض أو العجز (حد الأمان ±25%)"
              value={state.pct}
              unit="%"
              step={1}
              min={-25}
              max={25}
              onChange={(pct) => onUpdate((prev) => ({ ...prev, pct }))}
            />
          </div>

          <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-[#d8b25c]">الحساسيات الغذائية</div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ALLERGENS) as AllergenKey[]).map((k) => {
                const on = state.al.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleAllergen(k)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      on
                        ? 'bg-[#2a2410] border-[#d8b25c] text-[#f2d491]'
                        : 'bg-[#1c2216] border-[#2b3322] text-[#a8a493]'
                    }`}
                  >
                    {on ? `✓ ${ALLERGENS[k]}` : ALLERGENS[k]}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#2b3322]">
              <div className="text-xs font-bold text-[#d8b25c] mb-2">
                مكمل البروتين (اختياري)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdate((prev) => ({ ...prev, sup: false }))}
                  className={`py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    !state.sup
                      ? 'bg-[#2a2410] border-[#d8b25c] text-[#f2d491]'
                      : 'bg-[#1c2216] border-[#2b3322] text-[#a8a493]'
                  }`}
                >
                  لا أستخدم مكملًا
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate((prev) => ({ ...prev, sup: true }))}
                  className={`py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    state.sup
                      ? 'bg-[#2a2410] border-[#d8b25c] text-[#f2d491]'
                      : 'bg-[#1c2216] border-[#2b3322] text-[#a8a493]'
                  }`}
                >
                  أستخدم مكمل بروتين
                </button>
              </div>
              {state.sup && (
                <Stepper
                  label="كمية البروتين الصافي من المكمل يوميًا"
                  value={state.supg}
                  unit="غ / يوم (يُخصم من حاجة الطعام)"
                  step={5}
                  min={0}
                  max={150}
                  onChange={(supg) => onUpdate((prev) => ({ ...prev, supg }))}
                />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-3 rounded-xl bg-[#1c2216] border border-[#2b3322] text-sm font-bold text-[#f4f1e6] cursor-pointer"
            >
              رجوع
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="flex-1 py-3 rounded-xl font-extrabold text-[#171204] bg-gradient-to-l from-[#f2d491] to-[#d8b25c] cursor-pointer"
            >
              احسب احتياجي العلمي
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          {res.err ? (
            <div className="bg-[#2a1512] border border-[#e86a5a] rounded-2xl p-4 flex gap-3 text-sm text-[#f4f1e6]">
              <AlertTriangle className="w-5 h-5 text-[#e86a5a] shrink-0" />
              <div>{res.err}</div>
            </div>
          ) : (
            <>
              <div className="text-center py-2">
                <div className="text-xs font-semibold text-[#9b988d] mb-2">احتياجك اليومي المستهدف</div>
                <SvgRing progress={1} size={184} strokeWidth={8} color="#c9a85c" trackColor="#262b24">
                  <div className="text-4xl font-bold text-[#e5cf94] tabular-nums">
                    {round0(res.kcal)}
                  </div>
                  <div className="text-xs text-[#9b988d]">kcal / يوم</div>
                </SvgRing>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#141714] border border-[#262b24] rounded-2xl p-3 text-center">
                  <div className="text-xl font-bold text-[#f3f1ec] tabular-nums">
                    {round0(res.P)} غ
                  </div>
                  <div className="text-[11px] text-[#9b988d]">بروتين</div>
                </div>
                <div className="bg-[#141714] border border-[#262b24] rounded-2xl p-3 text-center">
                  <div className="text-xl font-bold text-[#f3f1ec] tabular-nums">
                    {round0(res.C)} غ
                  </div>
                  <div className="text-[11px] text-[#9b988d]">كارب</div>
                </div>
                <div className="bg-[#141714] border border-[#262b24] rounded-2xl p-3 text-center">
                  <div className="text-xl font-bold text-[#f3f1ec] tabular-nums">
                    {round0(res.F)} غ
                  </div>
                  <div className="text-[11px] text-[#9b988d]">دهون</div>
                </div>
              </div>

              <EquationTable state={state} result={res} />
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-3 rounded-xl bg-[#1c2216] border border-[#2b3322] text-sm font-bold text-[#f4f1e6] cursor-pointer"
            >
              تعديل
            </button>
            <button
              type="button"
              disabled={Boolean(res.err)}
              onClick={onFinish}
              className="flex-1 py-3.5 rounded-xl font-extrabold text-[#171204] bg-gradient-to-l from-[#f2d491] to-[#d8b25c] disabled:opacity-40 cursor-pointer"
            >
              ادخل إلى التطبيق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
