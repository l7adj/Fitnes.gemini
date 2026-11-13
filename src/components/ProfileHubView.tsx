import React from 'react';
import { AppState } from '../types';
import { AccountView } from './AccountView';
import { JournalView } from './JournalView';
import { Activity, Calculator } from 'lucide-react';

export type ProfileSubtab = 'progress' | 'account';

interface ProfileHubViewProps {
  state: AppState;
  subtab: ProfileSubtab;
  onChangeSubtab: (next: ProfileSubtab) => void;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onReopenCalc: () => void;
  onResetAll: () => void;
  onToast: (msg: string) => void;
}

export const ProfileHubView: React.FC<ProfileHubViewProps> = ({
  state,
  subtab,
  onChangeSubtab,
  onUpdate,
  onReopenCalc,
  onResetAll,
  onToast,
}) => {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#232329] pb-4">
        <div>
          <div className="text-[11px] font-medium text-[#c8a96e]">
            الملف الشخصي والمنهجية العلمية
          </div>
          <h1 className="text-2xl font-bold text-[#f3f1ec] mt-0.5">
            {state.name || 'ملفك الرياضي'}
          </h1>
        </div>

        {/* Clean 2-Tab Segmented Switcher */}
        <div
          role="tablist"
          aria-label="أقسام الملف والتطور"
          className="grid grid-cols-2 sm:inline-flex gap-1 p-1 bg-[#111114] border border-[#232329] rounded-xl"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subtab === 'progress'}
            onClick={() => onChangeSubtab('progress')}
            className={`touch-press min-h-[42px] px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              subtab === 'progress'
                ? 'bg-[#1c1a15] text-[#e6d1a3] border border-[#c8a96e]/40'
                : 'text-[#96938a] hover:text-[#f3f1ec] border border-transparent'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>التطور والقياسات</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subtab === 'account'}
            onClick={() => onChangeSubtab('account')}
            className={`touch-press min-h-[42px] px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              subtab === 'account'
                ? 'bg-[#1c1a15] text-[#e6d1a3] border border-[#c8a96e]/40'
                : 'text-[#96938a] hover:text-[#f3f1ec] border border-transparent'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>المعادلات والبيانات</span>
          </button>
        </div>
      </div>

      {subtab === 'progress' ? (
        <JournalView state={state} onUpdate={onUpdate} onToast={onToast} embedded />
      ) : (
        <AccountView
          state={state}
          onReopenCalc={onReopenCalc}
          onResetAll={onResetAll}
          onToast={onToast}
          embedded
        />
      )}
    </div>
  );
};
