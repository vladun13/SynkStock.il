import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ADMIN_URL } from '../lib/urls';

export default function Nav() {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleLang = () => {
    const next = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(next);
    localStorage.setItem('landing-language', next);
  };

  const links = [
    { href: '#hero', label: t('nav.home') },
    { href: '#pain-points', label: t('nav.painPoints') },
    { href: '#how-it-works', label: t('nav.howItWorks') },
    { href: '#pricing', label: t('nav.pricing') },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border-subtle px-md backdrop-blur-md transition-shadow md:px-lg ${
        scrolled ? 'bg-surface/90 shadow-[0px_1px_3px_rgba(0,0,0,0.05)]' : 'bg-surface/80'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-rubik text-display-lg font-bold text-primary">{t('brand')}</span>
      </div>

      <div className="hidden items-center gap-lg font-body-sm text-on-surface-variant md:flex">
        {links.map((l) => (
          <a key={l.href} href={l.href} className="cursor-pointer transition-colors hover:text-primary">
            {l.label}
          </a>
        ))}
        <a href={`${ADMIN_URL}/login`} className="cursor-pointer font-medium text-primary transition-colors hover:opacity-80">
          {t('login')}
        </a>
      </div>

      <div className="flex items-center gap-md">
        <button
          onClick={toggleLang}
          className="flex items-center gap-1 rounded-md border border-border-subtle bg-surface px-2 py-1 font-body-sm text-on-surface-variant shadow-sm transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-[18px]">language</span>
          <span className="hidden sm:inline">{t('langName')}</span>
        </button>
        <a href={`${ADMIN_URL}/login`} className="btn-gradient-sm hidden sm:inline-flex">
          {t('installShopify')}
        </a>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md p-2 text-on-surface-variant md:hidden"
          aria-label="menu"
        >
          <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="absolute top-16 left-0 w-full border-b border-border-subtle bg-surface px-md py-md shadow-card md:hidden">
          <div className="flex flex-col gap-md">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="font-body-md text-body-md text-on-surface-variant transition-colors hover:text-primary"
              >
                {l.label}
              </a>
            ))}
            <a href={`${ADMIN_URL}/login`} onClick={() => setMobileOpen(false)} className="btn-gradient-sm justify-center">
              {t('installShopify')}
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
