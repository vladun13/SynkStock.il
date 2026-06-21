const TRANSLATIONS = {
  he: {
    brand: "SyncStock",
    signIn: "כניסה",
    email: "אימייל",
    password: "סיסמה",
    demoHint: "חשבון דמו — לחץ על כניסה",
    loading: "טוען...",
    offline: "לא מקוון",
    online: "מקוון",
    synced: "סונכרן",
    syncing: "מסנכרן...",
    pending: "ממתין",
    error: "שגיאה",
    sell: "מכירה",
    receive: "קבלה",
    scanPrompt: "הנח את הברקוד מול המצלמה",
    productNotFound: "מוצר לא נמצא",
    scansPending: "סריקות בהמתנה לסנכרון",
    currentStock: "מלאי נוכחי:",
    units: "יח'",
    detected: "זוהה",
    scan: "סריקה",
    products: "מוצרים",
    movements: "תנועות",
    profile: "פרופיל",
    location: "מיקום",
    signOut: "התנתק",
    insufficientStock: "אין מספיק מלאי",
    typeCode: "הקלדת קוד",
    scanCamera: "סריקה במצלמה",
    enterBarcodeOrSku: "הזן ברקוד או מק\"ט",
    lookup: "חיפוש",
  },
  en: {
    brand: "SyncStock",
    signIn: "Sign In",
    email: "Email",
    password: "Password",
    demoHint: "Demo account — click Sign in",
    loading: "Loading...",
    offline: "Offline",
    online: "Online",
    synced: "Synced",
    syncing: "Syncing...",
    pending: "Pending",
    error: "Error",
    sell: "Sell",
    receive: "Receive",
    scanPrompt: "Point the barcode at the camera",
    productNotFound: "Product not found",
    scansPending: "scans waiting to sync",
    currentStock: "Current stock:",
    units: "units",
    detected: "Detected",
    scan: "Scan",
    products: "Products",
    movements: "Movements",
    profile: "Profile",
    location: "Location",
    signOut: "Sign out",
    insufficientStock: "Insufficient stock",
    typeCode: "Type code",
    scanCamera: "Scan camera",
    enterBarcodeOrSku: "Enter barcode or SKU",
    lookup: "Look up",
  },
};

export function getLanguage() {
  return localStorage.getItem('scanner-language') || 'he';
}

export function setLanguage(lang) {
  localStorage.setItem('scanner-language', lang);
}

export function t(key) {
  const lang = getLanguage();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || key;
}

export function isRTL() {
  return getLanguage() === 'he';
}
