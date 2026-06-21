import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import SyncBadge from '../SyncBadge';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

function renderWithProvider(ui) {
  return render(<AppProvider i18n={enTranslations}>{ui}</AppProvider>);
}

describe('SyncBadge', () => {
  it('renders synced badge', () => {
    renderWithProvider(<SyncBadge status="synced" />);
    expect(screen.getByText('synced')).toBeInTheDocument();
  });

  it('renders pending badge', () => {
    renderWithProvider(<SyncBadge status="pending" />);
    expect(screen.getByText('syncing')).toBeInTheDocument();
  });
});
