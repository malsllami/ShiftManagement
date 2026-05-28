// ================================================================
// app.js - التطبيق الرئيسي
// ================================================================

// ── حالة التطبيق ──
const AppState = {
  settings:      {},
  currentPage:   'dashboard',
  shiftColors:   {},
  leaveTypes:    [...LEAVE_TYPES],
  notifications: [],
  notifPollInterval: null,
};

// ── تهيئة التطبيق ──
document.addEventListener('DOMContentLoaded', async () => {
  // التحقق من الجلسة
  if (Auth.isLoggedIn()) {
    await initApp();
  } else {
    showLoginPage();
  }
});

// ================================================================
// تسجيل الدخول
// ================================================================
async function handleLogin(e) {
  e.preventDefault();
  const btn      = document.getElementById('loginBtn');
  const empId    = normalizeNumbers(document.getElementById('loginId').value.trim());
  const password = document.getElementById('loginPass').value.trim();
  const errorEl  = document.getElementById('loginError');

  errorEl.classList.remove('show');

  if (!empId || !password) {
    showLoginError('الرجاء إدخال الرقم الوظيفي وكلمة المرور');
    return;
  }

  lockButton(btn, 5000);
  showLoginLoading(true);

  const res = await API.login(empId, password);

  showLoginLoading(false);

  if (!res.success) {
    showLoginError(res.message || 'خطأ في تسجيل الدخول');
    btn.disabled = false;
    btn.classList.remove('loading');
    return;
  }

  Auth.saveSession({
    employeeId: res.employeeId,
    fullName:   res.fullName,
    shift:      res.shift,
    role:       res.role,
    token:      res.token
  });

  if (res.isFirstLogin) {
    showChangePasswordPage(true);
    return;
  }

  await initApp();
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.classList.add('show');
}
function showLoginLoading(show) {
  const btn = document.getElementById('loginBtn');
  if (show) btn.innerHTML = '<span class="spinner-sm" style="display:inline-flex;width:18px;height:18px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;"></span>';
  else btn.innerHTML = '<i>🔐</i> تسجيل الدخول';
}

// ================================================================
// تهيئة التطبيق بعد الدخول
// ================================================================
async function initApp() {
  hideLoginPage();
  showLayout();
  updateUserHeader();

  // جلب الإعدادات
  const settingsRes = await API.getSettings();
  if (settingsRes.success) {
    AppState.settings = settingsRes.data;
    applyShiftColors();
  }

  // جلب أنواع الإجازات
  const ltRes = await API.getLeaveTypes();
  if (ltRes.success) AppState.leaveTypes = ltRes.data;

  // بناء القائمة العلوية
  buildNavigation();

  // عرض لوحة التحكم
  navigateTo('dashboard');

  // بدء استطلاع الإشعارات
  startNotificationPolling();
}

// ================================================================
// Navigation
// ================================================================
function navigateTo(page) {
  AppState.currentPage = page;

  // تحديث الـ nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // عرض الصفحة المطلوبة
  document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('anim-fade');
    setTimeout(() => target.classList.remove('anim-fade'), 400);
  }

  // تحميل البيانات
  loadPageData(page);
}

async function loadPageData(page) {
  switch(page) {
    case 'dashboard':     await loadDashboard();     break;
    case 'calendar':      await loadCalendar();       break;
    case 'employees':     await loadEmployeesPage();  break;
    case 'regions':       await loadRegionsPage();    break;
    case 'equipment':     await loadEquipmentPage();  break;
    case 'leaves':        await loadLeavesPage();     break;
    case 'overtime':      await loadOvertimePage();   break;
    case 'overview':      await loadOverviewPage();   break;
    case 'notifications': await loadNotificationsPage(); break;
    case 'log':           await loadLogPage();        break;
    case 'settings':      await loadSettingsPage();   break;
  }
}

// ================================================================
// بناء القائمة حسب الصلاحية
// ================================================================
function buildNavigation() {
  const nav   = document.getElementById('appNav');
  const role  = Auth.getRole();
  nav.innerHTML = '';

  const pages = [
    { id: 'dashboard',     label: 'الرئيسية',         icon: '🏠', roles: 'all' },
    { id: 'calendar',      label: 'تقويم الورديات',    icon: '📅', roles: 'all' },
    { id: 'employees',     label: 'الموظفون',          icon: '👥', roles: ['مشرف وردية','تنسيق اداري','مدير'] },
    { id: 'regions',       label: 'المناطق والمراكز',  icon: '📍', roles: 'all' },
    { id: 'equipment',     label: 'العدد والمقاسات',   icon: '🔧', roles: 'all' },
    { id: 'leaves',        label: 'الإجازات',          icon: '🌴', roles: 'all' },
    { id: 'overtime',      label: 'العمل الإضافي',     icon: '⏱️', roles: 'all' },
    { id: 'overview',      label: 'العرض الشامل',      icon: '📊', roles: ['تنسيق اداري','مدير'] },
    { id: 'notifications', label: 'الإشعارات',         icon: '🔔', roles: 'all' },
    { id: 'log',           label: 'السجل',             icon: '📋', roles: ['تنسيق اداري','مدير'] },
    { id: 'settings',      label: 'الإعدادات',         icon: '⚙️',  roles: ['مدير'] },
  ];

  pages.forEach(p => {
    if (p.roles !== 'all' && !p.roles.includes(role)) return;
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.dataset.page = p.id;
    el.innerHTML = `<span class="nav-icon">${p.icon}</span><span>${p.label}</span>`;
    el.addEventListener('click', () => navigateTo(p.id));
    nav.appendChild(el);
  });

  // زر الصلاحية المرتفعة
  if (role !== ROLES.EMPLOYEE) {
    const elevatedBtn = document.createElement('button');
    elevatedBtn.id        = 'elevatedBtn';
    elevatedBtn.className = 'elevated-badge';
    elevatedBtn.innerHTML = `<span>🔑</span> <span>دخول ${role === ROLES.MANAGER ? 'المدير' : role === ROLES.SUPERVISOR ? 'المشرف' : 'التنسيق'}</span>`;
    elevatedBtn.addEventListener('click', openElevatedCodeModal);
    nav.appendChild(elevatedBtn);
  }

  // زر العودة لوضع الموظف
  if (Auth.hasElevatedAccess()) {
    markElevatedActive();
  }
}

// ================================================================
// لوحة الرمز الثانوي
// ================================================================
function openElevatedCodeModal() {
  if (Auth.hasElevatedAccess()) {
    // إلغاء الصلاحية المرتفعة
    Auth.clearElevatedRole();
    document.getElementById('elevatedBtn').classList.remove('active-elevated');
    document.getElementById('elevatedBtn').innerHTML = `<span>🔑</span><span>دخول ${getElevatedLabel()}</span>`;
    showToast('تم التبديل إلى وضع الموظف', 'info');
    buildNavigation();
    navigateTo('dashboard');
    return;
  }
  document.getElementById('codeOverlay').classList.add('open');
  document.getElementById('codeInput').value = '';
  document.getElementById('codeInput').focus();
}

function getElevatedLabel() {
  const r = Auth.getRole();
  return r === ROLES.MANAGER ? 'المدير' : r === ROLES.SUPERVISOR ? 'المشرف' : 'التنسيق';
}

async function submitElevatedCode() {
  const code = document.getElementById('codeInput').value.trim();
  if (!code) return;

  const btn = document.getElementById('codeSubmitBtn');
  lockButton(btn, 3000);

  const res = await API.verifyElevatedCode(code);
  btn.disabled = false; btn.classList.remove('loading');

  if (res.success) {
    Auth.saveElevatedRole(res.role);
    document.getElementById('codeOverlay').classList.remove('open');
    markElevatedActive();
    showToast('تم تفعيل صلاحية ' + res.role, 'success');
    buildNavigation();
    navigateTo('dashboard');
  } else {
    document.getElementById('codeError').textContent = res.message;
    document.getElementById('codeError').classList.add('show');
    document.getElementById('codeInput').value = '';
    document.getElementById('codeInput').focus();
    setTimeout(() => document.getElementById('codeError').classList.remove('show'), 3000);
  }
}

function markElevatedActive() {
  const btn = document.getElementById('elevatedBtn');
  if (!btn) return;
  btn.classList.add('active-elevated');
  btn.innerHTML = `<span>✅</span><span>وضع ${Auth.getElevatedRole()} | رجوع لموظف</span>`;
}

// ================================================================
// تحديث ترويسة المستخدم
// ================================================================
function updateUserHeader() {
  const name  = Auth.getFullName();
  const role  = Auth.getRole();
  const shift = Auth.getShift();

  document.getElementById('headerUserName').textContent = name;
  document.getElementById('headerUserRole').textContent = `${role} - وردية ${shift}`;
  document.getElementById('headerUserAvatar').textContent = name.charAt(0) || '؟';
}

// ================================================================
// تسجيل الخروج
// ================================================================
async function handleLogout() {
  if (!confirm('هل تريد تسجيل الخروج؟')) return;
  await API.logout();
  Auth.clearSession();
  location.reload();
}

// ================================================================
// تغيير كلمة المرور
// ================================================================
async function handleChangePassword(forced = false) {
  const oldPass  = document.getElementById('oldPassInput').value.trim();
  const newPass  = document.getElementById('newPassInput').value.trim();
  const confPass = document.getElementById('confPassInput').value.trim();

  if (!oldPass || !newPass || !confPass) {
    showToast('جميع الحقول مطلوبة', 'error'); return;
  }
  if (newPass.length < 6) {
    showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error'); return;
  }
  if (newPass !== confPass) {
    showToast('كلمتا المرور غير متطابقتين', 'error'); return;
  }

  const btn = document.getElementById('changePassBtn');
  lockButton(btn, 5000);
  const res = await API.changePassword(oldPass, newPass);
  btn.disabled = false; btn.classList.remove('loading');

  if (res.success) {
    showToast('تم تغيير كلمة المرور بنجاح', 'success');
    if (forced) {
      hideChangePasswordPage();
      await initApp();
    } else {
      document.getElementById('oldPassInput').value = '';
      document.getElementById('newPassInput').value = '';
      document.getElementById('confPassInput').value = '';
    }
  } else {
    showToast(res.message, 'error');
  }
}

// ================================================================
// ألوان الورديات من الإعدادات
// ================================================================
function applyShiftColors() {
  const s = AppState.settings;
  AppState.shiftColors = {
    'أ': s['shift_a_color'] || '#1565C0',
    'ب': s['shift_b_color'] || '#00897B',
    'د': s['shift_d_color'] || '#F57C00',
    'ج': s['shift_j_color'] || '#6A1B9A'
  };

  // تطبيق متغيرات CSS
  const root = document.documentElement;
  root.style.setProperty('--shift-a', AppState.shiftColors['أ']);
  root.style.setProperty('--shift-b', AppState.shiftColors['ب']);
  root.style.setProperty('--shift-d', AppState.shiftColors['د']);
  root.style.setProperty('--shift-j', AppState.shiftColors['ج']);
}

// ================================================================
// الإشعارات - استطلاع دوري
// ================================================================
function startNotificationPolling() {
  refreshNotifBadge();
  AppState.notifPollInterval = setInterval(refreshNotifBadge, 60000); // كل دقيقة
}

async function refreshNotifBadge() {
  const res = await API.getUnreadCount();
  if (!res.success) return;
  const badge = document.getElementById('notifBadge');
  if (res.count > 0) {
    badge.textContent = res.count > 99 ? '99+' : res.count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ================================================================
// مبدّل الثيم
// ================================================================
function cycleTheme() {
  const themes = ['light', 'dark', 'mixed'];
  const current = document.documentElement.dataset.theme || 'light';
  const next = themes[(themes.indexOf(current) + 1) % themes.length];
  document.documentElement.dataset.theme = next;
  localStorage.setItem('se_theme', next);
  const labels = { light: '☀️ فاتح', dark: '🌙 داكن', mixed: '🎨 خليط' };
  document.getElementById('themeToggle').innerHTML = labels[next];
}

// تطبيق الثيم المحفوظ
(function() {
  const saved = localStorage.getItem('se_theme') || 'light';
  document.documentElement.dataset.theme = saved;
})();

// ================================================================
// Toast Notifications
// ================================================================
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer') || createToastContainer();
  const toast     = document.createElement('div');
  const icons     = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createToastContainer() {
  const el = document.createElement('div');
  el.id = 'toastContainer';
  el.className = 'toast-container';
  document.body.appendChild(el);
  return el;
}

// ================================================================
// إظهار / إخفاء الصفحات
// ================================================================
function showLoginPage()         { document.getElementById('loginPage').classList.add('active'); }
function hideLoginPage()         { document.getElementById('loginPage').classList.remove('active'); }
function showLayout()            { document.getElementById('appLayout').classList.add('active'); }
function showChangePasswordPage(forced) {
  document.getElementById('changePassPage').classList.add('active');
  document.getElementById('changePassTitle').textContent = forced
    ? 'يجب تغيير كلمة المرور قبل المتابعة'
    : 'تغيير كلمة المرور';
  document.getElementById('changePassForcedNote').classList.toggle('hidden', !forced);
  document.getElementById('changePassSkipBtn').classList.toggle('hidden', forced);
  document.getElementById('changePassForcedObj') && (document.getElementById('changePassForcedObj').forced = forced);
}
function hideChangePasswordPage() {
  document.getElementById('changePassPage').classList.remove('active');
}

// ================================================================
// Modal Utilities
// ================================================================
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// إغلاق عند الضغط خارج
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
  if (e.target === document.getElementById('codeOverlay')) {
    document.getElementById('codeOverlay').classList.remove('open');
  }
});

// ================================================================
// الصفحات - stub loaders (تكتمل في ملفات منفصلة)
// ================================================================
async function loadDashboard()        { await Dashboard.load(); }
async function loadCalendar()         { await CalendarPage.load(); }
async function loadEmployeesPage()    { await EmployeesPage.load(); }
async function loadRegionsPage()      { await RegionsPage.load(); }
async function loadEquipmentPage()    { await EquipmentPage.load(); }
async function loadLeavesPage()       { await LeavesPage.load(); }
async function loadOvertimePage()     { await OvertimePage.load(); }
async function loadOverviewPage()     { await OverviewPage.load(); }
async function loadNotificationsPage(){ await NotificationsPage.load(); }
async function loadLogPage()          { await LogPage.load(); }
async function loadSettingsPage()     { await SettingsPage.load(); }

// ================================================================
// مساعدات عرض
// ================================================================
function getShiftBadge(shift) {
  const color = AppState.shiftColors[shift] || '#64748B';
  return `<span class="badge" style="background:${color}22;color:${color}">وردية ${shift}</span>`;
}

function getRoleBadge(role) {
  const map = {
    'مدير':         { bg: '#1565C020', color: '#1565C0' },
    'مشرف وردية':  { bg: '#00897B20', color: '#00897B' },
    'تنسيق اداري': { bg: '#F57C0020', color: '#F57C00' },
    'موظف':         { bg: '#64748B20', color: '#64748B' }
  };
  const c = map[role] || { bg: '#eee', color: '#333' };
  return `<span class="badge" style="background:${c.bg};color:${c.color}">${role}</span>`;
}

function getStatusBadge(status) {
  const s = STATUS_COLORS[status] || { bg: '#eee', text: '#333' };
  return `<span class="badge" style="background:${s.bg};color:${s.text}">${status}</span>`;
}

function getDaysCell(days) {
  if (days === '' || days === null || days === undefined) return '<span class="text-muted">-</span>';
  const cls = getDaysColor(days);
  return `<span class="${cls}">${days} يوم</span>`;
}
