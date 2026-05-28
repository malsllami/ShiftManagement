// ================================================================
// auth.js - إدارة الجلسة المحلية
// ================================================================

class Auth {
  static SESSION_KEY = 'se_session';
  static ELEVATED_KEY = 'se_elevated';

  // حفظ بيانات الجلسة
  static saveSession(data) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(data));
  }

  // جلب بيانات الجلسة
  static getSession() {
    try {
      const raw = localStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // حذف الجلسة
  static clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.ELEVATED_KEY);
    sessionStorage.clear();
  }

  // هل المستخدم مسجل دخول؟
  static isLoggedIn() {
    return !!this.getSession();
  }

  // الحصول على الصلاحية الحالية
  static getRole() {
    const s = this.getSession();
    return s ? s.role : null;
  }

  // حفظ الصلاحية المرتفعة (جلسة فقط)
  static saveElevatedRole(role) {
    sessionStorage.setItem(this.ELEVATED_KEY, role);
  }

  // جلب الصلاحية المرتفعة
  static getElevatedRole() {
    return sessionStorage.getItem(this.ELEVATED_KEY);
  }

  // مسح الصلاحية المرتفعة (عودة لوضع موظف)
  static clearElevatedRole() {
    sessionStorage.removeItem(this.ELEVATED_KEY);
  }

  // الصلاحية الفعلية النشطة
  static getActiveRole() {
    return this.getElevatedRole() || this.getRole();
  }

  // هل لديه صلاحية مرتفعة؟
  static hasElevatedAccess() {
    return !!this.getElevatedRole();
  }

  // التحقق من الصلاحيات
  static isManager()     { return this.getRole() === ROLES.MANAGER; }
  static isSupervisor()  { return this.getRole() === ROLES.SUPERVISOR || this.getRole() === ROLES.MANAGER; }
  static isCoordinator() { return this.getRole() === ROLES.COORDINATOR || this.getRole() === ROLES.MANAGER; }

  // الحصول على اسم الموظف
  static getFullName() {
    const s = this.getSession();
    return s ? s.fullName : '';
  }

  // الحصول على الرقم الوظيفي
  static getEmployeeId() {
    const s = this.getSession();
    return s ? s.employeeId : '';
  }

  // الحصول على الوردية
  static getShift() {
    const s = this.getSession();
    return s ? s.shift : '';
  }
}
