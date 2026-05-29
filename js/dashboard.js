// ================================================================
// dashboard.js - لوحة التحكم
// ================================================================

const Dashboard = {

  async load() {
    const isElevated = Auth.hasElevatedAccess();
    const dbRole     = Auth.getRole();
    const container  = document.getElementById('page-dashboard');
    container.innerHTML = `<div class="spinner"></div>`;

    // الموظف - أو أي شخص لم يُفعّل صلاحيته بعد → يرى لوحة الموظف
    if (!isElevated || dbRole === ROLES.EMPLOYEE) {
      await this._loadEmployeeDashboard(container);
    } else {
      await this._loadElevatedDashboard(Auth.getActiveRole(), container);
    }
  },

  // ================================================================
  // لوحة الموظف الشخصية
  // ================================================================
  async _loadEmployeeDashboard(container) {
    const empId = Auth.getEmployeeId();
    const shift = Auth.getShift();

    // جلب جميع البيانات بالتوازي
    const [empRes, leavesRes, leaveReqRes, otRes, regRes, eqRes, todayRes] =
      await Promise.all([
        API.getEmployee(empId),
        API.getLeaves(),
        API.getLeaveRequests(),
        API.getOvertime(),
        API.getRegions(),
        API.getEquipment(),
        API.getTodayStatus()
      ]);

    const emp   = empRes.success    ? empRes.data                          : null;
    const leave = leavesRes.success && leavesRes.data[0] ? leavesRes.data[0] : null;
    const reqs  = leaveReqRes.success ? leaveReqRes.data  : [];
    const ots   = otRes.success       ? otRes.data        : [];
    const reg   = regRes.success  && regRes.data[0]  ? regRes.data[0]  : null;
    const eq    = eqRes.success   && eqRes.data[0]   ? eqRes.data[0]   : null;
    const today = todayRes.success ? (todayRes.data[shift] || {}) : {};

    const pendingLeaves = reqs.filter(r => r.status === 'قيد المراجعة').length;
    const pendingOTs    = ots.filter(o => o.overallStatus === 'تم الانشاء' || o.overallStatus === 'ارسل في النظام' && o.receiptStatus !== 'تم الاستلام').length;
    const totalOTHours  = ots.filter(o => o.overallStatus === 'تم الاستلام')
                             .reduce((s, o) => s + (Number(o.hours) || 0), 0);

    const statusInfo = {
      'صباح': { label: 'دوام صباحي', icon: '☀️', col: '#1565C0' },
      'مساء': { label: 'دوام مسائي', icon: '🌙', col: '#E65100' },
      'راحة': { label: 'يوم راحة',   icon: '🏖️', col: '#6A1B9A' }
    };
    const si = statusInfo[today.status] || { label: '---', icon: '⏳', col: '#999' };

    // تحديث الهيدر بحالة اليوم
    updateHeaderStatus(si.icon, si.label, si.col);

    const html = `
<div class="emp-dashboard">

  <!-- ─── تقويم الأسبوع ─── -->
  <div class="emp-card emp-card-cal card-interactive" onclick="navigateTo('calendar')">
    <div class="emp-card-hd">
      <span class="emp-card-icon" style="background:#E3F2FD">📅</span>
      <div>
        <div class="emp-card-title">تقويم ورديتي هذا الأسبوع</div>
        <div class="emp-card-sub">اضغط لعرض التقويم الكامل</div>
      </div>
    </div>
    ${this._buildWeekCalendar(shift)}
  </div>

  <!-- ─── صف البطاقات الشخصية ─── -->
  <div class="emp-cards-grid">

    <!-- البيانات الشخصية -->
    <div class="emp-card card-interactive" onclick="openEmployeeProfileModal()">
      <div class="emp-card-hd">
        <span class="emp-card-icon" style="background:#EDE7F6">🪪</span>
        <div>
          <div class="emp-card-title">بياناتي الشخصية</div>
          <div class="emp-card-sub">اضغط للتعديل</div>
        </div>
      </div>
      <div class="emp-info-list">
        <div class="emp-info-item">
          <span class="emp-info-key">📱 الجوال</span>
          <span dir="ltr">${emp?.phone || 'غير محدد'}</span>
        </div>
        <div class="emp-info-item">
          <span class="emp-info-key">🪪 بطاقة العمل</span>
          <span class="${getDaysColor(emp?.workCardRemaining)}">${emp?.workCardRemaining !== '' && emp?.workCardRemaining !== undefined ? emp.workCardRemaining + ' يوم' : 'غير محدد'}</span>
        </div>
        <div class="emp-info-item">
          <span class="emp-info-key">📋 بطاقة المصدر</span>
          <span class="${getDaysColor(emp?.sourceCardRemaining)}">${emp?.sourceCardRemaining !== '' && emp?.sourceCardRemaining !== undefined ? emp.sourceCardRemaining + ' يوم' : 'غير محدد'}</span>
        </div>
      </div>
      <div class="emp-action-btn" style="background:#EDE7F6;color:#6A1B9A">
        ✏️ تعديل بياناتي
      </div>
    </div>

    <!-- الإجازات -->
    <div class="emp-card card-interactive" onclick="navigateTo('leaves')">
      <div class="emp-card-hd">
        <span class="emp-card-icon" style="background:#E8F5E9">✈️</span>
        <div>
          <div class="emp-card-title">إجازاتي</div>
          <div class="emp-card-sub">
            ${pendingLeaves > 0
              ? `<span style="color:#E65100">● ${pendingLeaves} طلب قيد المراجعة</span>`
              : 'لا توجد طلبات معلقة'}
          </div>
        </div>
      </div>
      <div class="emp-balance-row">
        <div class="emp-balance-box" style="background:#E8F5E9">
          <div style="font-size:1.9rem;font-weight:900;color:#2E7D32">${leave?.systemRemaining ?? 0}</div>
          <div style="font-size:.72rem;color:#388E3C;font-weight:600">سنوية متبقية</div>
          <div style="font-size:.68rem;color:#A5D6A7">من ${leave?.systemBalance ?? 0} يوم</div>
        </div>
        <div class="emp-balance-box" style="background:#E0F2F1">
          <div style="font-size:1.6rem;font-weight:800;color:#00897B">${leave?.scheduledRemaining ?? 0}</div>
          <div style="font-size:.72rem;color:#00897B;font-weight:600">مجدولة متبقية</div>
          <div style="font-size:.68rem;color:#80CBC4">من ${leave?.scheduledBalance ?? 0} يوم</div>
        </div>
      </div>
      <!-- عرض آخر طلب -->
      ${reqs.length > 0 ? `
      <div class="emp-last-req">
        <span style="font-size:.75rem;color:var(--text-muted)">آخر طلب:</span>
        <span style="font-size:.78rem;font-weight:600">${reqs[0].leaveType} - ${reqs[0].duration} أيام</span>
        <span class="emp-status-chip" style="${this._statusStyle(reqs[0].status)}">${reqs[0].status}</span>
      </div>` : ''}
      <button class="emp-action-btn" style="background:#E8F5E9;color:#2E7D32;cursor:pointer;border:none;font-family:var(--font);"
              onclick="event.stopPropagation(); openLeaveRequestModal()">
        ➕ طلب إجازة جديد
      </button>
    </div>

    <!-- العمل الإضافي -->
    <div class="emp-card card-interactive" onclick="navigateTo('overtime')">
      <div class="emp-card-hd">
        <span class="emp-card-icon" style="background:#FFF3E0">⏰💰</span>
        <div>
          <div class="emp-card-title">عمل إضافي</div>
          <div class="emp-card-sub">
            ${pendingOTs > 0
              ? `<span style="color:#E65100">● ${pendingOTs} طلب في الانتظار</span>`
              : 'لا توجد طلبات معلقة'}
          </div>
        </div>
      </div>
      <div class="emp-balance-row">
        <div class="emp-balance-box" style="background:#FFF3E0">
          <div style="font-size:1.9rem;font-weight:900;color:#E65100">${totalOTHours.toFixed(1)}</div>
          <div style="font-size:.72rem;color:#E65100;font-weight:600">ساعة مستلمة</div>
        </div>
        <div class="emp-balance-box" style="background:#FBE9E7">
          <div style="font-size:1.6rem;font-weight:800;color:#BF360C">${ots.length}</div>
          <div style="font-size:.72rem;color:#BF360C;font-weight:600">إجمالي الطلبات</div>
        </div>
      </div>
      <!-- آخر طلب إضافي -->
      ${ots.length > 0 ? `
      <div class="emp-last-req">
        <span style="font-size:.75rem;color:var(--text-muted)">آخر طلب:</span>
        <span style="font-size:.78rem;font-weight:600">${ots[0].hours} ساعة - ${ots[0].date}</span>
        <span class="emp-status-chip" style="${this._statusStyle(ots[0].overallStatus)}">${ots[0].overallStatus}</span>
      </div>` : ''}
      <button class="emp-action-btn" style="background:#FFF3E0;color:#E65100;cursor:pointer;border:none;font-family:var(--font);"
              onclick="event.stopPropagation(); openOvertimeFormModal()">
        ➕ طلب عمل إضافي
      </button>
    </div>

    <!-- العدد والمقاسات -->
    <div class="emp-card card-interactive" onclick="navigateTo('equipment')">
      <div class="emp-card-hd">
        <span class="emp-card-icon" style="background:#E8EAF6">🔧</span>
        <div>
          <div class="emp-card-title">العدد والمقاسات</div>
          <div class="emp-card-sub">اضغط للتعديل</div>
        </div>
      </div>
      <div class="emp-eq-grid">
        ${[['قميص CAT2',eq?.cat2Shirt],['بنطلون CAT2',eq?.cat2Pants],
           ['سيفتي شوز',eq?.safetyShoes],['بدلة CAT4',eq?.cat4Suit],
           ['برافو',eq?.bravo],['ميجر',eq?.major]]
          .map(([l,v]) => `
          <div class="emp-eq-item">
            <div class="emp-eq-label">${l}</div>
            <div class="emp-eq-val">${v || '—'}</div>
          </div>`).join('')}
      </div>
      <div class="emp-action-btn" style="background:#E8EAF6;color:#3949AB">عرض وتعديل</div>
    </div>

    <!-- المنطقة والمركز -->
    <div class="emp-card card-interactive" onclick="navigateTo('regions')">
      <div class="emp-card-hd">
        <span class="emp-card-icon" style="background:#FCE4EC">📍</span>
        <div>
          <div class="emp-card-title">المنطقة والمركز</div>
          <div class="emp-card-sub">اضغط للتعديل</div>
        </div>
      </div>
      <div class="emp-info-list mt-8">
        <div class="emp-info-item"><span class="emp-info-key">🗺️ المنطقة</span><strong>${reg?.region || 'غير محدد'}</strong></div>
        <div class="emp-info-item"><span class="emp-info-key">🏢 المركز</span><strong>${reg?.center || 'غير محدد'}</strong></div>
        <div class="emp-info-item"><span class="emp-info-key">🚗 السيارة</span><strong>${reg?.carNumber || 'غير محدد'}</strong></div>
      </div>
      <div class="emp-action-btn" style="background:#FCE4EC;color:#C2185B">عرض المنطقة</div>
    </div>

    <!-- الإشعارات -->
    <div class="emp-card card-interactive" onclick="navigateTo('notifications')">
      <div class="emp-card-hd">
        <span class="emp-card-icon" style="background:#E3F2FD">🔔</span>
        <div>
          <div class="emp-card-title">الإشعارات</div>
          <div class="emp-card-sub">متابعة حالة الطلبات</div>
        </div>
      </div>
      <div class="emp-action-btn" style="background:#E3F2FD;color:#1565C0;margin-top:16px">
        عرض الإشعارات
      </div>
    </div>

    <!-- العرض الشامل -->
    <div class="emp-card card-interactive" onclick="navigateTo('overview')">
      <div class="emp-card-hd">
        <span class="emp-card-icon" style="background:#E8EAF6">📊</span>
        <div>
          <div class="emp-card-title">بياناتي الشاملة</div>
          <div class="emp-card-sub">كل بياناتك في مكان واحد</div>
        </div>
      </div>
      <div class="emp-action-btn" style="background:#E8EAF6;color:#3949AB;margin-top:16px">
        عرض البيانات
      </div>
    </div>

    <!-- الإعدادات -->
    <div class="emp-card card-interactive" onclick="openChangePassModal()">
      <div class="emp-card-hd">
        <span class="emp-card-icon" style="background:#E0F7FA">⚙️</span>
        <div>
          <div class="emp-card-title">إعداداتي</div>
          <div class="emp-card-sub">الأمان وكلمة المرور</div>
        </div>
      </div>
      <div class="emp-action-btn" style="background:#E0F7FA;color:#006064;margin-top:16px">
        🔐 تغيير كلمة المرور
      </div>
    </div>

  </div>
</div>`;

    container.innerHTML = html;
  },

  // ================================================================
  // تقويم أسبوعي مصغر (محلي بدون API)
  // ================================================================
  _buildWeekCalendar(shift) {
    const settings = AppState.settings;
    const refDate  = settings['cycle_reference_date'] ? new Date(settings['cycle_reference_date']) : new Date('2026-05-27');
    const posKey   = { 'أ': 'shift_a_position', 'ب': 'shift_b_position', 'د': 'shift_d_position', 'ج': 'shift_j_position' }[shift];
    const refPos   = parseInt(settings[posKey] || '1', 10);
    const color    = AppState.shiftColors[shift] || '#1565C0';
    const today    = new Date();
    today.setHours(0,0,0,0);
    const wd       = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

    let html = `<div class="mini-week-wrap">`;
    for (let i = -1; i <= 5; i++) {
      const d    = new Date(today); d.setDate(today.getDate() + i);
      const diff = Math.round((d - refDate) / 86400000);
      const day  = ((refPos - 1 + diff) % 8 + 8) % 8 + 1;
      const st   = day <= 2 ? 'صباح' : day <= 4 ? 'مساء' : 'راحة';
      const cls  = { 'صباح': 'mwc-morning', 'مساء': 'mwc-evening', 'راحة': 'mwc-off' }[st];
      const ico  = { 'صباح': '☀️', 'مساء': '🌙', 'راحة': '🏖️' }[st];
      const isT  = (i === 0);

      html += `
        <div class="mwc-cell ${cls} ${isT ? 'mwc-today' : ''}" style="${isT ? `box-shadow:0 0 0 2px ${color};` : ''}">
          <div class="mwc-wd">${wd[d.getDay()]}</div>
          <div class="mwc-num" style="${isT ? `color:${color};font-size:1.1rem;` : ''}">${d.getDate()}</div>
          <div class="mwc-ico">${ico}</div>
          <div class="mwc-st">${st}</div>
        </div>`;
    }
    html += `</div>`;
    return html;
  },

  // ================================================================
  // لوحة المشرف / المدير / التنسيق
  // ================================================================
  async _loadElevatedDashboard(role, container) {
    const [statsRes, todayRes, usageRes] = await Promise.all([
      API.getShiftStats(),
      API.getTodayStatus(),
      role === ROLES.MANAGER ? API.getApiUsage() : Promise.resolve(null)
    ]);

    let html = '';

    if (statsRes.success) {
      html += this._buildShiftCards(statsRes.data, todayRes.success ? todayRes.data : {});
    }

    html += this._buildNavCards(role);

    if (role === ROLES.MANAGER && usageRes?.success) {
      html += this._buildUsageCard(usageRes);
    }

    container.innerHTML = html || '<div class="empty-state"><div class="empty-state-icon">👋</div><div class="empty-state-text">مرحباً</div></div>';

    if (role === ROLES.MANAGER && usageRes?.success) {
      this._animateQuotaBar(usageRes.today?.percentage || 0);
    }
  },

  _buildNavCards(role) {
    const items = [
      { id: 'employees',     icon: '👥', label: 'الموظفون',         color: '#1565C0', show: [ROLES.SUPERVISOR, ROLES.COORDINATOR, ROLES.MANAGER] },
      { id: 'leaves',        icon: '✈️', label: 'الإجازات',         color: '#2E7D32' },
      { id: 'overtime',      icon: '⏰💰', label: 'العمل الإضافي', color: '#E65100' },
      { id: 'overview',      icon: '📊', label: 'العرض الشامل',     color: '#6A1B9A' },
      { id: 'regions',       icon: '📍', label: 'المناطق والمراكز', color: '#C2185B' },
      { id: 'equipment',     icon: '🔧', label: 'العدد والمقاسات',  color: '#3949AB' },
      { id: 'notifications', icon: '🔔', label: 'الإشعارات',        color: '#1565C0' },
      { id: 'log',           icon: '📋', label: 'السجل',            color: '#6A1B9A', show: [ROLES.COORDINATOR, ROLES.MANAGER] },
      { id: 'settings',      icon: '⚙️', label: 'الإعدادات',        color: '#006064', show: [ROLES.MANAGER] },
    ];
    let html = `<div class="section-title mb-12">📋 التنقل السريع</div><div class="nav-cards-grid mb-24">`;
    items.forEach(item => {
      if (item.show && !item.show.includes(role)) return;
      const c = item.color;
      html += `
        <div class="nav-card card-interactive" onclick="navigateTo('${item.id}')"
             style="border-top:3px solid ${c}">
          <div style="font-size:1.8rem;margin-bottom:6px;">${item.icon}</div>
          <div style="font-weight:700;font-size:.85rem;color:var(--text)">${item.label}</div>
        </div>`;
    });
    html += `</div>`;
    return html;
  },

  _buildShiftCards(stats, today) {
    let html = `<div class="section-title">📊 نظرة عامة على الورديات</div><div class="grid-4 mb-24">`;
    SHIFTS.forEach(shift => {
      const s     = stats[shift] || { total:0, employees:0, supervisors:0 };
      const t     = today[shift] || {};
      const color = AppState.shiftColors[shift] || '#1565C0';
      const si    = { صباح:{l:'دوام صباحي',i:'☀️'}, مساء:{l:'دوام مسائي',i:'🌙'}, راحة:{l:'راحة',i:'🏖️'} }[t.status] || {l:'...',i:'⏳'};
      html += `
        <div class="stat-card card-interactive" data-shift="${shift}" style="border-right:4px solid ${color}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <div style="font-size:1.6rem;font-weight:900;color:${color}">وردية ${shift}</div>
            <div style="font-size:1.8rem;">${si.i}</div>
          </div>
          <div style="display:flex;gap:20px;margin-bottom:14px;">
            <div style="text-align:center;"><div style="font-size:2rem;font-weight:900;color:${color}">${s.total}</div><div style="font-size:.7rem;color:var(--text-muted)">إجمالي</div></div>
            <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:${color}">${s.employees}</div><div style="font-size:.7rem;color:var(--text-muted)">موظف</div></div>
            <div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:${color}">${s.supervisors}</div><div style="font-size:.7rem;color:var(--text-muted)">مشرف</div></div>
          </div>
          <div style="background:${color}12;border-radius:8px;padding:8px 12px;">
            <span style="font-size:.875rem;color:${color};font-weight:700;">${si.l}</span>
          </div>
        </div>`;
    });
    html += `</div>`;
    return html;
  },

  _buildUsageCard(usageRes) {
    const today   = usageRes.today || { count:0, percentage:0 };
    const history = usageRes.history || [];
    const quota   = usageRes.dailyQuota || 20000;
    const pct     = today.percentage || 0;
    const bc      = pct>=95?'red':pct>=75?'orange':pct>=60?'yellow':'green';

    const bars = history.slice(0,7).map(d => {
      const p  = d.percentage;
      const c  = p>=95?'red':p>=75?'orange':p>=60?'yellow':'green';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
        <div style="font-size:.65rem;color:var(--text-muted);">${d.weekDay.substring(0,3)}</div>
        <div style="height:60px;width:100%;background:var(--surface2);border-radius:6px;position:relative;overflow:hidden;">
          <div class="quota-bar ${c}" style="position:absolute;bottom:0;height:${Math.min(p,100)}%;width:100%;border-radius:6px;"></div>
        </div>
        <div style="font-size:.65rem;color:var(--text-muted);">${p}%</div>
      </div>`;
    }).join('');

    return `
      <div class="section-title">📈 بطاقة الاستهلاك</div>
      <div class="card mb-24">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px;">
          <div>
            <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:6px;">اليوم: ${today.date||'-'}</div>
            <div style="font-size:2.4rem;font-weight:900;color:var(--primary)">${today.count||0}</div>
            <div style="font-size:.85rem;color:var(--text-muted);">من ${quota.toLocaleString()} طلب/يوم</div>
          </div>
          <div>
            <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:10px;">نسبة الاستهلاك</div>
            <div class="quota-bar-wrap" style="margin-bottom:8px;"><div id="quotaBar" class="quota-bar ${bc}" style="width:0%"></div></div>
            <div style="font-size:1.5rem;font-weight:800;">${pct}%</div>
          </div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:14px;">
          <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:10px;font-weight:700;">آخر 7 أيام</div>
          <div style="display:flex;gap:8px;align-items:flex-end;">${bars}</div>
        </div>
      </div>`;
  },

  _animateQuotaBar(pct) {
    setTimeout(() => { const b=document.getElementById('quotaBar'); if(b) b.style.width=Math.min(pct,100)+'%'; }, 350);
  },

  // ── مساعد ألوان الحالة ──
  _statusStyle(status) {
    const m = {
      'قيد المراجعة':    'background:#E8EAF6;color:#283593',
      'موافق عليها':      'background:#E8F5E9;color:#2E7D32',
      'مرفوضة':           'background:#FFEBEE;color:#C62828',
      'تم الانشاء':       'background:#E3F2FD;color:#1565C0',
      'موافقة المشرف':    'background:#E8F5E9;color:#2E7D32',
      'مرفوض من المشرف':  'background:#FFEBEE;color:#C62828',
      'ارسل الي التنسيق': 'background:#FFF3E0;color:#E65100',
      'ارسل في النظام':   'background:#F3E5F5;color:#6A1B9A',
      'تم الاستلام':      'background:#E0F7FA;color:#006064',
      'لم يتم الاستلام':  'background:#FCE4EC;color:#880E4F',
    };
    return m[status] || 'background:#eee;color:#333';
  }
};
