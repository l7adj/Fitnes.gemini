import React, { useState } from 'react';
import { apiRequest, ApiSession } from '../services/api';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

interface AuthViewProps {
  onAuthenticated: (session: ApiSession) => Promise<void>;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode,setMode] = useState<'login'|'register'>('login');
  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await apiRequest<ApiSession>(
        mode === 'register' ? '/api/auth/register' : '/api/auth/login',
        undefined,
        { method:'POST', body:JSON.stringify({name,email,password}) }
      );
      await onAuthenticated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إكمال العملية.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#0b0e0c] text-[#f4f1e9] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#bda36c]/35 bg-[#bda36c]/10 text-[#d8c18b]">
            <Sparkles size={21} />
          </div>
          <div className="text-xs tracking-[.24em] text-[#c9b783]">NUTRIFIT PRIVATE NUTRITION · DZ</div>
          <h1 className="mt-4 text-2xl font-semibold">مساحتك الغذائية الخاصة</h1>
          <p className="mt-2 text-sm leading-6 text-[#aaa79b]">سجّل الدخول لمتابعة ملفك وخطط وجباتك وطلباتك.</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-[#34372e] bg-[#121612] p-5 sm:p-7 space-y-4 shadow-2xl">
          <div className="flex rounded-xl bg-[#0d100d] p-1">
            <button type="button" onClick={() => {setMode('login');setError('');}} className={'flex-1 rounded-lg py-2.5 text-xs font-bold ' + (mode==='login'?'bg-[#292519] text-[#e5cf94]':'text-[#969387]')}>تسجيل الدخول</button>
            <button type="button" onClick={() => {setMode('register');setError('');}} className={'flex-1 rounded-lg py-2.5 text-xs font-bold ' + (mode==='register'?'bg-[#292519] text-[#e5cf94]':'text-[#969387]')}>إنشاء حساب</button>
          </div>

          {mode === 'register' && (
            <label className="block space-y-1.5">
              <span className="text-xs text-[#c9c5b8]">الاسم الذي سيظهر في ملفك</span>
              <input value={name} onChange={(e)=>setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" className="w-full rounded-xl border border-[#34372e] bg-[#0c100d] px-3 py-3 text-sm outline-none focus:border-[#c9a85c]" placeholder="اسمك" />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs text-[#c9c5b8]">البريد الإلكتروني</span>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} required type="email" autoComplete="email" className="w-full rounded-xl border border-[#34372e] bg-[#0c100d] px-3 py-3 text-sm outline-none focus:border-[#c9a85c]" placeholder="name@example.com" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-[#c9c5b8]">كلمة المرور</span>
            <input value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={mode==='register'?12:1} maxLength={128} type="password" autoComplete={mode==='register'?'new-password':'current-password'} className="w-full rounded-xl border border-[#34372e] bg-[#0c100d] px-3 py-3 text-sm outline-none focus:border-[#c9a85c]" placeholder={mode==='register'?'12 حرفاً على الأقل':'كلمة المرور'} />
            {mode === 'register' && <span className="block text-[10px] text-[#77786e]">استخدم كلمة مرور طويلة وفريدة لا تستعملها في خدمة أخرى.</span>}
          </label>

          {error && <div role="alert" className="rounded-xl border border-[#b65e52]/40 bg-[#2a1714] p-3 text-xs leading-5 text-[#efb9ad]">{error}</div>}

          <button disabled={busy} type="submit" className="w-full rounded-xl bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] py-3.5 text-sm font-extrabold text-[#17140d] disabled:opacity-50">
            {busy ? 'جارٍ التحقق…' : mode==='register'?'إنشاء حساب خاص':'الدخول إلى حسابي'}
            {!busy && <ArrowLeft className="mr-1 inline h-4 w-4" />}
          </button>

          <div className="flex items-start gap-2 border-t border-[#292d25] pt-4 text-[10px] leading-5 text-[#8f9085]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#bba36d]" />
            بيانات الحساب والملف الصحي تُرسل إلى خادم الخدمة عبر اتصال HTTPS عند تفعيل النسخة المتصلة. لا تدخل بيانات طبية غير لازمة.
          </div>
        </form>
      </div>
    </main>
  );
};
