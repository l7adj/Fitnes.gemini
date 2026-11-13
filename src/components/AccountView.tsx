import React, { useState } from 'react';
import { GOALS, PICKUP_POINTS, QUALITY_CHARTER } from '../data/seed';
import { AppState, AppTab } from '../types';
import { calcNutrition, round1 } from '../utils/nutrition';
import { EquationTable } from './EquationTable';
import { Calculator, Download, MapPin, ShieldCheck, Sliders, Trash2 } from 'lucide-react';

interface AccountViewProps {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onReopenCalc: () => void;
  onNavigate: (tab: AppTab) => void;
  onResetAll: () => void;
  onToast: (msg: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  state,
  onUpdate,
  onReopenCalc,
  onResetAll,
  onToast,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [showBulletin, setShowBulletin] = useState(false);
  const [showCharter, setShowCharter] = useState(false);

  const res = calcNutrition(state);

  const handleExportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrifit-dz-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      onToast('تم تصدير ملف البيانات JSON');
    } catch {
      onToast('تعذر تصدير البيانات');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#f3f1ec]">الحساب والمطبخ</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Profile + Scientific Calculator Equations */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#111411] border border-[#252823] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold text-[#f3f1ec]">
                {state.name || 'مشترك NutriFit DZ'}
              </div>
              <div className="text-xs text-[#9b988d] mt-1 tabular-nums">
                {state.sex === 'm' ? 'ذكر' : 'أنثى'} · {state.age} سنة · {state.w} كغ · {state.h} سم ·{' '}
                <span className="text-[#c9a85c] font-bold">{GOALS[state.goal].label}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onReopenCalc}
              className="px-4 py-2 rounded-xl bg-[#171a16] border border-[#c9a85c]/50 text-xs font-bold text-[#e5cf94] flex items-center gap-1.5 cursor-pointer hover:bg-[#242117]"
            >
              <Calculator className="w-3.5 h-3.5" />
              الحاسبة العلمية
            </button>
          </div>

          {!res.err && <EquationTable state={state} result={res} />}
        </div>

        {/* Right: Owner Workspace Entrance, Pickup Points, Charter, Market Bulletin & Data */}
        <div className="lg:col-span-5 space-y-4">
          {/* Owner Workspace Entrance */}
          <div className="bg-[#111411] border border-[#c9a85c]/50 rounded-2xl p-4 space-y-3">
            <div>
              <div className="text-sm font-bold text-[#e5cf94] flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#c9a85c]" />
                واجهة المالك الخاصة
              </div>
              <div className="text-xs text-[#9b988d] mt-1">
                انتقل إلى لوحتك المستقلة لتعديل الأسعار، إضافة أطعمة وأطباق جديدة، وضبط مناطق التوصيل.
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdate((prev) => ({ ...prev, adminMode: true, tab: 'admin' }))
              }
              className="w-full py-2.5 rounded-xl font-bold text-xs text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] cursor-pointer"
            >
              فتح واجهة المالك والأسعار
            </button>
          </div>

          {/* Pickup Points */}
          <div className="bg-[#111411] border border-[#252823] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#f3f1ec]">
              <MapPin className="w-4 h-4 text-[#c9a85c]" />
              <span>نقاط الاستلام والتغطية</span>
            </div>
            <div className="space-y-2">
              {PICKUP_POINTS.map((p) => (
                <div
                  key={p.name}
                  className="bg-[#171a16] border border-[#252823] rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-[#f3f1ec]">{p.name}</div>
                    <div className="text-[11px] text-[#9b988d] mt-0.5">
                      {p.area} · {p.hours}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold whitespace-nowrap ${
                      p.active ? 'text-[#5aa882]' : 'text-[#6d6b62]'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Charter (10 items) */}
          <div className="bg-[#111411] border border-[#252823] rounded-2xl p-4 space-y-2">
            <button
              type="button"
              onClick={() => setShowCharter((s) => !s)}
              className="w-full flex items-center justify-between text-sm font-bold text-[#f3f1ec] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#c9a85c]" />
                ميثاق الجودة (10 بنود)
              </span>
              <span className="text-xs text-[#c9a85c]">{showCharter ? 'إخفاء' : 'عرض'}</span>
            </button>
            {showCharter && (
              <ol className="space-y-1.5 pt-2 border-t border-[#222520] text-xs text-[#9b988d]">
                {QUALITY_CHARTER.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="font-bold text-[#c9a85c] w-5 shrink-0 tabular-nums">
                      {idx + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Weekly Frozen Market Price Bulletin */}
          <div className="bg-[#111411] border border-[#252823] rounded-2xl p-4 space-y-2">
            <button
              type="button"
              onClick={() => setShowBulletin((s) => !s)}
              className="w-full flex items-center justify-between text-sm font-bold text-[#f3f1ec] cursor-pointer"
            >
              <span>نشرة السوق الأسبوعية المجمّدة</span>
              <span className="text-xs text-[#c9a85c]">{showBulletin ? 'إخفاء' : 'عرض الأسعار'}</span>
            </button>
            {showBulletin && (
              <div className="pt-2 border-t border-[#222520] max-h-64 overflow-y-auto divide-y divide-[#222520]">
                {state.foods.map((f) => (
                  <div
                    key={f.id}
                    className={`py-2 flex items-center justify-between text-xs ${
                      f.available === false ? 'opacity-45' : ''
                    }`}
                  >
                    <span className="text-[#f3f1ec]">
                      {f.name}
                      {f.available === false && (
                        <span className="text-[#c45d51] mr-1.5 text-[10px]">(متوقف)</span>
                      )}
                    </span>
                    <span className="text-[#c9a85c] font-bold tabular-nums">
                      {round1(f.price)} دج / 100{f.cat === 'juice' ? 'مل' : 'غ'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export JSON & Reset Data */}
          <div className="bg-[#111411] border border-[#252823] rounded-2xl p-4 space-y-2.5">
            <div className="text-sm font-bold text-[#f3f1ec]">إدارة البيانات</div>
            <button
              type="button"
              onClick={handleExportJson}
              className="w-full py-2.5 rounded-xl bg-[#171a16] border border-[#252823] text-xs font-bold text-[#f3f1ec] flex items-center justify-center gap-2 hover:border-[#c9a85c]/50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#c9a85c]" />
              تصدير بياناتي (JSON)
            </button>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full py-2.5 rounded-xl bg-[#1f1412] border border-[#4a2b26] text-xs font-bold text-[#c45d51] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                تصفير جميع البيانات
              </button>
            ) : (
              <div className="bg-[#1f1412] border border-[#c45d51] rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold text-[#f3f1ec]">
                  هل تؤكد تصفير الحساب والطلبات والسجل والعودة للإعدادات الأولية؟
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmReset(false);
                      onResetAll();
                    }}
                    className="py-2 rounded-lg bg-[#c45d51] text-[#141108] text-xs font-bold cursor-pointer"
                  >
                    نعم، صفّر البيانات
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="py-2 rounded-lg bg-[#171a16] border border-[#252823] text-xs font-bold text-[#f3f1ec] cursor-pointer"
                  >
                    تراجع
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
