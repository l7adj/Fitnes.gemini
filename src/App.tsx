import React, { useEffect, useState } from 'react';
import { createInitialState, STATE_VERSION } from './data/seed';
import { AppState, AppTab } from './types';
import { GlobalStatusBar } from './components/GlobalStatusBar';
import { WelcomeView } from './components/WelcomeView';
import { CalculatorWizard } from './components/CalculatorWizard';
import { TodayView } from './components/TodayView';
import { MenuView } from './components/MenuView';
import { CartView } from './components/CartView';
import { JournalView } from './components/JournalView';
import { AccountView } from './components/AccountView';
import { AdminView } from './components/AdminView';
import { AuthView } from './components/AuthView';
import { API_ENABLED, apiRequest, ApiSession, ApiUser } from './services/api';
import {
  Home,
  ShoppingBag,
  Sliders,
  TrendingUp,
  User,
  UtensilsCrossed,
} from 'lucide-react';

const STORAGE_KEY = 'nutrifit_dz_state_v2';

interface ToastItem {
  id: number;
  msg: string;
  undo?: () => void;
}

function loadState(): AppState {
  const defaults = createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      if (parsed && parsed.ver === STATE_VERSION && Array.isArray(parsed.foods)) {
        return {
          ...defaults,
          ...parsed,
          // The local prototype has no server-side identity provider. Never
          // restore an operator session or expose the admin route to customers.
          tab: parsed.tab === 'admin' ? 'home' : parsed.tab,
          adminMode: false,
          zones:
            Array.isArray(parsed.zones) && parsed.zones.length > 0
              ? parsed.zones
              : defaults.zones,
          pricingConfig: parsed.pricingConfig
            ? { ...defaults.pricingConfig, ...parsed.pricingConfig }
            : defaults.pricingConfig,
          mealNames:
            Array.isArray(parsed.mealNames) && parsed.mealNames.length > 0
              ? parsed.mealNames
              : defaults.mealNames,
          activeSlot: typeof parsed.activeSlot === 'number' ? parsed.activeSlot : 0,
        };
      }
    }
  } catch {
    // ignore corrupted local storage
  }
  return defaults;
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [showWelcome, setShowWelcome] = useState(() => state.ob === 0);
  const [session, setSession] = useState<ApiSession | null>(null);
  const [sessionReady, setSessionReady] = useState(!API_ENABLED);

  const hydrateRemoteWorkspace = async (token: string, user: ApiUser) => {
    const [profileResponse, foodsResponse, dishesResponse, zonesResponse] = await Promise.all([
      apiRequest<{ profile: any }>('/api/profile', token),
      apiRequest<{ foods: any[] }>('/api/foods', token),
      apiRequest<{ dishes: any[] }>('/api/dishes', token),
      apiRequest<{ zones: any[] }>('/api/zones', token),
    ]);
    const profile = profileResponse.profile;
    const foods = foodsResponse.foods.map((food) => ({
      id: food.id,
      emoji: food.category === 'protein' ? '🍗' : food.category === 'carb' ? '🍚' : food.category === 'fat' ? '🫒' : food.category === 'veg' ? '🥦' : '🥤',
      name: food.name_ar,
      cat: food.category,
      unitLabel: food.category === 'juice' ? '100مل' : undefined,
      per100: {
        kcal: Number(food.kcal_per_100), p: Number(food.protein_per_100),
        c: Number(food.carbs_per_100), f: Number(food.fat_per_100), fiber: Number(food.fiber_per_100),
      },
      price: Number(food.price_dzd_per_100),
      al: food.allergens ?? [],
      available: true,
      nutritionDataStatus: 'verified' as const,
      nutritionBasis: food.nutrition_basis,
      nutritionSource: food.nutrition_source,
    }));
    const dishes = dishesResponse.dishes.map((dish) => ({
      id: dish.id,
      emoji: '🍽️',
      name: dish.name_ar,
      ing: (dish.ingredients ?? []).map((ingredient: any) => [ingredient.foodId, Number(ingredient.grams)] as [string, number]),
      available: true,
    }));
    const zones = zonesResponse.zones.map((zone) => ({
      id: zone.id, title: zone.title, areas: zone.areas, hours: zone.service_hours,
      fee: Number(zone.fee_dzd), active: true,
    }));
    const hasProfile = Boolean(profile?.age);
    setState((prev) => ({
      ...prev,
      name: profile?.name || user.name,
      sex: profile?.sex || prev.sex,
      age: Number(profile?.age) || prev.age,
      h: Number(profile?.height_cm) || prev.h,
      w: Number(profile?.weight_kg) || prev.w,
      targetWeight: Number(profile?.target_weight_kg) || prev.targetWeight,
      lbm: Number(profile?.lbm_kg) || 0,
      rel: Number(profile?.lbm_reliability_pct) || 0,
      lbmMethod: profile?.lbm_method || 'none',
      band: profile?.activity_band || prev.band,
      pal: Number(profile?.pal) || prev.pal,
      goal: profile?.goal || prev.goal,
      pct: Number(profile?.goal_adjustment_pct) || 0,
      al: profile?.allergens ?? [],
      fl: profile?.health_flags ?? { preg:false,kid:false,dia:false,ed:false },
      foods,
      dishes,
      zones,
      zoneId: zones[0]?.id ?? '',
      meals: [],
      ord: [],
      jr: [],
      photos: [],
      ob: hasProfile ? 6 : 0,
      tab: 'home',
      adminMode: false,
    }));
    setShowWelcome(!hasProfile);
  };

  const handleAuthenticated = async (nextSession: ApiSession) => {
    localStorage.setItem('nf_auth_token', nextSession.token);
    setSession(nextSession);
    await hydrateRemoteWorkspace(nextSession.token, nextSession.user);
    setSessionReady(true);
  };

  const logout = () => {
    localStorage.removeItem('nf_auth_token');
    setSession(null);
    setState(createInitialState());
    setShowWelcome(true);
  };

  useEffect(() => {
    if (!API_ENABLED) return;
    let cancelled = false;
    const token = localStorage.getItem('nf_auth_token');
    if (!token) {
      setSessionReady(true);
      return;
    }
    apiRequest<{ user: ApiUser }>('/api/auth/me', token)
      .then(async ({ user }) => {
        if (cancelled) return;
        const restored = { token, user };
        setSession(restored);
        await hydrateRemoteWorkspace(token, user);
      })
      .catch(() => {
        localStorage.removeItem('nf_auth_token');
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => { cancelled = true; };
  }, []);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pickerRequest, setPickerRequest] = useState<{ slot: number; seq: number } | null>(null);

  useEffect(() => {
    if (API_ENABLED) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }, [state]);

  const showToast = (msg: string, undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, undo }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, undo ? 5000 : 2500);
  };

  const navigate = (tab: AppTab) => {
    setPickerRequest(null);
    setState((prev) => ({ ...prev, tab }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const enterOwnerWorkspace = () => {
    setPickerRequest(null);
    setState((prev) => ({ ...prev, adminMode: true, tab: 'admin' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exitOwnerWorkspace = () => {
    setState((prev) => ({ ...prev, tab: 'home' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectMealSlotAndGoMenu = (slotIdx: number) => {
    const safeIdx = Math.max(0, Math.min(state.n - 1, slotIdx));
    setState((prev) => ({
      ...prev,
      activeSlot: safeIdx,
      tab: 'menu',
    }));
    setPickerRequest((prev) => ({ slot: safeIdx, seq: (prev?.seq ?? 0) + 1 }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetAll = () => {
    const fresh = createInitialState();
    setState(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    showToast('تم تصفير جميع البيانات');
  };

  const navItems: { id: AppTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'home', label: 'اليوم', icon: <Home className="w-5 h-5" /> },
    { id: 'menu', label: 'الوجبات', icon: <UtensilsCrossed className="w-5 h-5" /> },
    {
      id: 'cart',
      label: 'السلة',
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: state.meals.length > 0 ? state.meals.length : undefined,
    },
    { id: 'jr', label: 'تطوري', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'me', label: 'حسابي', icon: <User className="w-5 h-5" /> },
  ];

  if (API_ENABLED && !sessionReady) {
    return <div className="min-h-screen bg-[#0b0e0c] text-[#e5cf94] flex items-center justify-center text-sm">جارٍ التحقق من الجلسة وتحميل ملفك…</div>;
  }
  if (API_ENABLED && !session) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }
  if (API_ENABLED && session && session.user.role !== 'customer') {
    return (
      <main dir="rtl" className="min-h-screen bg-[#0b0e0c] text-[#f4f1e9] flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-[#34372e] bg-[#121612] p-6 text-center space-y-3">
          <h1 className="text-xl font-bold">حساب فريق NutriFit</h1>
          <p className="text-sm leading-6 text-[#aaa79b]">تم تسجيل الدخول بصلاحية {session.user.role}، لكن واجهة العمليات المتصلة لم تُفعّل بعد لهذا الحساب.</p>
          <button type="button" onClick={logout} className="rounded-xl bg-[#c9a85c] px-5 py-3 text-sm font-bold text-[#17140d]">تسجيل الخروج</button>
        </div>
      </main>
    );
  }

  // Onboarding / Scientific Calculator Wizard
  if (state.ob < 6 && state.tab !== 'admin') {
    if (showWelcome) {
      return <WelcomeView onStart={() => setShowWelcome(false)} />;
    }
    return (
      <div className="min-h-screen">
        <CalculatorWizard
          state={state}
          onUpdate={setState}
          onFinish={() => {
            if (API_ENABLED && session) {
              const payload = {
                sex: state.sex, age: state.age, heightCm: state.h, weightKg: state.w,
                targetWeightKg: state.targetWeight, lbmKg: state.lbm,
                lbmReliabilityPct: state.rel, lbmMethod: state.lbmMethod ?? 'none',
                activityBand: state.band, pal: state.pal, goal: state.goal,
                goalAdjustmentPct: state.pct, allergens: state.al, healthFlags: state.fl,
              };
              void apiRequest('/api/profile', session.token, {
                method: 'PUT', body: JSON.stringify(payload),
              }).then(() => setState((prev) => ({ ...prev, ob: 6, tab: 'home' })))
                .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر حفظ الملف على الخادم.'));
            } else {
              setState((prev) => ({ ...prev, ob: 6, tab: 'home' }));
            }
          }}
        />
      </div>
    );
  }

  // DEDICATED OWNER WORKSPACE (Completely separate interface from Client App)
  if (import.meta.env.DEV && state.tab === 'admin') {
    return (
      <div className="min-h-screen pb-12">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-4">
          <AdminView
            state={state}
            onUpdate={setState}
            onExitOwner={exitOwnerWorkspace}
            onToast={showToast}
          />
        </div>

        {toasts.length > 0 && (
          <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto z-50 space-y-2 pointer-events-none">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="pointer-events-auto bg-[#171a16] border border-[#c9a85c]/70 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold text-[#f3f1ec] shadow-xl"
              >
                <span>{t.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // DEDICATED CLIENT WORKSPACE (Luxury Concierge Nutrition Experience)
  return (
    <div className="min-h-screen pb-24 lg:pb-10">
      <GlobalStatusBar state={state} />

      <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-[#6d6b62]">
            NutriFit DZ · بوابة العميل
          </span>
          {API_ENABLED && session && (
            <button type="button" onClick={logout} className="text-[10px] text-[#c9a85c] underline underline-offset-4">تسجيل الخروج</button>
          )}
        </div>
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={enterOwnerWorkspace}
            className="float-left px-3 py-1.5 rounded-lg bg-[#111411] border border-[#252823] hover:border-[#c9a85c]/60 text-[11px] font-bold text-[#c9a85c] flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>واجهة المالك · معاينة تطوير</span>
          </button>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-3 lg:flex lg:gap-6 lg:items-start">
        {/* Desktop Side Navigation Rail */}
        <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 lg:sticky lg:top-20 bg-[#111411] border border-[#252823] rounded-2xl p-3 space-y-1">
          <div className="px-3 py-2 mb-2 border-b border-[#222520]">
            <div className="text-base font-bold text-[#e5cf94] whitespace-nowrap">
              NutriFit DZ
            </div>
            <div className="text-[11px] text-[#9b988d] mt-0.5">
              معاينة تغذية رياضية مخصصة
            </div>
          </div>

          {navItems.map((item) => {
            const active = state.tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#242117] text-[#e5cf94] border border-[#c9a85c]/40'
                    : 'text-[#9b988d] hover:text-[#f3f1ec] hover:bg-[#171a16]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span className="text-[11px] bg-[#c9a85c] text-[#141108] font-bold rounded-md px-1.5 py-0.5 leading-none tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {import.meta.env.DEV && (
            <div className="pt-2 mt-2 border-t border-[#222520]">
              <button
                type="button"
                onClick={enterOwnerWorkspace}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-[#c9a85c] hover:bg-[#171a16] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Sliders className="w-4 h-4" />
                <span>واجهة المالك · معاينة تطوير</span>
              </button>
            </div>
          )}
        </aside>

        {/* Main Screen Workspace */}
        <main className="flex-1 min-w-0">
          {state.tab === 'home' && (
            <TodayView
              state={state}
              onNavigate={navigate}
              onSelectMealSlot={selectMealSlotAndGoMenu}
              onReopenCalc={() => setState((prev) => ({ ...prev, ob: 1 }))}
            />
          )}
          {state.tab === 'menu' && (
            <MenuView
              state={state}
              onUpdate={setState}
              onNavigate={navigate}
              onToast={showToast}
              pickerRequest={pickerRequest}
            />
          )}
          {state.tab === 'cart' && (
            <CartView
              state={state}
              onUpdate={setState}
              onNavigate={navigate}
              onSelectMealSlot={selectMealSlotAndGoMenu}
              onToast={showToast}
              apiEnabled={API_ENABLED}
              authToken={session?.token}
            />
          )}
          {state.tab === 'jr' && (
            <JournalView state={state} onUpdate={setState} onToast={showToast} />
          )}
          {state.tab === 'me' && (
            <AccountView
              state={state}
              onReopenCalc={() => setState((prev) => ({ ...prev, ob: 1 }))}
              onResetAll={resetAll}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="التنقل الرئيسي"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090b09]/95 backdrop-blur-md border-t border-[#252823] px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {navItems.map((item) => {
            const active = state.tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`relative flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                  active ? 'text-[#c9a85c]' : 'text-[#6d6b62] hover:text-[#9b988d]'
                }`}
              >
                {item.icon}
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="absolute top-1 left-1/2 translate-x-2 text-[9px] bg-[#c9a85c] text-[#141108] font-bold rounded-md px-1 leading-tight tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 max-w-md mx-auto z-50 space-y-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-[#171a16] border border-[#c9a85c]/70 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold text-[#f3f1ec] shadow-xl"
            >
              <span>{t.msg}</span>
              {t.undo && (
                <button
                  type="button"
                  onClick={() => {
                    t.undo?.();
                    setToasts((prev) => prev.filter((x) => x.id !== t.id));
                  }}
                  className="text-[#c9a85c] font-bold cursor-pointer shrink-0"
                >
                  تراجع
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
