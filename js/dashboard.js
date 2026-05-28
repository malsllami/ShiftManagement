// ================================================================
// dashboard.js - لوحة التحكم الرئيسية
// ================================================================

const Dashboard = {
  async load() {
    const role = Auth.getActiveRole();
    const container = document.getElementById('page-dashboard');
    container.innerHTML = `<div class="spinner"></div>`;

    const [statsRes, todayRes, usageRes] = await Promise.all([
      API.getShiftStats(),
      API.getTodayStatus(),
      role === ROLES.MANAGER ? API.getApiUsage() : Promise.resolve(null)
    ]);

    let html = '';

    // ── إحصائيات الورديات ──
    if (statsRes.success) {
      html += this._buildShiftCards(statsRes.data, todayRes.success ? todayRes.data : {});
    }

    // ── بطاقة الموظف (لوضع الموظف) ──
    if (role === ROLES.EMPLOYEE) {
      html += await this._buildEmployeeCard();
    }

    // ── بطاقة الاستهلاك (المدير) ──
    if (role === ROLES.MANAGER && usageRes && usageRes.success) {
      html += this._buildUsageCard(usageRes);
    }

    container.innerHTML = html || '<div class="empty-state"><div class="empty-state-icon">🏠</div><div class="empty-state-text">مرحباً بك</div></div>';
    container.classList.add('anim-slide');

    // إضافة التفاعل لبطاقات الورديات
    container.querySelectorAll('.shift-card[data-shift]').forEach(card => {
      card.addEventListener('click', () => navigateTo('employees'));
    });

    // تشغيل شريط الاستهلاك
    if (role === ROLES.MANAGER && usageRes?.success) {
      this._animateQuotaBar(usageRes.today?.percentage || 0);
    }
  },

  _buildShiftCards(stats, today) {
    const settings = AppState.settings;
    let html = `<div class="section-title">📊 نظرة عامة على الورديات</div>
                <div class="grid-4 mb-24">`;

    SHIFTS.forEach(shift => {
      const s     = stats[shift] || { total: 0, employees: 0, supervisors: 0 };
      const t     = today[shift] || {};
      const color = AppState.shiftColors[shift] || '#1565C0';
      const statusInfo = { صباح: { label: 'دوام صباحي', icon: '🌅' }, مساء: { label: 'دوام مسائي', icon: '🌙' }, راحة: { label: 'راحة', icon: '🏠' } };
      const si    = statusInfo[t.status] || { label: '...', icon: '⏳' };

      html += `
        <div class="stat-card card-interactive shift-card" data-shift="${shift}"
             style="--shift-clr:${color}; border-right-color:${color}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div style="font-size:1.5rem;font-weight:900;color:${color}">وردية ${shift}</div>
            <div style="font-size:1.6rem;">${si.icon}</div>
          </div>
          <div style="display:flex;gap:16px;margin-bottom:12px;">
            <div style="text-align:center;">
              <div style="font-size:1.8rem;font-weight:900;color:${color}">${s.total}</div>
              <div style="font-size:.75rem;color:var(--text-muted);">إجمالي</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:1.4rem;font-weight:700;color:${color}">${s.employees}</div>
              <div style="font-size:.75rem;color:var(--text-muted);">موظف</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:1.4rem;font-weight:700;color:${color}">${s.supervisors}</div>
              <div style="font-size:.75rem;color:var(--text-muted);">مشرف</div>
            </div>
          </div>
          <div style="background:${color}15;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:.85rem;color:${color};font-weight:700;">${si.label}</span>
          </div>
        </div>`;
    });

    html += `</div>`;
    return html;
  },

  async _buildEmployeeCard() {
    const empRes = await API.getEmployee(Auth.getEmployeeId());
    if (!empRes.success) return '';

    const emp      = empRes.data;
    const leavRes  = await API.getLeaves();
    const leave    = leavRes.success && leavRes.data.length > 0 ? leavRes.data[0] : null;
    const color    = AppState.shiftColors[emp.shift] || '#1565C0';

    return `
      <div class="section-title">👤 بياناتي</div>
      <div class="grid-3 mb-24">
        <div class="card">
          <div class="card-title" style="margin-bottom:16px;"><span class="card-title-icon">👤</span>معلومات شخصية</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div><span class="text-muted text-small">الاسم: </span><strong>${emp.fullName}</strong></div>
            <div><span class="text-muted text-small">الرقم الوظيفي: </span><strong>${emp.employeeId}</strong></div>
            <div><span class="text-muted text-small">الجوال: </span><strong>${emp.phone || '-'}</strong></div>
            <div><span class="text-muted text-small">الوردية: </span>${getShiftBadge(emp.shift)}</div>
          </div>
          <button class="btn btn-outline btn-sm mt-16 w-100" onclick="openEmployeeProfileModal()">✏️ تعديل بياناتي</button>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom:16px;"><span class="card-title-icon">🪪</span>البطاقات</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <div class="text-small text-muted mb-8">بطاقة العمل</div>
              <div>${emp.workCardExpiry ? formatDate(emp.workCardExpiry) : 'غير محدد'}</div>
              <div class="mt-8">${getDaysCell(emp.workCardRemaining)}</div>
            </div>
            <hr class="divider">
            <div>
              <div class="text-small text-muted mb-8">بطاقة المصدر/المستلم</div>
              <div>${emp.sourceCardExpiry ? formatDate(emp.sourceCardExpiry) : 'غير محدد'}</div>
              <div class="mt-8">${getDaysCell(emp.sourceCardRemaining)}</div>
            </div>
          </div>
        </div>

        ${leave ? `
        <div class="card">
          <div class="card-title" style="margin-bottom:16px;"><span class="card-title-icon">🌴</span>رصيد الإجازات</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <div class="text-small text-muted">إجازة سنوية</div>
              <div style="font-size:1.8rem;font-weight:900;color:var(--primary)">${leave.systemRemaining}</div>
              <div class="text-small text-muted">من أصل ${leave.systemBalance} يوم</div>
            </div>
            ${leave.scheduledBalance > 0 ? `
            <hr class="divider">
            <div>
              <div class="text-small text-muted">مجدولة</div>
              <div style="font-size:1.4rem;font-weight:700;color:var(--accent)">${leave.scheduledRemaining}</div>
              <div class="text-small text-muted">من أصل ${leave.scheduledBalance} يوم</div>
            </div>` : ''}
          </div>
          <button class="btn btn-primary btn-sm mt-16 w-100" onclick="navigateTo('leaves')">📋 طلب إجازة</button>
        </div>` : ''}
      </div>`;
  },

  _buildUsageCard(usageRes) {
    const today   = usageRes.today || { count: 0, percentage: 0 };
    const history = usageRes.history || [];
    const quota   = usageRes.dailyQuota || 20000;
    const pct     = today.percentage || 0;

    const barClass = pct >= 95 ? 'red' : pct >= 75 ? 'orange' : pct >= 60 ? 'yellow' : 'green';
    const empCount = 0; // يُحدَّث لاحقاً

    let historyHtml = '';
    history.slice(0, 7).forEach(d => {
      const p     = d.percentage;
      const bc    = p >= 95 ? 'red' : p >= 75 ? 'orange' : p >= 60 ? 'yellow' : 'green';
      historyHtml += `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
          <div style="font-size:.7rem;color:var(--text-muted);">${d.weekDay.substring(0,3)}</div>
          <div style="height:60px;width:100%;background:var(--surface2);border-radius:6px;position:relative;overflow:hidden;">
            <div class="quota-bar ${bc}" style="position:absolute;bottom:0;height:${Math.min(p,100)}%;width:100%;border-radius:6px;"></div>
          </div>
          <div style="font-size:.65rem;color:var(--text-muted);">${p}%</div>
        </div>`;
    });

    return `
      <div class="section-title">📈 بطاقة الاستهلاك</div>
      <div class="card mb-24">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
          <div>
            <div style="font-size:.875rem;color:var(--text-muted);margin-bottom:8px;">اليوم: ${today.date || '-'}</div>
            <div style="font-size:2.5rem;font-weight:900;color:var(--primary);">${today.count || 0}</div>
            <div style="font-size:.875rem;color:var(--text-muted);">من أصل ${quota.toLocaleString()} طلب/يوم</div>
          </div>
          <div>
            <div style="font-size:.875rem;color:var(--text-muted);margin-bottom:12px;">نسبة الاستهلاك</div>
            <div class="quota-bar-wrap" style="margin-bottom:8px;">
              <div id="quotaBar" class="quota-bar ${barClass}" style="width:0%"></div>
            </div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--${barClass === 'green' ? 'success' : barClass === 'red' ? 'danger' : 'warning'})">${pct}%</div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:16px;margin-bottom:8px;">
          <div style="font-size:.875rem;color:var(--text-muted);margin-bottom:12px;font-weight:600;">آخر 7 أيام</div>
          <div style="display:flex;gap:8px;align-items:flex-end;">${historyHtml}</div>
        </div>

        <div style="margin-top:16px;padding:12px;background:var(--gradient-soft);border-radius:var(--radius);font-size:.8rem;color:var(--text-muted);">
          من 0 إلى 60% <span style="color:#2E7D32;font-weight:700;">طبيعي ●</span>
          &nbsp;&nbsp;61-75% <span style="color:#F9A825;font-weight:700;">تنبيه ●</span>
          &nbsp;&nbsp;76-95% <span style="color:#F57C00;font-weight:700;">تحذير ●</span>
          &nbsp;&nbsp;96-100% <span style="color:#C62828;font-weight:700;">حرج ●</span>
        </div>
      </div>`;
  },

  _animateQuotaBar(pct) {
    setTimeout(() => {
      const bar = document.getElementById('quotaBar');
      if (bar) bar.style.width = Math.min(pct, 100) + '%';
    }, 300);
  }
};
