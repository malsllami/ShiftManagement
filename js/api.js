// ================================================================
// api.js - التواصل مع Google Apps Script
// ================================================================

class API {
  static async call(action, data = {}, useSession = true) {
    const params = new URLSearchParams();
    params.set('action', action);

    if (useSession) {
      const session = Auth.getSession();
      if (session) {
        params.set('id',    session.employeeId);
        params.set('token', session.token);
      }
    }

    if (Object.keys(data).length > 0) {
      params.set('data', encodeURIComponent(JSON.stringify(data)));
    }

    const url = `${API_URL}?${params.toString()}`;

    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json;
    } catch (err) {
      console.error(`[API] ${action}:`, err);
      return { success: false, message: 'تعذّر الاتصال بالخادم: ' + err.message };
    }
  }

  // ============ المصادقة ============
  static login(employeeId, password) {
    return this.call('login', { employeeId, password }, false);
  }
  static logout() {
    return this.call('logout');
  }
  static changePassword(oldPassword, newPassword) {
    return this.call('changePassword', { oldPassword, newPassword });
  }
  static verifyElevatedCode(code) {
    return this.call('verifyElevatedCode', { code });
  }
  static resetEmployeePassword(targetId) {
    return this.call('resetEmployeePassword', { targetId });
  }

  // ============ الإعدادات ============
  static getSettings() {
    return this.call('getSettings');
  }
  static updateSettings(updates) {
    return this.call('updateSettings', updates);
  }
  static getLeaveTypes() {
    return this.call('getLeaveTypes');
  }
  static addLeaveType(type) {
    return this.call('addLeaveType', { type });
  }

  // ============ الموظفون ============
  static getEmployees(filters = {}) {
    return this.call('getEmployees', filters);
  }
  static getEmployee(targetId) {
    return this.call('getEmployee', { targetId });
  }
  static addEmployee(empData) {
    return this.call('addEmployee', empData);
  }
  static updateEmployee(targetId, updateData) {
    return this.call('updateEmployee', { targetId, ...updateData });
  }
  static changeEmployeeRole(targetId, newRole, roleCode = '') {
    return this.call('changeEmployeeRole', { targetId, newRole, roleCode });
  }
  static deleteEmployee(targetId) {
    return this.call('deleteEmployee', { targetId });
  }
  static getShiftStats() {
    return this.call('getShiftStats');
  }
  static repairLinkedRows() {
    return this.call('repairLinkedRows');
  }

  // ============ المناطق ============
  static getRegions(filters = {}) {
    return this.call('getRegions', filters);
  }
  static updateRegion(targetId, data) {
    return this.call('updateRegion', { targetId, ...data });
  }

  // ============ العدد والمقاسات ============
  static getEquipment(filters = {}) {
    return this.call('getEquipment', filters);
  }
  static updateEquipment(targetId, data) {
    return this.call('updateEquipment', { targetId, ...data });
  }

  // ============ الإجازات ============
  static getLeaves(filters = {}) {
    return this.call('getLeaves', filters);
  }
  static updateLeaveBalance(targetId, data) {
    return this.call('updateLeaveBalance', { targetId, ...data });
  }
  static getLeaveRequests(filters = {}) {
    return this.call('getLeaveRequests', filters);
  }
  static submitLeaveRequest(data) {
    return this.call('submitLeaveRequest', data);
  }
  static reviewLeaveRequest(requestId, action, reason = '') {
    return this.call('reviewLeaveRequest', { requestId, action, reason });
  }

  // ============ العمل الإضافي ============
  static getOvertime(filters = {}) {
    return this.call('getOvertime', filters);
  }
  static submitOvertime(data) {
    return this.call('submitOvertime', data);
  }
  static reviewOvertime(requestId, action, reason = '') {
    return this.call('reviewOvertime', { requestId, action, reason });
  }
  static processOvertimeCoordinator(requestId, action, returnReason = '') {
    return this.call('processOvertimeCoordinator', { requestId, action, returnReason });
  }
  static acknowledgeOvertimeReceipt(requestId, isReceived) {
    return this.call('acknowledgeOvertimeReceipt', { requestId, isReceived });
  }

  // ============ النقل ============
  static transferEmployee(targetId, newShift, notes = '') {
    return this.call('transferEmployee', { targetId, newShift, notes });
  }
  static getTransfers(filters = {}) {
    return this.call('getTransfers', filters);
  }

  // ============ التقويم ============
  static getMonthCalendar(year, month) {
    return this.call('getMonthCalendar', { year, month });
  }
  static getTodayStatus() {
    return this.call('getTodayStatus');
  }
  static getShiftCalendarRange(shift, startDate, endDate) {
    return this.call('getShiftCalendarRange', { shift, startDate, endDate });
  }

  // ============ الإشعارات ============
  static getNotifications(filters = {}) {
    return this.call('getNotifications', filters);
  }
  static markNotificationRead(notifId) {
    return this.call('markNotificationRead', { notifId });
  }
  static markAllNotificationsRead() {
    return this.call('markAllNotificationsRead');
  }
  static getUnreadCount() {
    return this.call('getUnreadCount');
  }

  // ============ السجل ============
  static getLogs(filters = {}) {
    return this.call('getLogs', filters);
  }

  // ============ العرض الشامل ============
  static getOverview(filters = {}) {
    return this.call('getOverview', filters);
  }
  static refreshOverview() {
    return this.call('refreshOverview');
  }

  // ============ الاستهلاك ============
  static getApiUsage() {
    return this.call('getApiUsage');
  }
}
