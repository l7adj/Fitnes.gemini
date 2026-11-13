import React from 'react';
import proteinHero from '../assets/images/dish_atelier_protein_1794529578370.jpg';
import { ArrowLeft, ArrowUpLeft, BadgeCheck, ChefHat, Clock3, ShieldCheck, Sparkles } from 'lucide-react';

interface WelcomeViewProps {
  onStart: () => void;
}

const principles = [
  { icon: BadgeCheck, title: 'محسوبة علمياً', detail: 'احتياجك الغذائي يُبنى على بياناتك، لا على التخمين.' },
  { icon: ChefHat, title: 'تُحضّر خصيصاً لك', detail: 'مكونات واضحة وأوزان دقيقة لكل وجبة.' },
  { icon: Clock3, title: 'تصل في وقتها', detail: 'تخطيط مسبق ينسّق الطلب والتحضير والتسليم.' },
  { icon: ShieldCheck, title: 'خصوصيتك أولاً', detail: 'ملفك وتفضيلاتك جزء من تجربتك الشخصية.' },
];

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onStart }) => (
  <main dir="rtl" className="nf-welcome min-h-screen overflow-hidden bg-[#0b0e0c] text-[#f4f1e9]">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-48 left-[-8rem] h-[34rem] w-[34rem] rounded-full bg-[#b69a61]/10 blur-[110px]" />
      <div className="absolute right-[-10rem] top-[34rem] h-[28rem] w-[28rem] rounded-full bg-[#47634d]/10 blur-[100px]" />
    </div>

    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12">
      <a href="#" className="group flex items-center gap-3 no-underline" aria-label="NutriFit DZ">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#bda36c]/35 bg-[#bda36c]/10 text-[#d8c18b]">
          <Sparkles size={18} strokeWidth={1.5} />
        </span>
        <span>
          <span className="block text-[15px] font-semibold tracking-[.22em] text-[#eee8d9]">NUTRIFIT</span>
          <span className="mt-0.5 block text-[9px] tracking-[.28em] text-[#9e967f]">PRIVATE NUTRITION · DZ</span>
        </span>
      </a>
      <div className="absolute top-[5.6rem] right-5 z-20 rounded-full border border-[#d4a24c]/30 bg-[#241e12]/90 px-3 py-1.5 text-[10px] text-[#e5cf94] sm:right-8 lg:right-12">
        نسخة معاينة تفاعلية · لا تستقبل طلبات فعلية
      </div>
      <div className="hidden items-center gap-7 text-[12px] text-[#b8b4a8] md:flex">
        <a href="#method" className="transition hover:text-[#e4d1a2]">منهجيتنا</a>
        <a href="#experience" className="transition hover:text-[#e4d1a2]">التجربة</a>
        <span className="rounded-full border border-white/10 px-4 py-2 text-[#c9b783]">خدمة تغذية مخصصة</span>
      </div>
      <button onClick={onStart} className="rounded-full border border-[#c5ad78]/45 px-4 py-2.5 text-[11px] font-semibold text-[#e5d5ad] transition hover:bg-[#c5ad78]/10">
        ابدأ رحلتك <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
      </button>
    </header>

    <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 md:pt-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:px-12 lg:pb-24">
      <div className="max-w-2xl">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c4aa70]/25 bg-[#c4aa70]/[.07] px-4 py-2 text-[10px] tracking-wide text-[#d6c28f]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c8ae73]" />
          تغذية رياضية مصممة حولك
        </div>
        <h1 className="max-w-xl text-[2.65rem] font-semibold leading-[1.28] tracking-[-.045em] text-[#f4f0e6] sm:text-5xl lg:text-[4.15rem]">
          أداؤك يستحق<br />
          <span className="font-light text-[#c9b783]">ما هو أدقّ من التخمين.</span>
        </h1>
        <p className="mt-6 max-w-lg text-[14px] leading-8 text-[#aaa99f] sm:text-[15px]">
          برنامج غذائي يُبنى على قياساتك وهدفك، ووجبات طازجة تُحضّر بمقادير موزونة لتعرف ما تأكله، ولماذا تأكله.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button onClick={onStart} className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#d2bd8b] px-7 text-[13px] font-bold text-[#171811] shadow-[0_12px_45px_rgba(190,163,105,.13)] transition hover:-translate-y-0.5 hover:bg-[#e0cea1]">
            صمّم برنامجي الغذائي
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
          </button>
          <a href="#method" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/10 px-6 text-[12px] text-[#d0cbbd] transition hover:border-[#c9b783]/40">
            اكتشف المنهجية <ArrowUpLeft className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/[.08] pt-6 text-[10px] text-[#858579]">
          <span className="flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5 text-[#c8b27e]" /> حسابات قابلة للتفسير</span>
          <span className="flex items-center gap-2"><ChefHat className="h-3.5 w-3.5 text-[#c8b27e]" /> تحضير حسب الطلب</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[#c8b27e]" /> عناية بالتفاصيل</span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[590px]">
        <div className="absolute -inset-5 rounded-[2rem] border border-[#c8b27e]/10" />
        <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#171a16] shadow-[0_35px_100px_rgba(0,0,0,.45)]">
          <img src={proteinHero} alt="وجبة رياضية محضرة بعناية" className="h-[340px] w-full object-cover sm:h-[440px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c100d] via-[#0c100d]/5 to-transparent" />
          <div className="absolute right-5 top-5 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[9px] tracking-[.16em] text-white/85 backdrop-blur-md">THE NUTRITION ATELIER</div>
          <div className="absolute inset-x-5 bottom-5">
            <p className="text-[10px] tracking-[.2em] text-[#d8c28f]">BUILT AROUND YOUR NUMBERS</p>
            <p className="mt-2 text-2xl font-medium text-white sm:text-3xl">كل غرام له غاية.</p>
            <p className="mt-1 text-[11px] text-white/65">من الحساب الغذائي إلى الطبق الذي يصلك.</p>
          </div>
        </div>
        <div className="absolute -bottom-5 -left-2 rounded-2xl border border-white/10 bg-[#171b16]/95 px-4 py-3 shadow-2xl backdrop-blur-xl sm:-left-7 sm:px-5">
          <p className="text-[9px] tracking-[.14em] text-[#bba879]">PERSONALIZED · PRECISE · FRESH</p>
          <p className="mt-1 text-[12px] font-medium text-[#eee9dc]">تغذية تُصمّم لتناسب يومك</p>
        </div>
      </div>
    </section>

    <section id="method" className="relative z-10 border-y border-white/[.07] bg-white/[.018]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:px-12 lg:py-16">
        <div>
          <p className="text-[10px] tracking-[.2em] text-[#c7b17e]">A MORE CONSIDERED APPROACH</p>
          <h2 className="mt-3 text-2xl font-medium leading-relaxed text-[#f0ecdf]">ليست وجبات جاهزة.<br />إنها منظومة مصممة لك.</h2>
          <p className="mt-3 max-w-sm text-[12px] leading-7 text-[#99998e]">نربط بين بياناتك، احتياجك، اختيارك، والتحضير الفعلي في مسار واحد واضح.</p>
        </div>
        <div id="experience" className="grid gap-3 sm:grid-cols-2">
          {principles.map(({ icon: Icon, title, detail }, index) => (
            <article key={title} className="rounded-2xl border border-white/[.08] bg-[#121612]/75 p-5 transition hover:border-[#c5ad78]/30">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c5ad78]/10 text-[#d2bd8b]"><Icon size={17} strokeWidth={1.6} /></span>
                <span className="text-[10px] tracking-[.16em] text-[#696d62]">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-[14px] font-semibold text-[#e9e4d7]">{title}</h3>
              <p className="mt-2 text-[11px] leading-6 text-[#96978c]">{detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-[10px] text-[#73766c] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
      <span>© {new Date().getFullYear()} NutriFit DZ · Private Nutrition</span>
      <span>الدقة في التخطيط. العناية في التحضير.</span>
    </footer>
  </main>
);
