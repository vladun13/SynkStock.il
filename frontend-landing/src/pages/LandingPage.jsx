import React from 'react';
import { useTranslation } from 'react-i18next';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

function Hero() {
  const { t } = useTranslation();
  return (
    <section id="hero" className="relative overflow-hidden px-md pb-24 pt-xl md:px-lg">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-fixed/30 via-bg-main to-bg-main" />
      <div className="mx-auto grid grid-cols-1 items-center gap-xl md:grid-cols-2 md:max-w-container-max">
        {/* Copy */}
        <div className="z-10 space-y-6 text-right">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-fixed px-3 py-1 font-label-caps text-label-caps text-primary">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>{t('hero.badge')}</span>
          </div>
          <h1 className="text-[40px] font-bold leading-[1.1] text-on-surface md:text-[48px]">
            {t('hero.title')}
            <br />
            <span className="gradient-text">{t('hero.titleAccent')}</span>
          </h1>
          <p className="max-w-[500px] font-body-lg text-body-lg text-text-secondary">{t('hero.subtitle')}</p>
          <div className="flex items-center gap-4 pt-4">
            <a href="#cta" className="btn-gradient px-6 py-3">
              {t('hero.ctaPrimary')}
            </a>
            <button className="flex items-center gap-2 px-6 py-3 font-body-md text-body-md text-text-secondary transition-colors hover:text-primary">
              <span className="material-symbols-outlined">play_circle</span>
              {t('hero.ctaSecondary')}
            </button>
          </div>
          <div className="mt-8 flex items-center gap-6 border-t border-border-subtle pt-8">
            <div className="flex flex-col gap-1">
              <span className="font-rubik text-data-stock text-on-surface">500+</span>
              <span className="font-label-caps text-label-caps text-text-secondary">{t('hero.statStores')}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-rubik text-data-stock text-on-surface">1M+</span>
              <span className="font-label-caps text-label-caps text-text-secondary">{t('hero.statScans')}</span>
            </div>
          </div>
        </div>

        {/* Phone mockup */}
        <div className="relative z-10 mt-12 flex justify-center md:mt-0 md:justify-start">
          <div className="relative flex h-[600px] w-[300px] flex-col overflow-hidden rounded-[2rem] border-8 border-surface-container-high bg-surface shadow-[0px_20px_40px_-10px_rgba(0,0,0,0.15)]">
            <div className="flex h-16 items-center justify-between border-b border-border-subtle bg-surface-container px-4">
              <span className="material-symbols-outlined text-primary">menu</span>
              <span className="flex-1 text-center font-headline text-headline-sm text-on-surface">{t('hero.mockTitle')}</span>
              <span className="material-symbols-outlined text-primary">notifications</span>
            </div>
            <div className="flex-1 space-y-4 bg-surface-container-low p-4">
              {/* Camera view */}
              <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-xl bg-inverse-surface shadow-inner">
                <div className="absolute inset-4 m-4 rounded-lg border-2 border-dashed border-primary-fixed/50" />
                <div className="absolute left-0 top-1/2 h-0.5 w-full bg-danger opacity-70 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="absolute bottom-2 rounded bg-inverse-surface/50 px-2 py-1 font-label-caps text-label-caps text-on-primary">
                  {t('hero.mockHint')}
                </span>
              </div>
              {/* Result card */}
              <div className="-translate-y-6 rounded-xl border border-border-subtle bg-surface p-4 shadow-card">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-headline text-headline-sm text-on-surface">{t('hero.mockProduct')}</h3>
                    <p className="font-body-sm text-body-sm text-text-secondary">{t('hero.mockSku')}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 font-label-caps text-label-caps text-success">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    {t('hero.mockDetected')}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-bg-main p-3">
                  <span className="font-body-sm text-body-sm text-text-secondary">{t('hero.mockStock')}</span>
                  <span className="font-rubik text-data-stock text-primary">{t('hero.mockStockVal')}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-success py-2 font-headline text-headline-sm text-on-primary">
                    <span className="material-symbols-outlined">add</span> {t('hero.mockReceive')}
                  </button>
                  <button className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-danger py-2 font-headline text-headline-sm text-on-primary">
                    <span className="material-symbols-outlined">remove</span> {t('hero.mockShip')}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex h-16 items-center justify-around border-t border-border-subtle bg-surface pb-2">
              <div className="flex flex-col items-center text-primary">
                <span className="material-symbols-outlined">qr_code_scanner</span>
                <span className="text-[10px]">{t('hero.mockScan')}</span>
              </div>
              <div className="flex flex-col items-center text-on-surface-variant">
                <span className="material-symbols-outlined">inventory_2</span>
                <span className="text-[10px]">{t('hero.mockInventory')}</span>
              </div>
              <div className="flex flex-col items-center text-on-surface-variant">
                <span className="material-symbols-outlined">history</span>
                <span className="text-[10px]">{t('hero.mockHistory')}</span>
              </div>
            </div>
          </div>
          {/* Decorative blob */}
          <div className="absolute left-1/2 top-1/2 -z-10 h-full max-h-[400px] w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary-fixed opacity-40 blur-3xl" />
        </div>
      </div>
    </section>
  );
}

function PainPoints() {
  const { t } = useTranslation();
  const cards = [
    { icon: 'shopping_cart_off', tone: 'danger', title: t('pain.oversellTitle'), body: t('pain.oversellBody') },
    { icon: 'edit_document', tone: 'warning', title: t('pain.manualTitle'), body: t('pain.manualBody') },
    { icon: 'visibility_off', tone: 'primary', title: t('pain.blindTitle'), body: t('pain.blindBody') },
  ];
  return (
    <section id="pain-points" className="bg-inverse-surface px-md py-20 md:px-lg">
      <div className="mx-auto md:max-w-container-max">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-rubik text-[32px] font-bold text-on-primary">{t('pain.title')}</h2>
          <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-outline-variant">{t('pain.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-outline/30 bg-inverse-on-surface/5 p-6 transition-colors hover:bg-inverse-on-surface/10"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${
                  c.tone === 'danger' ? 'bg-danger/20 text-danger' : c.tone === 'warning' ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-inverse-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">{c.icon}</span>
              </div>
              <h3 className="mb-2 font-headline text-headline-md text-on-primary">{c.title}</h3>
              <p className="font-body-sm text-body-sm text-outline-variant">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { num: 1, tone: 'primary', icon: 'qr_code_scanner', title: t('how.step1Title'), body: t('how.step1Body') },
    { num: 2, tone: 'secondary', icon: 'sync', title: t('how.step2Title'), body: t('how.step2Body') },
    { num: 3, tone: 'success', icon: 'storefront', title: t('how.step3Title'), body: t('how.step3Body') },
  ];
  return (
    <section id="how-it-works" className="bg-surface px-md py-20 md:px-lg">
      <div className="mx-auto md:max-w-container-max">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-rubik text-[32px] font-bold text-on-surface">{t('how.title')}</h2>
          <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-text-secondary">{t('how.subtitle')}</p>
        </div>
        <div className="relative flex flex-col items-start justify-between gap-12 md:flex-row md:gap-4">
          <div className="before:absolute before:right-1/6 before:top-8 before:hidden before:z-0 before:h-0.5 before:w-2/3 before:bg-border-subtle md:before:block" />
          {steps.map((s) => (
            <div key={s.num} className="relative z-10 flex flex-1 flex-col items-center text-center">
              <div
                className={`mb-6 flex h-16 w-16 items-center justify-center rounded-full font-rubik text-[24px] text-on-primary shadow-lg border-4 border-surface ${
                  s.tone === 'primary' ? 'bg-primary' : s.tone === 'secondary' ? 'bg-secondary' : 'bg-success'
                }`}
              >
                {s.num}
              </div>
              <div className="relative w-full rounded-xl border border-border-subtle bg-surface-container-lowest p-6 shadow-sm">
                <div
                  className={`absolute -right-4 -top-4 rounded-lg p-2 shadow-sm ${
                    s.tone === 'primary'
                      ? 'bg-primary-container text-on-primary-container'
                      : s.tone === 'secondary'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-success/20 text-success'
                  }`}
                >
                  <span className="material-symbols-outlined">{s.icon}</span>
                </div>
                <h3 className="mb-2 mt-2 font-headline text-headline-sm text-on-surface">{s.title}</h3>
                <p className="font-body-sm text-body-sm text-text-secondary">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const { t } = useTranslation();
  const plans = [
    {
      name: t('pricing.freeName'),
      price: t('pricing.freePrice'),
      desc: t('pricing.freeDesc'),
      features: [t('pricing.freeF1'), t('pricing.freeF2'), t('pricing.freeF3')],
      cta: t('pricing.freeCta'),
      popular: false,
    },
    {
      name: t('pricing.proName'),
      price: t('pricing.proPrice'),
      desc: t('pricing.proDesc'),
      features: [t('pricing.proF1'), t('pricing.proF2'), t('pricing.proF3'), t('pricing.proF4')],
      cta: t('pricing.proCta'),
      popular: true,
    },
    {
      name: t('pricing.entName'),
      price: t('pricing.entPrice'),
      desc: t('pricing.entDesc'),
      features: [t('pricing.entF1'), t('pricing.entF2'), t('pricing.entF3')],
      cta: t('pricing.entCta'),
      popular: false,
    },
  ];
  return (
    <section id="pricing" className="bg-bg-main px-md py-20 md:px-lg">
      <div className="mx-auto md:max-w-container-max">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-rubik text-[32px] font-bold text-on-surface">{t('pricing.title')}</h2>
          <p className="mx-auto max-w-2xl font-body-lg text-body-lg text-text-secondary">{t('pricing.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-xl border bg-surface p-lg shadow-card ${
                p.popular ? 'border-primary shadow-card-elevated md:-translate-y-2' : 'border-border-subtle'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 font-label-caps text-label-caps text-on-primary">
                  {t('pricing.popular')}
                </span>
              )}
              <h3 className="font-headline text-headline-md text-on-surface">{p.name}</h3>
              <p className="mt-1 font-body-sm text-body-sm text-text-secondary">{p.desc}</p>
              <div className="mt-md flex items-baseline gap-1">
                <span className="font-rubik text-[32px] font-bold text-on-surface">{p.price}</span>
                {p.price.includes('₪') && p.price !== '₪0' && (
                  <span className="font-body-sm text-body-sm text-text-secondary">/{t('pricing.month')}</span>
                )}
              </div>
              <ul className="mt-md flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-success text-[18px]">check_circle</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#cta"
                className={`mt-lg w-full justify-center ${p.popular ? 'btn-gradient' : 'btn-outline'}`}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { t } = useTranslation();
  return (
    <section id="cta" className="px-md py-20 md:px-lg">
      <div className="relative mx-auto max-w-[1000px] overflow-hidden rounded-3xl bg-brand-gradient p-10 text-center shadow-gradient-lg md:p-16">
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/4 rounded-full bg-on-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 translate-y-1/2 -translate-x-1/4 rounded-full bg-on-primary/10 blur-3xl" />
        <div className="relative z-10">
          <h2 className="mb-6 font-rubik text-[36px] font-bold text-on-primary">{t('cta.title')}</h2>
          <p className="mx-auto mb-8 max-w-xl font-body-lg text-body-lg text-on-primary/90">{t('cta.subtitle')}</p>
          <button className="rounded-xl bg-surface px-8 py-4 font-headline text-headline-sm text-primary shadow-md transition-all hover:scale-105 hover:shadow-xl">
            {t('cta.button')}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-main text-on-surface">
      <Nav />
      <main>
        <Hero />
        <PainPoints />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
