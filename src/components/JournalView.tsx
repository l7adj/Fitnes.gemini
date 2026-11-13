import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { compressProgressImage } from '../utils/image';
import {
  addDays,
  algiersNow,
  formatArabicDate,
  round1,
  suggestWeeklyCalibration,
} from '../utils/nutrition';
import { Camera, Check, Trash2, TrendingDown, TrendingUp } from 'lucide-react';

interface JournalViewProps {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onToast: (msg: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  state,
  onUpdate,
  onToast,
}) => {
  const [weightInput, setWeightInput] = useState<string>(String(state.w));
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([
    null,
    null,
  ]);
  const [uploading, setUploading] = useState(false);

  const today = algiersNow().d;

  const sortedAll = useMemo(
    () => [...state.jr].sort((a, b) => (a.d < b.d ? -1 : 1)),
    [state.jr]
  );

  const chartEntries = useMemo(() => {
    if (state.chartRange === 'all') return sortedAll;
    const days = state.chartRange === '1m' ? 30 : 90;
    const cutoff = addDays(today, -days);
    return sortedAll.filter((e) => e.d >= cutoff);
  }, [sortedAll, state.chartRange, today]);

  const calibration = useMemo(() => suggestWeeklyCalibration(state), [state]);

  const handleSaveWeight = () => {
    const val = parseFloat(weightInput);
    if (!val || val < 30 || val > 300) {
      onToast('أدخل وزنًا صحيحًا بين 30 و300 كغ');
      return;
    }
    onUpdate((prev) => {
      const filtered = prev.jr.filter((e) => e.d !== today);
      return {
        ...prev,
        w: val,
        jr: [...filtered, { d: today, w: round1(val) }],
      };
    });
    onToast('تم تسجيل وزن اليوم');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressProgressImage(file);
      const newPhoto = {
        id: `ph_${Date.now()}`,
        date: today,
        weight: state.w,
        dataUrl,
      };
      onUpdate((prev) => ({
        ...prev,
        photos: [newPhoto, ...prev.photos],
      }));
      onToast('تم حفظ صورة التقدم (مضغوطة 900px)');
    } catch {
      onToast('تعذر معالجة الصورة');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const firstWeight = sortedAll.length > 0 ? sortedAll[0].w : state.w;
  const currentWeight = sortedAll.length > 0 ? sortedAll[sortedAll.length - 1].w : state.w;
  const deltaStart = round1(currentWeight - firstWeight);

  // SVG Chart Geometry
  const chartW = 540;
  const chartH = 180;
  const padX = 22;
  const padY = 18;
  const allVals = [...chartEntries.map((e) => e.w), state.targetWeight];
  const minW = allVals.length ? Math.min(...allVals) - 0.8 : 75;
  const maxW = allVals.length ? Math.max(...allVals) + 0.8 : 85;
  const span = Math.max(1, maxW - minW);

  const getY = (w: number) =>
    chartH - padY - ((w - minW) / span) * (chartH - padY * 2);
  const getX = (i: number, len: number) =>
    len <= 1 ? chartW / 2 : padX + (i / (len - 1)) * (chartW - padX * 2);

  const pointsStr = chartEntries
    .map((e, i) => `${getX(i, chartEntries.length)},${getY(e.w)}`)
    .join(' ');
  const targetY = getY(state.targetWeight);

  const photoA = state.photos.find((p) => p.id === compareIds[0]);
  const photoB = state.photos.find((p) => p.id === compareIds[1]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-[#f4f1e6]">الجورنال وتطور الجسم</h1>
        <div className="flex items-center gap-2 text-xs text-[#a8a493]">
          <span>الوزن المستهدف:</span>
          <input
            type="number"
            step="0.5"
            value={state.targetWeight}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 35 && v <= 250) {
                onUpdate((prev) => ({ ...prev, targetWeight: v }));
              }
            }}
            className="w-16 bg-[#141910] border border-[#2b3322] rounded-lg px-2 py-1 text-center font-num font-bold text-[#d8b25c]"
          />
          <span>كغ</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Weight Logger + SVG Chart + History */}
        <div className="lg:col-span-7 space-y-4">
          {/* Log Today's Weight */}
          <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4">
            <label className="block text-xs font-bold text-[#a8a493] mb-2">
              تسجيل وزن اليوم ({formatArabicDate(today)})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="flex-1 bg-[#1c2216] border border-[#2b3322] rounded-xl px-3.5 py-2.5 font-num text-base font-bold text-[#f4f1e6]"
                placeholder={String(state.w)}
              />
              <button
                type="button"
                onClick={handleSaveWeight}
                className="px-6 py-2.5 rounded-xl font-extrabold text-sm text-[#171204] bg-gradient-to-l from-[#f2d491] to-[#d8b25c] cursor-pointer"
              >
                حفظ
              </button>
            </div>
          </div>

          {/* Current Stats + SVG Weight Chart */}
          <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[#a8a493]">الوزن الحالي</div>
                <div className="font-num text-3xl sm:text-4xl font-extrabold text-[#f4f1e6] tabular-nums mt-0.5">
                  {currentWeight} <span className="text-sm font-normal text-[#a8a493]">كغ</span>
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs text-[#a8a493]">الفرق منذ البداية</div>
                <div
                  className={`font-num text-base font-extrabold flex items-center justify-end gap-1 mt-0.5 tabular-nums ${
                    deltaStart <= 0 ? 'text-[#5bc88a]' : 'text-[#e8b04b]'
                  }`}
                >
                  {deltaStart <= 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                  {deltaStart > 0 ? `+${deltaStart}` : deltaStart} كغ
                </div>
              </div>
            </div>

            {/* Range Switcher */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 p-1 bg-[#1c2216] border border-[#2b3322] rounded-xl">
                {(
                  [
                    ['1m', 'شهر'],
                    ['3m', '3 أشهر'],
                    ['all', 'الكل'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onUpdate((prev) => ({ ...prev, chartRange: key }))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      state.chartRange === key
                        ? 'bg-[#2a2410] text-[#f2d491]'
                        : 'text-[#a8a493]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {hoverIdx !== null && chartEntries[hoverIdx] && (
                <div className="font-num text-xs text-[#f2d491] font-bold">
                  {formatArabicDate(chartEntries[hoverIdx].d)}: {chartEntries[hoverIdx].w} كغ
                </div>
              )}
            </div>

            {/* SVG Line Chart with Target Line */}
            {chartEntries.length > 0 ? (
              <div className="w-full overflow-hidden" dir="ltr">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto block">
                  <defs>
                    <linearGradient id="nfWeightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d8b25c" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#d8b25c" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Target Weight Line */}
                  <line
                    x1={padX}
                    y1={targetY}
                    x2={chartW - padX}
                    y2={targetY}
                    stroke="#6ca87d"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                  />
                  <text
                    x={chartW - padX}
                    y={targetY - 6}
                    textAnchor="end"
                    fill="#6ca87d"
                    fontSize="11"
                  >
                    هدف {state.targetWeight} كغ
                  </text>

                  {/* Area + Polyline */}
                  {chartEntries.length > 1 && (
                    <>
                      <polygon
                        fill="url(#nfWeightGrad)"
                        points={`${getX(0, chartEntries.length)},${chartH - padY} ${pointsStr} ${getX(
                          chartEntries.length - 1,
                          chartEntries.length
                        )},${chartH - padY}`}
                      />
                      <polyline
                        fill="none"
                        stroke="#c9a85c"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={pointsStr}
                      />
                    </>
                  )}

                  {/* Data Points */}
                  {chartEntries.map((e, i) => {
                    const cx = getX(i, chartEntries.length);
                    const cy = getY(e.w);
                    const active = hoverIdx === i;
                    return (
                      <g
                        key={e.d}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoverIdx(i)}
                        onClick={() => setHoverIdx(i)}
                      >
                        <circle cx={cx} cy={cy} r={14} fill="transparent" />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={active ? 5 : 3.2}
                          fill={active ? '#e5cf94' : '#c9a85c'}
                          stroke="#0c0e0c"
                          strokeWidth="1.5"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="text-xs text-[#716e5e] py-6 text-center">
                سجّل قياسين على الأقل لعرض المنحنى البياني.
              </div>
            )}
          </div>

          {/* Recent Measurements Table */}
          {sortedAll.length > 0 && (
            <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4">
              <h2 className="text-sm font-bold text-[#f4f1e6] mb-2">سجل القياسات</h2>
              <div className="divide-y divide-[#2b3322] max-h-60 overflow-y-auto">
                {[...sortedAll].reverse().map((e) => (
                  <div
                    key={e.d}
                    className="py-2 flex items-center justify-between text-xs"
                  >
                    <span className="text-[#a8a493]">{formatArabicDate(e.d)}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-num font-bold text-[#f4f1e6] tabular-nums">
                        {e.w} كغ
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate((prev) => ({
                            ...prev,
                            jr: prev.jr.filter((x) => x.d !== e.d),
                          }))
                        }
                        className="text-[#716e5e] hover:text-[#e86a5a] cursor-pointer"
                        aria-label="حذف القياس"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Smart Weekly Calibration + Progress Photos */}
        <div className="lg:col-span-5 space-y-4">
          {/* Weekly Adherence + Smart Linear Regression Calibration */}
          <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#d8b25c]">
                المعايرة الأسبوعية الذكية (انحدار 28 يومًا)
              </h2>
              <span className="font-num text-[10px] border border-[#d8b25c]/50 text-[#d8b25c] rounded px-1.5 py-0.5">
                C
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#a8a493]">نسبة الالتزام الأسبوعي بالخطة</span>
                <span className="font-num font-extrabold text-[#f2d491] tabular-nums">
                  {state.adh}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={2}
                value={state.adh}
                onChange={(e) =>
                  onUpdate((prev) => ({ ...prev, adh: Number(e.target.value) }))
                }
                className="w-full accent-[#d8b25c] cursor-pointer"
              />
              <div className="text-[11px] text-[#716e5e] mt-1">
                لا يُقترح أي تغيير في السعرات إذا كان الالتزام أقل من 80%.
              </div>
            </div>

            {calibration.rateKgPerWeek !== null && (
              <div className="bg-[#1c2216] border border-[#2b3322] rounded-xl p-3 flex justify-between text-xs font-num tabular-nums">
                <span className="text-[#a8a493]">المعدل المحسوب (28 يومًا):</span>
                <span className="font-bold text-[#f4f1e6]">
                  {calibration.rateKgPerWeek > 0 ? '+' : ''}
                  {calibration.rateKgPerWeek} كغ / أسبوع
                </span>
              </div>
            )}

            <p className="text-xs text-[#f4f1e6] leading-relaxed bg-[#1c2216] border border-[#2b3322] rounded-xl p-3">
              {calibration.reason}
            </p>

            {calibration.canSuggest && state.calDismissedDate !== today && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onUpdate((prev) => ({
                      ...prev,
                      pct: prev.pct + calibration.deltaPct,
                      cal: [
                        ...prev.cal,
                        {
                          d: today,
                          deltaPct: calibration.deltaPct,
                          rateKgPerWeek: calibration.rateKgPerWeek || 0,
                        },
                      ],
                    }));
                    onToast(`تم اعتماد تعديل ${calibration.deltaPct > 0 ? '+' : ''}${calibration.deltaPct}%`);
                  }}
                  className="py-2.5 rounded-xl font-extrabold text-xs text-[#171204] bg-gradient-to-l from-[#f2d491] to-[#d8b25c] cursor-pointer"
                >
                  اعتماد ({calibration.deltaPct > 0 ? '+5%' : '−5%'})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate((prev) => ({ ...prev, calDismissedDate: today }))
                  }
                  className="py-2.5 rounded-xl font-bold text-xs text-[#a8a493] bg-[#1c2216] border border-[#2b3322] cursor-pointer"
                >
                  تجاهل اليوم
                </button>
              </div>
            )}
          </div>

          {/* Progress Photos (900px, JPEG 0.72) */}
          <div className="bg-[#141910] border border-[#2b3322] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#f4f1e6]">صور التقدم</h2>
                <div className="text-[11px] text-[#a8a493]">
                  ضغط تلقائي محلي (900px · JPEG 0.72)
                </div>
              </div>
              <label className="px-3.5 py-2 rounded-xl bg-[#1c2216] border border-[#d8b25c]/50 text-xs font-bold text-[#f2d491] flex items-center gap-1.5 cursor-pointer hover:bg-[#2a2410]">
                <Camera className="w-3.5 h-3.5" />
                <span>{uploading ? 'جاري الضغط...' : 'رفع صورة'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {state.photos.length === 0 ? (
              <div className="text-xs text-[#716e5e] bg-[#1c2216] border border-[#2b3322] rounded-xl p-4 text-center">
                لم تُرفع صور تقدم بعد. ارفع صورتين على الأقل للمقارنة قبل/بعد مع فرق الوزن.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {state.photos.map((ph) => {
                    const selIdx = compareIds.indexOf(ph.id);
                    return (
                      <div
                        key={ph.id}
                        className={`relative rounded-xl overflow-hidden border bg-[#1c2216] ${
                          selIdx >= 0 ? 'border-[#d8b25c]' : 'border-[#2b3322]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (compareIds[0] === ph.id) {
                              setCompareIds([null, compareIds[1]]);
                            } else if (compareIds[1] === ph.id) {
                              setCompareIds([compareIds[0], null]);
                            } else if (!compareIds[0]) {
                              setCompareIds([ph.id, compareIds[1]]);
                            } else {
                              setCompareIds([compareIds[0], ph.id]);
                            }
                          }}
                          className="w-full block text-right cursor-pointer"
                        >
                          <img
                            src={ph.dataUrl}
                            alt={`صورة تقدم ${ph.date}`}
                            className="w-full aspect-[3/4] object-cover"
                          />
                          <div className="p-1.5 text-[10px] font-num text-[#f4f1e6] flex justify-between">
                            <span>{ph.date.slice(5)}</span>
                            <span className="text-[#d8b25c] font-bold">{ph.weight}كغ</span>
                          </div>
                        </button>
                        {selIdx >= 0 && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-[#d8b25c] text-[#171204] flex items-center justify-center text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onUpdate((prev) => ({
                              ...prev,
                              photos: prev.photos.filter((x) => x.id !== ph.id),
                            }));
                            setCompareIds([
                              compareIds[0] === ph.id ? null : compareIds[0],
                              compareIds[1] === ph.id ? null : compareIds[1],
                            ]);
                          }}
                          className="absolute top-1.5 left-1.5 p-1 rounded-md bg-black/70 text-[#e86a5a] cursor-pointer"
                          aria-label="حذف الصورة"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Before / After Comparison */}
                {photoA && photoB && (
                  <div className="bg-[#1c2216] border border-[#d8b25c]/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#d8b25c]">مقارنة قبل / بعد</span>
                      <span className="font-num text-[#f2d491]">
                        الفرق: {round1(photoB.weight - photoA.weight) > 0 ? '+' : ''}
                        {round1(photoB.weight - photoA.weight)} كغ
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[photoA, photoB].map((p, idx) => (
                        <div key={p.id} className="space-y-1">
                          <img
                            src={p.dataUrl}
                            alt={idx === 0 ? 'قبل' : 'بعد'}
                            className="w-full aspect-[3/4] object-cover rounded-lg"
                          />
                          <div className="text-[11px] text-center font-num text-[#a8a493]">
                            {p.date} · <b className="text-[#f4f1e6]">{p.weight} كغ</b>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
