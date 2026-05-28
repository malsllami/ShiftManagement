// ================================================================
// config.js - إعدادات الموقع
// ================================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbzBHOnDxckaKRwGkObCwIoCng090y4oGIFrd5eyF4Xwf2aTqGfohxcnoTJVs4Uv02236w/exec';

const APP_VERSION = '1.0.0';
const APP_NAME    = 'إدارة الورديات';

// الورديات
const SHIFTS = ['أ', 'ب', 'د', 'ج'];

// الصلاحيات
const ROLES = {
  EMPLOYEE:    'موظف',
  SUPERVISOR:  'مشرف وردية',
  COORDINATOR: 'تنسيق اداري',
  MANAGER:     'مدير'
};

// أنواع الإجازات الأساسية
const LEAVE_TYPES = [
  'سنوية', 'مجدولة', 'مرضية', 'مولود', 'وفاة',
  'زواج', 'اختبارات', 'دورة عمل', 'خدمة عمل طويلة', 'أخرى'
];

// المناطق
const REGIONS = ['شمال', 'جنوب', 'وسط', 'شرق', 'غرب'];

// ألوان حالة الطلبات
const STATUS_COLORS = {
  'تم الانشاء':          { bg: '#E3F2FD', text: '#1565C0', badge: 'primary' },
  'موافقة المشرف':       { bg: '#E8F5E9', text: '#2E7D32', badge: 'success' },
  'مرفوض من المشرف':     { bg: '#FFEBEE', text: '#C62828', badge: 'danger' },
  'ارسل الي التنسيق':    { bg: '#FFF3E0', text: '#E65100', badge: 'warning' },
  'اعيد الي المشرف':     { bg: '#FFF8E1', text: '#F57F17', badge: 'warning' },
  'ارسل في النظام':      { bg: '#F3E5F5', text: '#6A1B9A', badge: 'purple' },
  'تم الاستلام':         { bg: '#E0F7FA', text: '#006064', badge: 'info' },
  'لم يتم الاستلام':     { bg: '#FCE4EC', text: '#880E4F', badge: 'danger' },
  'قيد المراجعة':        { bg: '#E8EAF6', text: '#283593', badge: 'secondary' },
  'موافق عليها':         { bg: '#E8F5E9', text: '#2E7D32', badge: 'success' },
  'مرفوضة':              { bg: '#FFEBEE', text: '#C62828', badge: 'danger' }
};

// ألوان المدة المتبقية للبطاقات
function getDaysColor(days) {
  if (days === '' || days === null || days === undefined) return '';
  days = Number(days);
  if (days < 0)   return 'days-red';
  if (days < 30)  return 'days-yellow';
  if (days < 100) return 'days-orange';
  return 'days-green';
}

// أيام الأسبوع
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// تطبيع الأرقام العربية
function normalizeNumbers(str) {
  if (!str && str !== 0) return '';
  return String(str).replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

// تنسيق التاريخ
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// تنسيق التاريخ الهجري
function formatHijriDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-SA', {
      calendar: 'islamic-umalqura',
      year: 'numeric', month: 'long', day: 'numeric'
    }).format(d);
  } catch { return ''; }
}

// تنسيق التاريخ الميلادي
function formatGregorianDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

// فرق الأيام بين تاريخين
function daysDiff(start, end) {
  const s = new Date(start), e = new Date(end);
  return Math.floor((e - s) / 86400000) + 1;
}

// حالة الدوام
const SHIFT_STATUS_LABELS = {
  'صباح': { label: 'دوام صباحي', icon: '🌅', color: '#1565C0' },
  'مساء': { label: 'دوام مسائي', icon: '🌙', color: '#E65100' },
  'راحة': { label: 'راحة',       icon: '🏠', color: '#6A1B9A' }
};

// debounce - منع الضغط المتعدد
function debounce(fn, delay = 600) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// منع الضغط المزدوج على الأزرار
function lockButton(btn, ms = 2000) {
  if (!btn) return;
  btn.disabled = true;
  btn.classList.add('loading');
  setTimeout(() => {
    btn.disabled = false;
    btn.classList.remove('loading');
  }, ms);
}
