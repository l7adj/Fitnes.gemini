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
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pickerRequest, setPickerRequest] = useState<{ slot: number; seq: number } | null>(null);

  useEffect(() => {
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
          onFinish={() =>
            setState((prev) => ({ ...prev, ob: 6, tab: 'home' }))
          }
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
        <span className="text-[11px] font-semibold text-[#6d6b62]">
          NutriFit DZ · بوابة العميل
        </span>
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
              الشراقة · مطبخ رياضي خاص
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
