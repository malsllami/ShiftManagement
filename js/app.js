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

// ================================================================
// أيقونة إظهار / إخفاء كلمة المرور
// ================================================================
const EYE_OPEN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
</svg>`;
const EYE_OFF = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
</svg>`;

function initPasswordToggles() {
  document.querySelectorAll('input[type="password"]:not([data-pw-init])').forEach(input => {
    input.dataset.pwInit = '1';
    const wrapper = document.createElement('div');
    wrapper.className = 'pass-field-wrapper';

    // نقل الـ input داخل الـ wrapper
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pass-toggle-btn';
    btn.title = 'إظهار / إخفاء كلمة المرور';
    btn.innerHTML = EYE_OPEN;

    btn.addEventListener('click', () => {
      const isPass = input.type === 'password';
      input.type   = isPass ? 'text' : 'password';
      btn.innerHTML = isPass ? EYE_OFF : EYE_OPEN;
      input.focus();
    });

    wrapper.appendChild(btn);
  });
}

// ── تهيئة التطبيق ──
document.addEventListener('DOMContentLoaded', async () => {
  // تهيئة أزرار إظهار المرور (تشمل جميع حقول المرور في الصفحة)
  initPasswordToggles();

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

  lockButton(btn, 30000);
  const res = await API.login(empId, password);

  if (!res.success) {
    unlockButton(btn);
    showLoginError(res.message || 'خطأ في تسجيل الدخول');
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

// ================================================================
// تهيئة التطبيق بعد الدخول
// ================================================================
async function initApp() {
  // إخفاء صفحة الدخول أولاً
  const loginPage = document.getElementById('loginPage');
  if (loginPage) {
    loginPage.style.transition = 'opacity .3s ease';
    loginPage.style.opacity    = '0';
    await new Promise(r => setTimeout(r, 300));
    loginPage.classList.remove('active');
    loginPage.style.cssText = '';
  }
  showLayout();
  updateUserHeader();

  // جلب الإعدادات وأنواع الإجازات بالتوازي
  const [settingsRes, ltRes] = await Promise.all([
    API.getSettings(),
    API.getLeaveTypes()
  ]);
  if (settingsRes.success) {
    AppState.settings = settingsRes.data;
    applyShiftColors();
  }
  if (ltRes.success) AppState.leaveTypes = ltRes.data;

  // بناء القائمة العلوية
  buildNavigation();

  // عرض لوحة التحكم
  navigateTo('dashboard');

  // بدء استطلاع الإشعارات بعد تحميل الداشبورد لتقليل التزامن
  setTimeout(startNotificationPolling, 2000);
}

// ================================================================
// Navigation
// ================================================================
function navigateTo(page) {
  AppState.currentPage = page;

  // إظهار/إخفاء زر الرئيسية في الهيدر
  const homeBtn = document.getElementById('homeNavBtn');
  if (homeBtn) homeBtn.style.display = page === 'dashboard' ? 'none' : 'inline-flex';

  // تحديث الـ nav (فارغ)
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
// بناء القائمة - مخفية، التنقل عبر بطاقات الداشبورد
// ================================================================
function buildNavigation() {
  const nav = document.getElementById('appNav');
  if (nav) { nav.innerHTML = ''; nav.style.display = 'none'; }
  _updateElevatedBtn();
}

function _updateElevatedBtn() {
  const wrap = document.getElementById('elevatedBtnWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const dbRole    = Auth.getRole();
  const isElevated = Auth.hasElevatedAccess();
  if (dbRole === ROLES.EMPLOYEE) return;
  const label = dbRole === ROLES.MANAGER ? 'المدير' :
                dbRole === ROLES.SUPERVISOR ? 'المشرف' : 'التنسيق';
  const btn = document.createElement('button');
  btn.id = 'elevatedBtn';
  btn.className = 'elevated-badge' + (isElevated ? ' active-elevated' : '');
  btn.innerHTML = isElevated
    ? `<span class="elev-icon">🔓</span><span>${label}</span>`
    : `<span class="elev-icon">🔑</span><span>دخول ${label}</span>`;
  btn.addEventListener('click', openElevatedCodeModal);
  wrap.appendChild(btn);
}

// ================================================================
// لوحة الرمز الثانوي
// ================================================================
function openElevatedCodeModal() {
  if (Auth.hasElevatedAccess()) {
    Auth.clearElevatedRole();
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
  buildNavigation(); // إعادة بناء بعد تفعيل الصلاحية
}

// ================================================================
// تحديث ترويسة المستخدم
// ================================================================
function updateUserHeader() {
  const name  = Auth.getFullName();
  const role  = Auth.getRole();
  const shift = Auth.getShift();

  document.getElementById('headerUserName').textContent = name;
  document.getElementById('headerUserRole').textContent = `${role} | وردية ${shift}`;
  document.getElementById('headerUserAvatar').textContent = name.charAt(0) || '؟';
}

function updateHeaderStatus(icon, label, color) {
  const el = document.getElementById('headerShiftStatus');
  if (!el) return;
  el.textContent = icon + ' ' + label;
  el.style.color = color || 'rgba(255,255,255,.8)';
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
// تغيير كلمة المرور (الإجباري في صفحة الدخول)
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
  lockButton(btn, 8000);
  const res = await API.changePassword(oldPass, newPass);
  unlockButton(btn);

  if (res.success) {
    showToast('تم تغيير كلمة المرور بنجاح ✅', 'success');
    if (forced) {
      hideChangePasswordPage();
      await initApp();
    } else {
      document.getElementById('oldPassInput').value  = '';
      document.getElementById('newPassInput').value  = '';
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
  const labels = { light: '☀️ فاتح', dark: '🎨 مختلط', mixed: '🌙 داكن' };
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
function showLoginPage() {
  const lp = document.getElementById('loginPage');
  lp.classList.add('active');
  lp.style.opacity = '1';
}
function hideLoginPage() {
  document.getElementById('loginPage').classList.remove('active');
}
function showLayout() {
  const layout = document.getElementById('appLayout');
  layout.classList.add('active');
  layout.style.opacity = '0';
  layout.style.transition = 'opacity .35s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { layout.style.opacity = '1'; });
  });
  setTimeout(() => { layout.style.cssText = ''; }, 400);
}

// تغيير كلمة المرور داخل بطاقة الدخول
function showChangePasswordPage(forced) {
  // إخفاء نموذج الدخول وإظهار نموذج المرور في نفس البطاقة
  document.getElementById('loginFormSection').style.display  = 'none';
  document.getElementById('changePassSection').style.display = 'block';

  const note = document.getElementById('changePassForcedNote');
  const skip = document.getElementById('changePassSkipBtn');
  note.style.display = forced ? 'block' : 'none';
  skip.classList.toggle('hidden', forced);

  // تحديث العنوان
  document.getElementById('loginCardTitle').textContent = forced
    ? 'تغيير كلمة المرور' : 'تغيير كلمة المرور';
  document.getElementById('loginCardSub').textContent   = forced
    ? '⚠️ يجب تغيير المرور الافتراضية قبل المتابعة'
    : 'السعودية للطاقة';

  initPasswordToggles();
}

function hideChangePasswordPage() {
  document.getElementById('loginFormSection').style.display  = 'block';
  document.getElementById('changePassSection').style.display = 'none';
  document.getElementById('loginCardTitle').textContent = 'إدارة الورديات';
  document.getElementById('loginCardSub').textContent   = 'السعودية للطاقة';
}

// ================================================================
// Modal Utilities
// ================================================================
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  // تهيئة أي حقول مرور جديدة لم تُهيَّأ بعد
  initPasswordToggles();
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
