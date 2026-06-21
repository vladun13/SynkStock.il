const TRANSLATIONS = {
  he: {
    synced: 'סונכרן',
    syncing: 'מסנכרן...',
    offline: 'לא מקוון',
    sell: 'מכירה',
    receive: 'קבלה',
    scanPrompt: 'כוון את המצלמה לברקוד',
    productNotFound: 'מוצר לא נמצא',
    error: 'שגיאה',
  },
  en: {
    synced: 'Synced',
    syncing: 'Syncing...',
    offline: 'Offline',
    sell: 'Sell',
    receive: 'Receive',
    scanPrompt: 'Point camera at barcode',
    productNotFound: 'Product not found',
    error: 'Error',
  },
};

export function getLanguage() {
  return localStorage.getItem('scanner-language') || 'he';
}

export function setLanguage(lang) {
  localStorage.setItem('scanner-language', lang);
}

export function t(key) {
  return TRANSLATIONS[getLanguage()][key] || key;
}
