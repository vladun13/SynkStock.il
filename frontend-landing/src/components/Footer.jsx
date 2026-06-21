import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('footer.product'),
      links: [t('footer.product1'), t('footer.product2'), t('footer.product3'), t('footer.product4')],
    },
    {
      title: t('footer.resources'),
      links: [t('footer.resources1'), t('footer.resources2'), t('footer.resources3'), t('footer.resources4')],
    },
    {
      title: t('footer.company'),
      links: [t('footer.company1'), t('footer.company2'), t('footer.company3'), t('footer.company4')],
    },
  ];

  return (
    <footer className="border-t border-border-subtle bg-surface-container-low px-md pb-8 pt-16 md:px-lg">
      <div className="mx-auto mb-12 grid grid-cols-1 gap-12 md:grid-cols-4 md:max-w-container-max">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="font-rubik text-[24px] font-bold text-primary">{t('brand')}</span>
          </div>
          <p className="mb-6 font-body-sm text-body-sm text-text-secondary">{t('tagline')}</p>
          <div className="flex items-center gap-4 text-text-secondary">
            <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">mail</span>
            <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">phone_in_talk</span>
            <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">support_agent</span>
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 font-headline text-headline-sm text-on-surface">{col.title}</h4>
            <ul className="space-y-3 font-body-sm text-body-sm text-text-secondary">
              {col.links.map((l) => (
                <li key={l}>
                  <a className="transition-colors hover:text-primary" href="#hero">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-8 md:flex-row md:max-w-container-max">
        <p className="font-body-sm text-body-sm text-text-secondary">{t('footer.rights')}</p>
        <div className="flex items-center gap-2">
          <span className="font-body-sm text-body-sm text-text-secondary">{t('footer.poweredBy')}</span>
          <span className="rounded border border-border-subtle bg-surface-container px-2 py-1 font-label-caps text-label-caps text-text-secondary">
            {t('footer.partner')}
          </span>
        </div>
      </div>
    </footer>
  );
}
