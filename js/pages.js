// ================================================================
// pages.js - صفحات الموظفين والمناطق والعدد والإجازات والإضافي
//            والإشعارات والسجل والعرض الشامل والإعدادات
// ================================================================

// ================================================================
// صفحة الموظفين
// ================================================================
const EmployeesPage = {
  data: [],

  async load() {
    const role = Auth.getActiveRole();
    document.getElementById('page-employees').innerHTML = `<div class="spinner"></div>`;

    const res = await API.getEmployees();
    if (!res.success) { this._showError(res.message); return; }
    this.data = res.data;
    this._render();
  },

  _render(filterShift = '', filterRole = '', search = '') {
    const role = Auth.getActiveRole();
    let data   = this.data;

    if (filterShift) data = data.filter(e => e.shift === filterShift);
    if (filterRole)  data = data.filter(e => e.role  === filterRole);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(e => e.fullName.toLowerCase().includes(q) || String(e.employeeId).includes(q));
    }

    const canAdd     = role === ROLES.MANAGER || role === ROLES.SUPERVISOR;
    const canTransfer = role === ROLES.MANAGER || role === ROLES.SUPERVISOR;

    let html = `
      <div class="section-title">👥 الموظفون</div>
      <div class="card mb-16">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <input type="text" class="form-control" style="max-width:220px;" placeholder="🔍 بحث بالاسم أو الرقم"
                 oninput="EmployeesPage._render('','','${filterShift}','${filterRole}',this.value)" id="empSearch">
          <select class="form-control" style="max-width:160px;" onchange="EmployeesPage._renderFilter(this,'shift')">
            <option value="">كل الورديات</option>
            ${SHIFTS.map(s => `<option value="${s}" ${filterShift===s?'selected':''}>${s}</option>`).join('')}
          </select>
          <select class="form-control" style="max-width:180px;" onchange="EmployeesPage._renderFilter(this,'role')">
            <option value="">كل الصلاحيات</option>
            ${Object.values(ROLES).map(r => `<option value="${r}" ${filterRole===r?'selected':''}>${r}</option>`).join('')}
          </select>
          ${canAdd ? `<button class="btn btn-primary" onclick="openAddEmployeeModal()">➕ إضافة موظف</button>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>الرقم الوظيفي</th><th>الاسم</th><th>الجوال</th>
                <th>الوردية</th><th>الصلاحية</th>
                <th>بطاقة العمل</th><th>المتبقي</th>
                <th>بطاقة المصدر</th><th>المتبقي</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>`;

    if (data.length === 0) {
      html += `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">لا يوجد موظفون</div></div></td></tr>`;
    } else {
      data.forEach(emp => {
        html += `<tr>
          <td><strong>${emp.employeeId}</strong></td>
          <td>${emp.fullName}</td>
          <td dir="ltr">${emp.phone || '-'}</td>
          <td>${getShiftBadge(emp.shift)}</td>
          <td>${getRoleBadge(emp.role)}</td>
          <td>${emp.workCardExpiry ? formatDate(emp.workCardExpiry) : '-'}</td>
          <td>${getDaysCell(emp.workCardRemaining)}</td>
          <td>${emp.sourceCardExpiry ? formatDate(emp.sourceCardExpiry) : '-'}</td>
          <td>${getDaysCell(emp.sourceCardRemaining)}</td>
          <td>
            <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
              <button class="btn btn-ghost btn-sm" onclick="openEditEmployeeModal('${emp.employeeId}')">✏️</button>
              ${canTransfer ? `<button class="btn btn-warning btn-sm" onclick="openTransferModal('${emp.employeeId}')">🔄</button>` : ''}
              ${role === ROLES.MANAGER || role === ROLES.SUPERVISOR
                ? `<button class="btn btn-outline btn-sm" onclick="openRoleModal('${emp.employeeId}')">🎖️</button>` : ''}
            </div>
          </td>
        </tr>`;
      });
    }

    html += `</tbody></table></div></div>`;
    document.getElementById('page-employees').innerHTML = html;
  },

  _renderFilter(sel, type) {
    const searchVal = document.getElementById('empSearch')?.value || '';
    if (type === 'shift') this._render(sel.value, '', searchVal);
    else                  this._render('', sel.value, searchVal);
  },

  _showError(msg) {
    document.getElementById('page-employees').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">❌</div><div>${msg}</div></div>`;
  }
};

// ================================================================
// صفحة المناطق والمراكز
// ================================================================
const RegionsPage = {
  async load() {
    document.getElementById('page-regions').innerHTML = `<div class="spinner"></div>`;
    const res = await API.getRegions();
    if (!res.success) { document.getElementById('page-regions').innerHTML = `<div class="empty-state"><div>${res.message}</div></div>`; return; }

    const data = res.data;
    let html = `<div class="section-title">📍 المناطق والمراكز</div>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>الرقم الوظيفي</th><th>الاسم</th><th>الوردية</th><th>المنطقة</th><th>المركز</th><th>رقم السيارة</th><th>تعديل</th></tr>
            </thead>
            <tbody>`;

    if (data.length === 0) {
      html += `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">📍</div><div class="empty-state-text">لا توجد بيانات</div></div></td></tr>`;
    } else {
      data.forEach(r => {
        html += `<tr>
          <td>${r.employeeId}</td>
          <td>${r.fullName}</td>
          <td>${getShiftBadge(r.shift)}</td>
          <td>${r.region || '-'}</td>
          <td>${r.center || '-'}</td>
          <td>${r.carNumber || '-'}</td>
          <td><button class="btn btn-ghost btn-sm" onclick="openRegionEditModal('${r.employeeId}')">✏️ تعديل</button></td>
        </tr>`;
      });
    }

    html += `</tbody></table></div></div>`;
    document.getElementById('page-regions').innerHTML = html;
  }
};

// ================================================================
// صفحة العدد والمقاسات
// ================================================================
const EquipmentPage = {
  async load() {
    document.getElementById('page-equipment').innerHTML = `<div class="spinner"></div>`;
    const res = await API.getEquipment();
    if (!res.success) { document.getElementById('page-equipment').innerHTML = `<div class="empty-state"><div>${res.message}</div></div>`; return; }

    const data = res.data;
    let html = `<div class="section-title">🔧 العدد والمقاسات</div>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>الرقم</th><th>الاسم</th><th>الوردية</th>
                <th>قميص CAT2</th><th>بنطلون CAT2</th><th>سيفتي شوز</th>
                <th>بدلة CAT4</th><th>برافو</th><th>ميجر</th><th>عدد أخرى</th>
                <th>تعديل</th>
              </tr>
            </thead>
            <tbody>`;

    data.forEach(e => {
      html += `<tr>
        <td>${e.employeeId}</td>
        <td>${e.fullName}</td>
        <td>${getShiftBadge(e.shift)}</td>
        <td>${e.cat2Shirt  || '-'}</td>
        <td>${e.cat2Pants  || '-'}</td>
        <td>${e.safetyShoes || '-'}</td>
        <td>${e.cat4Suit   || '-'}</td>
        <td>${e.bravo      || '-'}</td>
        <td>${e.major      || '-'}</td>
        <td>${e.otherQty   || '-'}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="openEquipmentEditModal('${e.employeeId}')">✏️</button></td>
      </tr>`;
    });

    if (data.length === 0) html += `<tr><td colspan="11"><div class="empty-state"><div class="empty-state-icon">🔧</div><div class="empty-state-text">لا توجد بيانات</div></div></td></tr>`;

    html += `</tbody></table></div></div>`;
    document.getElementById('page-equipment').innerHTML = html;
  }
};

// ================================================================
// صفحة الإجازات
// ================================================================
const LeavesPage = {
  async load() {
    document.getElementById('page-leaves').innerHTML = `<div class="spinner"></div>`;
    const [leavesRes, requestsRes] = await Promise.all([API.getLeaves(), API.getLeaveRequests()]);
    let html = '';

    // أرصدة الإجازات
    if (leavesRes.success && leavesRes.data.length > 0) {
      html += `<div class="section-title">🌴 أرصدة الإجازات</div>
               <div class="grid-3 mb-24">`;
      leavesRes.data.forEach(l => {
        html += `<div class="card card-interactive" onclick="openLeaveBalanceModal('${l.employeeId}')">
          <div style="font-weight:700;margin-bottom:12px;">${l.fullName} ${getShiftBadge(l.shift)}</div>
          <div style="display:flex;gap:20px;">
            <div style="text-align:center;">
              <div style="font-size:1.8rem;font-weight:900;color:var(--primary)">${l.systemRemaining}</div>
              <div class="text-small text-muted">سنوية</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:1.4rem;font-weight:700;color:var(--accent)">${l.scheduledRemaining}</div>
              <div class="text-small text-muted">مجدولة</div>
            </div>
          </div>
        </div>`;
      });
      html += `</div>`;
    }

    // زر تقديم إجازة
    html += `<div class="d-flex items-center gap-12 mb-16">
               <div class="section-title" style="margin-bottom:0;border:none;padding:0;">📋 طلبات الإجازات</div>
               <button class="btn btn-primary" onclick="openLeaveRequestModal()">➕ طلب إجازة جديد</button>
             </div>`;

    // جدول الطلبات
    if (requestsRes.success) {
      html += `<div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>رقم الطلب</th><th>الاسم</th><th>النوع</th>
                <th>البداية</th><th>الانتهاء</th><th>المدة</th>
                <th>الحالة</th><th>المراجع</th><th>التاريخ</th>
                ${Auth.getActiveRole() !== ROLES.EMPLOYEE ? '<th>إجراء</th>' : ''}
              </tr>
            </thead>
            <tbody>`;

      const reqs = requestsRes.data || [];
      if (reqs.length === 0) {
        html += `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">🌴</div><div class="empty-state-text">لا توجد طلبات</div></div></td></tr>`;
      } else {
        reqs.forEach(r => {
          html += `<tr>
            <td style="font-size:.78rem;">${r.requestId}</td>
            <td>${r.fullName}</td>
            <td>${r.leaveType}</td>
            <td>${formatDate(r.startDate)}</td>
            <td>${formatDate(r.endDate)}</td>
            <td>${r.duration} يوم</td>
            <td>${getStatusBadge(r.status)}</td>
            <td>${r.reviewerName || '-'}</td>
            <td style="font-size:.78rem;">${r.requestDate?.split(' ')[0] || '-'}</td>
            ${Auth.getActiveRole() !== ROLES.EMPLOYEE
              ? `<td>
                  ${r.status === 'قيد المراجعة'
                    ? `<div style="display:flex;gap:4px;">
                        <button class="btn btn-success btn-sm" onclick="reviewLeave('${r.requestId}','approve')">✅</button>
                        <button class="btn btn-danger btn-sm" onclick="reviewLeave('${r.requestId}','reject')">❌</button>
                       </div>`
                    : '-'}
                 </td>` : ''}
          </tr>`;
        });
      }

      html += `</tbody></table></div></div>`;
    }

    document.getElementById('page-leaves').innerHTML = html;
  }
};

// ================================================================
// صفحة العمل الإضافي
// ================================================================
const OvertimePage = {
  filterFrom: '', filterTo: '',

  async load() {
    document.getElementById('page-overtime').innerHTML = `<div class="spinner"></div>`;
    const res = await API.getOvertime();
    if (!res.success) { document.getElementById('page-overtime').innerHTML = `<div class="empty-state"><div>${res.message}</div></div>`; return; }

    const role = Auth.getActiveRole();
    const data = res.data || [];

    let html = `
      <div class="d-flex items-center gap-12 mb-16" style="flex-wrap:wrap;">
        <div class="section-title" style="margin-bottom:0;border:none;padding:0;">⏱️ العمل الإضافي</div>
        <button class="btn btn-primary" onclick="openOvertimeFormModal()">➕ طلب عمل إضافي</button>
        <input type="date" class="form-control" style="max-width:160px;" placeholder="من" id="otFrom">
        <input type="date" class="form-control" style="max-width:160px;" placeholder="إلى" id="otTo">
        <button class="btn btn-ghost" onclick="OvertimePage.applyFilter()">🔍 فلتر</button>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>رقم الطلب</th><th>الاسم</th><th>التاريخ</th><th>اليوم</th>
                <th>الساعات</th><th>السبب</th><th>الحالة الكلية</th>
                <th>المراجع</th><th>التنسيق</th>
                ${role !== ROLES.EMPLOYEE ? '<th>إجراء</th>' : ''}
              </tr>
            </thead>
            <tbody>`;

    if (data.length === 0) {
      html += `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">⏱️</div><div class="empty-state-text">لا توجد طلبات</div></div></td></tr>`;
    } else {
      data.forEach(ot => {
        html += `<tr>
          <td style="font-size:.75rem;">${ot.requestId}</td>
          <td>${ot.fullName}</td>
          <td>${formatDate(ot.date)}</td>
          <td>${ot.weekDay}</td>
          <td>${ot.hours}</td>
          <td style="max-width:180px;font-size:.8rem;">${ot.reason}</td>
          <td>${getStatusBadge(ot.overallStatus)}</td>
          <td>${ot.reviewerName || '-'}</td>
          <td>${ot.coordinatorName || '-'}</td>
          ${role !== ROLES.EMPLOYEE
            ? `<td>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                  ${(role === ROLES.SUPERVISOR || role === ROLES.MANAGER) && ot.overallStatus === 'تم الانشاء'
                    ? `<button class="btn btn-success btn-sm" onclick="reviewOT('${ot.requestId}','approve')">✅</button>
                       <button class="btn btn-danger btn-sm" onclick="reviewOT('${ot.requestId}','reject')">❌</button>`
                    : ''}
                  ${(role === ROLES.COORDINATOR || role === ROLES.MANAGER) && ot.overallStatus === 'ارسل الي التنسيق'
                    ? `<button class="btn btn-primary btn-sm" onclick="coordProcessOT('${ot.requestId}','send')">📤 نظام</button>
                       <button class="btn btn-warning btn-sm" onclick="coordProcessOT('${ot.requestId}','return')">↩️</button>`
                    : ''}
                  ${role === ROLES.EMPLOYEE && ot.overallStatus === 'ارسل في النظام'
                    ? `<button class="btn btn-success btn-sm" onclick="ackOT('${ot.requestId}',true)">✅ تم الاستلام</button>`
                    : ''}
                </div>
               </td>` : ''}
        </tr>`;
      });
    }

    html += `</tbody></table></div></div>`;
    document.getElementById('page-overtime').innerHTML = html;
  },

  async applyFilter() {
    const from = document.getElementById('otFrom')?.value;
    const to   = document.getElementById('otTo')?.value;
    document.getElementById('page-overtime').innerHTML = `<div class="spinner"></div>`;
    const res = await API.getOvertime({ fromDate: from, toDate: to });
    // إعادة الرسم مع البيانات المفلترة
    await this.load();
  }
};

// ================================================================
// صفحة العرض الشامل
// ================================================================
const OverviewPage = {
  async load() {
    const role = Auth.getActiveRole();
    if (role !== ROLES.MANAGER && role !== ROLES.COORDINATOR) {
      document.getElementById('page-overview').innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><div class="empty-state-text">صلاحية خاصة</div></div>`;
      return;
    }
    document.getElementById('page-overview').innerHTML = `<div class="spinner"></div>`;
    const res = await API.getOverview();
    if (!res.success) { document.getElementById('page-overview').innerHTML = `<div class="empty-state"><div>${res.message}</div></div>`; return; }

    let html = `
      <div class="d-flex items-center gap-12 mb-16" style="flex-wrap:wrap;">
        <div class="section-title" style="margin-bottom:0;border:none;padding:0;">📊 العرض الشامل</div>
        <select class="form-control" style="max-width:160px;" id="ovShiftFilter" onchange="OverviewPage.filterShift(this.value)">
          <option value="">كل الورديات</option>
          ${SHIFTS.map(s => `<option value="${s}">وردية ${s}</option>`).join('')}
        </select>
        <button class="btn btn-success" onclick="OverviewPage.exportExcel()">📥 تصدير Excel</button>
        <button class="btn btn-danger"  onclick="OverviewPage.exportPDF()">📄 PDF</button>
        <button class="btn btn-ghost"   onclick="window.print()">🖨️ طباعة</button>
        <button class="btn btn-primary" onclick="OverviewPage.refresh()">🔄 تحديث</button>
      </div>
      <div id="overviewTableWrap">`;

    html += this._buildTable(res.data);
    html += `</div>`;

    document.getElementById('page-overview').innerHTML = html;
    this._allData = res.data;
  },

  _buildTable(data) {
    let html = `<div class="card"><div class="table-wrapper"><table class="data-table" id="overviewTable">
      <thead><tr>
        <th>الرقم</th><th>الاسم</th><th>الوردية</th><th>الصلاحية</th>
        <th>الجوال</th><th>المنطقة</th><th>المركز</th><th>السيارة</th>
        <th>رصيد إجازة</th><th>المتبقي</th>
        <th>انتهاء بطاقة العمل</th><th>المتبقي</th>
        <th>انتهاء بطاقة المصدر</th><th>المتبقي</th>
        <th>قميص CAT2</th><th>بنطلون CAT2</th><th>سيفتي شوز</th>
        <th>بدلة CAT4</th><th>برافو</th><th>ميجر</th><th>أخرى</th>
      </tr></thead><tbody>`;

    let prevShift = '';
    data.forEach(e => {
      if (e.shift !== prevShift && prevShift !== '') {
        html += `<tr style="height:20px;background:transparent;"><td colspan="21"></td></tr>`;
      }
      prevShift = e.shift;
      const color = AppState.shiftColors[e.shift] || '#1565C0';
      html += `<tr style="border-right:3px solid ${color}">
        <td>${e.employeeId}</td>
        <td>${e.fullName}</td>
        <td>${getShiftBadge(e.shift)}</td>
        <td>${getRoleBadge(e.role)}</td>
        <td dir="ltr">${e.phone || '-'}</td>
        <td>${e.region || '-'}</td>
        <td>${e.center || '-'}</td>
        <td>${e.carNumber || '-'}</td>
        <td>${e.leaveBalance}</td>
        <td>${getDaysCell(e.leaveRemaining)}</td>
        <td>${e.workCardExpiry ? formatDate(e.workCardExpiry) : '-'}</td>
        <td>${getDaysCell(e.workCardRemaining)}</td>
        <td>${e.sourceCardExpiry ? formatDate(e.sourceCardExpiry) : '-'}</td>
        <td>${getDaysCell(e.sourceCardRemaining)}</td>
        <td>${e.cat2Shirt || '-'}</td>
        <td>${e.cat2Pants || '-'}</td>
        <td>${e.safetyShoes || '-'}</td>
        <td>${e.cat4Suit || '-'}</td>
        <td>${e.bravo || '-'}</td>
        <td>${e.major || '-'}</td>
        <td>${e.otherQty || '-'}</td>
      </tr>`;
    });

    html += `</tbody></table></div></div>`;
    return html;
  },

  filterShift(shift) {
    const filtered = shift ? this._allData.filter(e => e.shift === shift) : this._allData;
    document.getElementById('overviewTableWrap').innerHTML = this._buildTable(filtered);
  },

  async refresh() {
    document.getElementById('page-overview').innerHTML = `<div class="spinner"></div>`;
    const res = await API.refreshOverview();
    showToast(res.success ? res.message : res.message, res.success ? 'success' : 'error');
    await this.load();
  },

  exportExcel() {
    showToast('ميزة التصدير تحتاج مكتبة إضافية - سيتم إضافتها قريباً', 'info');
  },
  exportPDF() {
    showToast('ميزة التصدير تحتاج مكتبة إضافية - سيتم إضافتها قريباً', 'info');
  }
};

// ================================================================
// صفحة الإشعارات
// ================================================================
const NotificationsPage = {
  async load() {
    document.getElementById('page-notifications').innerHTML = `<div class="spinner"></div>`;
    const res = await API.getNotifications();
    if (!res.success) { document.getElementById('page-notifications').innerHTML = `<div class="empty-state"><div>${res.message}</div></div>`; return; }

    const data = res.data || [];
    let html = `
      <div class="d-flex items-center gap-12 mb-16">
        <div class="section-title" style="margin-bottom:0;border:none;padding:0;">🔔 الإشعارات</div>
        <button class="btn btn-ghost" onclick="markAllRead()">✔ تحديد الكل كمقروء</button>
      </div>`;

    if (data.length === 0) {
      html += `<div class="empty-state"><div class="empty-state-icon">🔔</div><div class="empty-state-text">لا توجد إشعارات</div></div>`;
    } else {
      html += `<div class="card" style="padding:0;">`;
      data.forEach(n => {
        const bgColors = {
          'تم الانشاء': '#E3F2FD', 'موافقة المشرف': '#E8F5E9', 'مرفوض من المشرف': '#FFEBEE',
          'ارسل الي التنسيق': '#FFF3E0', 'ارسل في النظام': '#F3E5F5', 'تم الاستلام': '#E0F7FA',
          'قيد المراجعة': '#E8EAF6', 'موافق عليها': '#E8F5E9', 'مرفوضة': '#FFEBEE', 'تغيير صلاحية': '#FFF8E1'
        };
        const bg = n.isCompleted ? '#F5F5F5' : (bgColors[n.stage] || '#FFFFFF');
        html += `
          <div class="notif-item ${n.isRead ? '' : 'unread'} ${n.isCompleted ? 'completed' : ''}"
               style="background:${bg};" onclick="markNotifRead('${n.notifId}', this)">
            <div class="notif-msg" style="${n.isCompleted ? 'text-decoration:line-through;' : ''}">
              ${n.isRead ? '' : '<span style="color:var(--primary);font-weight:700;">● </span>'}
              ${n.message}
            </div>
            <div class="notif-time">${n.datetime} &nbsp;|&nbsp; ${n.type} &nbsp;|&nbsp; ${n.stage}</div>
          </div>`;
      });
      html += `</div>`;
    }

    document.getElementById('page-notifications').innerHTML = html;
    refreshNotifBadge();
  }
};

// ================================================================
// صفحة السجل
// ================================================================
const LogPage = {
  async load() {
    document.getElementById('page-log').innerHTML = `<div class="spinner"></div>`;
    const res = await API.getLogs();
    if (!res.success) { document.getElementById('page-log').innerHTML = `<div class="empty-state"><div>${res.message}</div></div>`; return; }

    const data = res.data || [];
    let html = `<div class="section-title">📋 سجل العمليات</div>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>رقم السجل</th><th>التاريخ والوقت</th><th>العملية</th><th>الموظف</th><th>الرقم</th><th>الصلاحية</th><th>التفاصيل</th></tr></thead>
            <tbody>`;

    if (data.length === 0) {
      html += `<tr><td colspan="7"><div class="empty-state"><div>لا توجد سجلات</div></div></td></tr>`;
    } else {
      data.slice(0, 200).forEach(l => {
        html += `<tr>
          <td style="font-size:.7rem;">${l.logId}</td>
          <td style="font-size:.78rem;">${l.datetime}</td>
          <td><span class="badge" style="background:var(--gradient-soft);color:var(--primary)">${l.operationType}</span></td>
          <td>${l.employeeName || '-'}</td>
          <td>${l.employeeId || '-'}</td>
          <td>${l.role || '-'}</td>
          <td style="font-size:.8rem;max-width:250px;">${l.details}</td>
        </tr>`;
      });
    }

    html += `</tbody></table></div></div>`;
    document.getElementById('page-log').innerHTML = html;
  }
};

// ================================================================
// صفحة الإعدادات
// ================================================================
const SettingsPage = {
  async load() {
    const role = Auth.getActiveRole();
    if (role !== ROLES.MANAGER) {
      document.getElementById('page-settings').innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><div>المدير فقط</div></div>`;
      return;
    }

    document.getElementById('page-settings').innerHTML = `<div class="spinner"></div>`;
    const res = await API.getSettings();
    if (!res.success) return;

    const s = res.data;
    const shiftLabels = { a: 'أ', b: 'ب', d: 'د', j: 'ج' };

    let html = `<div class="section-title">⚙️ الإعدادات</div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title mb-16"><span class="card-title-icon">🏢</span>معلومات الشركة</div>
          <div class="form-group">
            <label class="form-label">اسم الشركة</label>
            <input type="text" class="form-control" id="set_company_name" value="${s['company_name'] || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">أيام الإجازة السنوية</label>
            <input type="number" class="form-control" id="set_annual_leave_days" value="${s['annual_leave_days'] || 33}">
          </div>
          <div class="form-group">
            <label class="form-label">رمز المدير</label>
            <input type="text" class="form-control" id="set_manager_code" value="${s['manager_code'] || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">كلمة المرور الافتراضية</label>
            <input type="text" class="form-control" id="set_default_password" value="${s['default_password'] || '123456'}">
          </div>
        </div>

        <div class="card">
          <div class="card-title mb-16"><span class="card-title-icon">📅</span>إعدادات دورة الورديات</div>
          <div class="form-group">
            <label class="form-label">تاريخ المرجع</label>
            <input type="date" class="form-control" id="set_cycle_reference_date" value="${s['cycle_reference_date'] || ''}">
          </div>
          ${['a','b','d','j'].map(k => `
          <div class="form-group">
            <label class="form-label">موضع وردية ${shiftLabels[k]} (1-8)</label>
            <input type="number" class="form-control" id="set_shift_${k}_position" min="1" max="8" value="${s[`shift_${k}_position`] || ''}">
          </div>`).join('')}
        </div>

        <div class="card">
          <div class="card-title mb-16"><span class="card-title-icon">🎨</span>ألوان الورديات</div>
          ${['a','b','d','j'].map(k => `
          <div class="form-group" style="display:flex;gap:12px;align-items:center;">
            <label class="form-label" style="margin:0;min-width:120px;">وردية ${shiftLabels[k]}</label>
            <input type="color" class="form-control" style="width:60px;height:42px;padding:4px;" id="set_shift_${k}_color" value="${s[`shift_${k}_color`] || '#1565C0'}">
            <input type="text" class="form-control" id="set_shift_${k}_color_text" value="${s[`shift_${k}_color`] || '#1565C0'}" style="max-width:120px;" oninput="document.getElementById('set_shift_${k}_color').value=this.value">
          </div>`).join('')}
        </div>
      </div>

      <div class="mt-24" style="display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;">
        <button class="btn btn-ghost" onclick="SettingsPage.repairRows(this)" title="إنشاء الصفوف المفقودة للموظفين المضافين يدوياً">
          🔧 إصلاح الصفوف المفقودة
        </button>
        <button class="btn btn-primary btn-lg" onclick="SettingsPage.save()">💾 حفظ الإعدادات</button>
      </div>`;

    document.getElementById('page-settings').innerHTML = html;

    // ربط حقول اللون
    ['a','b','d','j'].forEach(k => {
      document.getElementById(`set_shift_${k}_color`)?.addEventListener('input', function() {
        document.getElementById(`set_shift_${k}_color_text`).value = this.value;
      });
    });
  },

  async repairRows(btn) {
    if (!confirm('سيتم إنشاء صفوف مفقودة في جداول المناطق والعدد والإجازات لكل موظف. متابعة؟')) return;
    lockButton(btn, 15000);
    const res = await API.repairLinkedRows();
    unlockButton(btn);
    showToast(res.success ? res.message : res.message, res.success ? 'success' : 'error');
  },

  async save() {
    const updates = {};
    const fields  = ['company_name','annual_leave_days','manager_code','default_password',
                     'cycle_reference_date',
                     'shift_a_position','shift_b_position','shift_d_position','shift_j_position',
                     'shift_a_color','shift_b_color','shift_d_color','shift_j_color'];

    fields.forEach(f => {
      const el = document.getElementById('set_' + f);
      if (el) updates[f] = el.value;
    });

    const res = await API.updateSettings(updates);
    if (res.success) {
      showToast('تم حفظ الإعدادات', 'success');
      const settingsRes = await API.getSettings();
      if (settingsRes.success) { AppState.settings = settingsRes.data; applyShiftColors(); }
    } else {
      showToast(res.message, 'error');
    }
  }
};

// ================================================================
// دوال الإجراءات السريعة
// ================================================================
async function reviewLeave(requestId, action) {
  let reason = '';
  if (action === 'reject') {
    reason = prompt('سبب الرفض:');
    if (reason === null) return;
  }
  const btn = event.target;
  lockButton(btn, 3000);
  const res = await API.reviewLeaveRequest(requestId, action, reason);
  unlockButton(btn);
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) await LeavesPage.load();
}

async function reviewOT(requestId, action) {
  let reason = '';
  if (action === 'reject') {
    reason = prompt('سبب الرفض:');
    if (reason === null) return;
  }
  const btn = event.target;
  lockButton(btn, 3000);
  const res = await API.reviewOvertime(requestId, action, reason);
  unlockButton(btn);
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) await OvertimePage.load();
}

async function coordProcessOT(requestId, action) {
  let reason = '';
  if (action === 'return') {
    reason = prompt('سبب الإعادة:');
    if (reason === null) return;
  }
  const btn = event.target;
  lockButton(btn, 3000);
  const res = await API.processOvertimeCoordinator(requestId, action, reason);
  unlockButton(btn);
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) await OvertimePage.load();
}

async function ackOT(requestId, received) {
  const btn = event.target;
  lockButton(btn, 3000);
  const res = await API.acknowledgeOvertimeReceipt(requestId, received);
  unlockButton(btn);
  showToast(res.message, res.success ? 'success' : 'error');
  if (res.success) await OvertimePage.load();
}

async function markNotifRead(notifId, el) {
  await API.markNotificationRead(notifId);
  el.classList.remove('unread');
  refreshNotifBadge();
}

async function markAllRead() {
  const res = await API.markAllNotificationsRead();
  showToast(res.message, 'success');
  await NotificationsPage.load();
}
