// ================================================================
// modals.js - نوافذ الإضافة والتعديل والنماذج
// ================================================================

// ================================================================
// نموذج إضافة / تعديل موظف
// ================================================================
async function openAddEmployeeModal() {
  const m = document.getElementById('employeeModal');
  m.querySelector('.modal-title').textContent = '➕ إضافة موظف جديد';
  m.querySelector('#empModalForm').reset();
  m.querySelector('#empModalId').disabled       = false;
  m.querySelector('#empModalIdGroup').style.display = '';
  m.dataset.mode       = 'add';
  m.dataset.targetId   = '';
  openModal('employeeModal');
}

async function openEditEmployeeModal(employeeId) {
  const res = await API.getEmployee(employeeId);
  if (!res.success) { showToast(res.message, 'error'); return; }

  const emp = res.data;
  const m   = document.getElementById('employeeModal');
  m.querySelector('.modal-title').textContent  = '✏️ تعديل بيانات موظف';
  m.querySelector('#empModalId').value         = emp.employeeId;
  m.querySelector('#empModalId').disabled      = true;
  m.querySelector('#empModalName').value       = emp.fullName;
  m.querySelector('#empModalPhone').value      = emp.phone?.replace('+966','') || '';
  m.querySelector('#empModalShift').value      = emp.shift;
  m.querySelector('#empModalRole').value       = emp.role;
  m.querySelector('#empModalRoleCode').value   = emp.roleCode || '';
  m.querySelector('#empModalWorkExpiry').value = emp.workCardExpiry   || '';
  m.querySelector('#empModalSrcExpiry').value  = emp.sourceCardExpiry || '';
  m.querySelector('#empModalStatus').value     = emp.accountStatus || 'نشط';
  m.dataset.mode     = 'edit';
  m.dataset.targetId = employeeId;
  openModal('employeeModal');
}

async function submitEmployeeModal() {
  const m       = document.getElementById('employeeModal');
  const mode    = m.dataset.mode;
  const btn     = document.getElementById('empModalSaveBtn');

  const empId   = normalizeNumbers(document.getElementById('empModalId').value.trim());
  const name    = document.getElementById('empModalName').value.trim();
  const phone   = normalizeNumbers(document.getElementById('empModalPhone').value.trim());
  const shift   = document.getElementById('empModalShift').value;
  const role    = document.getElementById('empModalRole').value;
  const roleCode = document.getElementById('empModalRoleCode').value.trim();
  const workExp = document.getElementById('empModalWorkExpiry').value;
  const srcExp  = document.getElementById('empModalSrcExpiry').value;
  const status  = document.getElementById('empModalStatus').value;

  // تحقق من صيغة الجوال
  if (phone && (!/^5\d{8}$/.test(phone))) {
    showToast('رقم الجوال يجب أن يبدأ بـ 5 ويتكون من 9 أرقام', 'error'); return;
  }

  lockButton(btn, 5000);

  const data = {
    employeeId: empId, fullName: name, phone, shift, role, roleCode,
    workCardExpiry: workExp, sourceCardExpiry: srcExp, accountStatus: status
  };

  let res;
  if (mode === 'add') {
    res = await API.addEmployee(data);
  } else {
    res = await API.updateEmployee(m.dataset.targetId, data);
  }

  unlockButton(btn);

  if (res.success) {
    showToast(res.message, 'success');
    closeModal('employeeModal');
    await EmployeesPage.load();
  } else {
    showToast(res.message, 'error');
  }
}

// ================================================================
// نموذج النقل بين الورديات
// ================================================================
async function openTransferModal(employeeId) {
  const res = await API.getEmployee(employeeId);
  if (!res.success) { showToast(res.message, 'error'); return; }

  const emp = res.data;
  document.getElementById('transferEmpId').textContent   = emp.employeeId;
  document.getElementById('transferEmpName').textContent = emp.fullName;
  document.getElementById('transferOldShift').textContent = `وردية ${emp.shift}`;
  document.getElementById('transferNewShift').value      = '';
  document.getElementById('transferNotes').value         = '';
  document.getElementById('transferModal').dataset.targetId = employeeId;
  openModal('transferModal');
}

async function submitTransferModal() {
  const m        = document.getElementById('transferModal');
  const targetId = m.dataset.targetId;
  const newShift = document.getElementById('transferNewShift').value;
  const notes    = document.getElementById('transferNotes').value.trim();
  const btn      = document.getElementById('transferSaveBtn');

  if (!newShift) { showToast('اختر الوردية الجديدة', 'error'); return; }

  lockButton(btn, 5000);
  const res = await API.transferEmployee(targetId, newShift, notes);
  unlockButton(btn);

  if (res.success) {
    showToast(res.message, 'success');
    closeModal('transferModal');
    await EmployeesPage.load();
  } else {
    showToast(res.message, 'error');
  }
}

// ================================================================
// نموذج تغيير الصلاحية
// ================================================================
async function openRoleModal(employeeId) {
  const res = await API.getEmployee(employeeId);
  if (!res.success) { showToast(res.message, 'error'); return; }

  const emp = res.data;
  document.getElementById('roleEmpName').textContent = emp.fullName;
  document.getElementById('roleCurrentRole').textContent = emp.role;
  document.getElementById('roleNewRole').value = emp.role;
  document.getElementById('roleNewCode').value = emp.roleCode || '';
  document.getElementById('roleModal').dataset.targetId = employeeId;
  openModal('roleModal');
}

async function submitRoleModal() {
  const m        = document.getElementById('roleModal');
  const targetId = m.dataset.targetId;
  const newRole  = document.getElementById('roleNewRole').value;
  const newCode  = document.getElementById('roleNewCode').value.trim();
  const btn      = document.getElementById('roleSaveBtn');

  lockButton(btn, 5000);
  const res = await API.changeEmployeeRole(targetId, newRole, newCode);
  unlockButton(btn);

  if (res.success) {
    showToast(res.message, 'success');
    closeModal('roleModal');
    await EmployeesPage.load();
  } else {
    showToast(res.message, 'error');
  }
}

// ================================================================
// نموذج تعديل المنطقة والمركز
// ================================================================
async function openRegionEditModal(employeeId) {
  const res = await API.getRegions({ employeeId });
  const reg = res.success && res.data.length > 0 ? res.data[0] : {};

  document.getElementById('regionEmpId').textContent   = reg.employeeId || employeeId;
  document.getElementById('regionEmpName').textContent = reg.fullName   || '';
  document.getElementById('regionSelect').value  = reg.region   || '';
  document.getElementById('regionCenter').value  = reg.center   || '';
  document.getElementById('regionCar').value     = reg.carNumber || '';
  document.getElementById('regionModal').dataset.targetId = employeeId;
  openModal('regionModal');
}

async function submitRegionModal() {
  const m        = document.getElementById('regionModal');
  const targetId = m.dataset.targetId;
  const btn      = document.getElementById('regionSaveBtn');

  lockButton(btn, 5000);
  const res = await API.updateRegion(targetId, {
    region:    document.getElementById('regionSelect').value,
    center:    document.getElementById('regionCenter').value.trim(),
    carNumber: document.getElementById('regionCar').value.trim()
  });
  unlockButton(btn);

  if (res.success) {
    showToast(res.message, 'success');
    closeModal('regionModal');
    await RegionsPage.load();
  } else {
    showToast(res.message, 'error');
  }
}

// ================================================================
// نموذج تعديل العدد والمقاسات
// ================================================================
async function openEquipmentEditModal(employeeId) {
  const res = await API.getEquipment();
  const eq  = res.success ? res.data.find(e => e.employeeId === employeeId) : null;

  document.getElementById('eqEmpId').textContent   = employeeId;
  document.getElementById('eqEmpName').textContent = eq?.fullName || '';
  document.getElementById('eqCat2Shirt').value  = eq?.cat2Shirt  || '';
  document.getElementById('eqCat2Pants').value  = eq?.cat2Pants  || '';
  document.getElementById('eqSafetyShoes').value = eq?.safetyShoes || '';
  document.getElementById('eqCat4Suit').value   = eq?.cat4Suit   || '';
  document.getElementById('eqBravo').value      = eq?.bravo      || '';
  document.getElementById('eqMajor').value      = eq?.major      || '';
  document.getElementById('eqOther').value      = eq?.otherQty   || '';
  document.getElementById('equipmentModal').dataset.targetId = employeeId;
  openModal('equipmentModal');
}

async function submitEquipmentModal() {
  const m        = document.getElementById('equipmentModal');
  const targetId = m.dataset.targetId;
  const btn      = document.getElementById('eqSaveBtn');

  lockButton(btn, 5000);
  const res = await API.updateEquipment(targetId, {
    cat2Shirt:  document.getElementById('eqCat2Shirt').value,
    cat2Pants:  document.getElementById('eqCat2Pants').value,
    safetyShoes: document.getElementById('eqSafetyShoes').value,
    cat4Suit:   document.getElementById('eqCat4Suit').value,
    bravo:      document.getElementById('eqBravo').value,
    major:      document.getElementById('eqMajor').value,
    otherQty:   document.getElementById('eqOther').value
  });
  unlockButton(btn);

  if (res.success) { showToast(res.message,'success'); closeModal('equipmentModal'); await EquipmentPage.load(); }
  else showToast(res.message,'error');
}

// ================================================================
// نموذج طلب الإجازة
// ================================================================
async function openLeaveRequestModal() {
  const session = Auth.getSession();
  const isEmp   = Auth.getRole() === ROLES.EMPLOYEE;

  document.getElementById('lvReqEmpId').textContent   = session.employeeId;
  document.getElementById('lvReqEmpName').textContent = session.fullName;
  document.getElementById('lvReqShift').textContent   = `وردية ${session.shift}`;
  document.getElementById('lvType').value             = '';
  document.getElementById('lvStartDate').value        = '';
  document.getElementById('lvEndDate').value          = '';
  document.getElementById('lvDuration').textContent   = '-';
  document.getElementById('lvNotes').value            = '';
  document.getElementById('lvBalanceInfo').textContent = '';
  document.getElementById('lvMiniCal').innerHTML       = '';
  document.getElementById('lvReqModal').dataset.targetId = session.employeeId;
  openModal('lvReqModal');

  // جلب أرصدة الإجازات
  const leavRes = await API.getLeaves();
  if (leavRes.success && leavRes.data.length > 0) {
    AppState._currentLeaveBalance = leavRes.data[0];
  }
}

function lvCalcDuration() {
  const start = document.getElementById('lvStartDate').value;
  const end   = document.getElementById('lvEndDate').value;
  if (!start || !end) return;

  const dur = daysDiff(start, end);
  document.getElementById('lvDuration').textContent = dur + ' أيام';

  // ── حساب التقويم محلياً (بدون API) ──
  const session  = Auth.getSession();
  const shift    = session.shift;
  const settings = AppState.settings || {};
  const refDate  = new Date(settings['cycle_reference_date'] || '2026-05-27');
  refDate.setHours(0,0,0,0);
  const posKey = { 'أ': 'shift_a_position', 'ب': 'shift_b_position',
                   'د': 'shift_d_position', 'ج': 'shift_j_position' }[shift];
  const refPos = parseInt(settings[posKey] || '1', 10);
  const color  = AppState.shiftColors[shift] || '#1565C0';

  const WD    = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const icons = { 'صباح': '☀️', 'مساء': '🌙', 'راحة': '🏖️' };
  const bgs   = { 'صباح': '#E3F2FD', 'مساء': '#FFF3E0', 'راحة': '#F3E5F5' };
  const fgs   = { 'صباح': '#1565C0', 'مساء': '#E65100', 'راحة': '#6A1B9A' };

  const days = [];
  let cur = new Date(start); cur.setHours(0,0,0,0);
  const endD = new Date(end); endD.setHours(0,0,0,0);
  while (cur <= endD) {
    const diff   = Math.round((cur - refDate) / 86400000);
    const dayPos = ((refPos - 1 + diff) % 8 + 8) % 8 + 1;
    const status = dayPos <= 2 ? 'صباح' : dayPos <= 4 ? 'مساء' : 'راحة';
    let hijri = '';
    try { hijri = cur.toLocaleDateString('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long' }); } catch(e) {}
    days.push({ weekDay: WD[cur.getDay()], dayNum: cur.getDate(), hijri, status });
    cur.setDate(cur.getDate() + 1);
  }

  let calHtml = `
    <div style="font-size:.78rem;font-weight:700;color:var(--text-muted);margin-bottom:8px;">
      📅 حالة وردية ${shift} خلال الإجازة
    </div>
    <div class="lv-cal-wrap">`;

  days.forEach(d => {
    calHtml += `
      <div class="lv-cal-card" style="border-top:3px solid ${fgs[d.status]};">
        <div class="lv-cal-wd">${d.weekDay}</div>
        <div class="lv-cal-num" style="color:${fgs[d.status]}">${d.dayNum}</div>
        ${d.hijri ? `<div class="lv-cal-hijri">${d.hijri}</div>` : ''}
        <div class="lv-cal-status" style="background:${bgs[d.status]};color:${fgs[d.status]};">
          ${icons[d.status]} ${d.status}
        </div>
      </div>`;
  });

  calHtml += `</div>`;
  document.getElementById('lvMiniCal').innerHTML = calHtml;

  // عرض رصيد الإجازة
  const type    = document.getElementById('lvType').value;
  const balance = AppState._currentLeaveBalance;
  if (balance && (type === 'سنوية' || type === 'مجدولة')) {
    const avail = type === 'سنوية' ? balance.systemRemaining : balance.scheduledRemaining;
    const warn  = dur > avail;
    document.getElementById('lvBalanceInfo').innerHTML =
      `<div style="padding:10px;border-radius:var(--radius);
                   background:${warn?'#FFF3E0':'#E8F5E9'};
                   color:${warn?'#E65100':'#2E7D32'};font-weight:600;font-size:.85rem;">
        ${warn ? '⚠️ تحذير: الرصيد غير كافٍ — المتاح:' : '✅ الرصيد المتاح:'} ${avail} يوم
      </div>`;
  }
}

async function submitLeaveRequest() {
  const m         = document.getElementById('lvReqModal');
  const btn       = document.getElementById('lvSubmitBtn');
  const employeeId = m.dataset.targetId || Auth.getEmployeeId();
  const leaveType  = document.getElementById('lvType').value;
  const startDate  = document.getElementById('lvStartDate').value;
  const endDate    = document.getElementById('lvEndDate').value;
  const notes      = document.getElementById('lvNotes').value.trim();

  if (!leaveType)  { showToast('اختر نوع الإجازة', 'error'); return; }
  if (!startDate)  { showToast('حدد تاريخ البداية', 'error'); return; }
  if (!endDate)    { showToast('حدد تاريخ الانتهاء', 'error'); return; }

  lockButton(btn, 8000);
  const res = await API.submitLeaveRequest({ employeeId, leaveType, startDate, endDate, notes });
  unlockButton(btn);

  if (res.success) {
    showToast(res.message, res.balanceWarning ? 'warning' : 'success');
    closeModal('lvReqModal');
    await LeavesPage.load();
  } else {
    showToast(res.message, 'error');
  }
}

// ================================================================
// نموذج طلب العمل الإضافي
// ================================================================
function openOvertimeFormModal() {
  const session = Auth.getSession();
  document.getElementById('otEmpId').textContent   = session.employeeId;
  document.getElementById('otEmpName').textContent = session.fullName;
  document.getElementById('otShift').textContent   = `وردية ${session.shift}`;
  document.getElementById('otDate').value          = '';
  document.getElementById('otDay').textContent     = '';
  document.getElementById('otHours').value         = '';
  document.getElementById('otReason').value        = '';
  openModal('overtimeFormModal');
}

function otDateChanged() {
  const d = document.getElementById('otDate').value;
  if (!d) return;
  const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  document.getElementById('otDay').textContent = days[new Date(d).getDay()];
}

async function submitOvertimeForm() {
  const btn     = document.getElementById('otSubmitBtn');
  const date    = document.getElementById('otDate').value;
  const hours   = normalizeNumbers(document.getElementById('otHours').value.replace(',','.'). replace('،','.'));
  const reason  = document.getElementById('otReason').value.trim();

  if (!date)   { showToast('حدد التاريخ', 'error'); return; }
  if (!hours || isNaN(parseFloat(hours))) { showToast('أدخل عدد الساعات', 'error'); return; }
  if (!reason) { showToast('السبب مطلوب', 'error'); return; }

  lockButton(btn, 8000);
  const res = await API.submitOvertime({
    employeeId: Auth.getEmployeeId(),
    date, hours: parseFloat(hours), reason
  });
  unlockButton(btn);

  if (res.success) {
    showToast(res.message, 'success');
    closeModal('overtimeFormModal');
    await OvertimePage.load();
  } else {
    showToast(res.message, 'error');
  }
}

// ================================================================
// نموذج الملف الشخصي للموظف
// ================================================================
async function openEmployeeProfileModal() {
  await openEditEmployeeModal(Auth.getEmployeeId());
  // الرقم الوظيفي دائماً غير قابل للتعديل للموظف العادي
  const idField = document.getElementById('empModalId');
  if (idField) idField.disabled = true;
  // إخفاء حقول الصلاحية من نموذج الموظف العادي
  const role = Auth.getActiveRole();
  if (role === ROLES.EMPLOYEE) {
    ['empModalRole','empModalRoleCode','empModalStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.closest('.form-group')?.classList.add('hidden');
    });
  }
}

// ================================================================
// نموذج رصيد الإجازة
// ================================================================
async function openLeaveBalanceModal(employeeId) {
  const res = await API.getLeaves();
  if (!res.success) return;
  const leave = res.data.find(l => l.employeeId === employeeId);
  if (!leave) return;

  document.getElementById('lbEmpName').textContent  = leave.fullName;
  document.getElementById('lbSysBalance').value     = leave.systemBalance;
  document.getElementById('lbSchBalance').value     = leave.scheduledBalance;
  document.getElementById('lbModal').dataset.targetId = employeeId;

  const isFirstEntry = (leave.systemBalance === 0);
  document.getElementById('lbFirstEntryNote').classList.toggle('hidden', !isFirstEntry);
  openModal('lbModal');
}

async function submitLeaveBalanceModal() {
  const m          = document.getElementById('lbModal');
  const targetId   = m.dataset.targetId;
  const sysBalance = Number(document.getElementById('lbSysBalance').value);
  const schBalance = Number(document.getElementById('lbSchBalance').value);
  const btn        = document.getElementById('lbSaveBtn');

  lockButton(btn, 5000);
  const res = await API.updateLeaveBalance(targetId, {
    systemBalance: sysBalance,
    scheduledBalance: schBalance,
    isFirstEntry: true
  });
  unlockButton(btn);

  if (res.success) { showToast(res.message, 'success'); closeModal('lbModal'); await LeavesPage.load(); }
  else showToast(res.message, 'error');
}
