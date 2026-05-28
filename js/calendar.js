// ================================================================
// calendar.js - تقويم الورديات
// ================================================================

const CalendarPage = {
  currentYear:  new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  calData:      null,

  async load() {
    document.getElementById('page-calendar').innerHTML = `<div class="spinner"></div>`;
    await this.render();
  },

  async render() {
    const res = await API.getMonthCalendar(this.currentYear, this.currentMonth);
    if (!res.success) {
      document.getElementById('page-calendar').innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><div>${res.message}</div></div>`;
      return;
    }
    this.calData = res;
    this._buildUI(res);
  },

  _buildUI(data) {
    const todayStr = new Date().toISOString().split('T')[0];
    const settings = AppState.settings;

    // رأس التقويم
    const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const monthAr    = monthNames[data.month - 1];
    const titleHijri = formatHijriDate(`${data.year}-${String(data.month).padStart(2,'0')}-01`);

    let html = `
      <div class="section-title">📅 تقويم الورديات</div>
      <div class="calendar-wrapper mb-24">
        <div class="calendar-header">
          <div>
            <div class="calendar-month-title">${monthAr} ${data.year}</div>
            <div style="font-size:.8rem;opacity:.8;">${titleHijri.split(' ').slice(-2).join(' ')}</div>
          </div>
          <div class="calendar-nav">
            <button class="cal-nav-btn" onclick="CalendarPage.prevMonth()">&#8250; السابق</button>
            <button class="cal-today-btn" onclick="CalendarPage.goToday()">اليوم</button>
            <button class="cal-nav-btn" onclick="CalendarPage.nextMonth()">التالي &#8249;</button>
          </div>
        </div>

        <!-- رأس الأعمدة -->
        <div class="calendar-grid-header">
          <div class="cal-col-header">التاريخ</div>`;

    SHIFTS.forEach(s => {
      const color = AppState.shiftColors[s] || '#1565C0';
      html += `<div class="cal-col-header"><span style="color:${color};font-weight:900;">وردية ${s}</span></div>`;
    });
    html += `</div>`;

    // صفوف الأيام
    html += `<div class="calendar-body">`;
    data.calendar.forEach(day => {
      const isToday = (day.date === todayStr);
      const hijri   = formatHijriDate(day.date);
      const hijriDay = hijri.split(' ')[0] || '';

      html += `<div class="cal-day-row ${isToday ? 'today' : ''}">
        <div class="cal-date-cell">
          <div class="cal-date-num" style="${isToday ? 'color:var(--primary);font-size:1.15rem;' : ''}">${day.day}</div>
          <div class="cal-date-weekday">${day.weekDay}</div>
          <div class="cal-date-hijri">${hijriDay}</div>
          ${isToday ? '<div class="today-dot"></div>' : ''}
        </div>`;

      SHIFTS.forEach(s => {
        const status = day.shifts[s] || 'راحة';
        const icons  = { 'صباح': '🌅', 'مساء': '🌙', 'راحة': '🏠' };
        html += `<div class="cal-shift-cell cal-shift-${status}">${icons[status] || ''} ${status}</div>`;
      });

      html += `</div>`;
    });

    html += `</div></div>`;

    // إحصائيات الشهر
    html += this._buildMonthStats(data.monthStats);

    document.getElementById('page-calendar').innerHTML = html;
  },

  _buildMonthStats(stats) {
    let html = `
      <div class="card">
        <div class="card-title mb-16"><span class="card-title-icon">📊</span>إحصائيات الشهر</div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>الوردية</th>
                <th>🌅 صباح</th>
                <th>🌙 مساء</th>
                <th>⚡ إجمالي دوام</th>
                <th>🏠 راحة</th>
              </tr>
            </thead>
            <tbody>`;

    SHIFTS.forEach(s => {
      const d     = stats[s] || {};
      const color = AppState.shiftColors[s] || '#1565C0';
      html += `<tr>
        <td><strong style="color:${color}">وردية ${s}</strong></td>
        <td>${d['صباح'] || 0} يوم</td>
        <td>${d['مساء'] || 0} يوم</td>
        <td><strong>${d['دوام'] || 0} يوم</strong></td>
        <td>${d['راحة'] || 0} يوم</td>
      </tr>`;
    });

    html += `</tbody></table></div></div>`;
    return html;
  },

  async prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 1) { this.currentMonth = 12; this.currentYear--; }
    document.getElementById('page-calendar').innerHTML = `<div class="spinner"></div>`;
    await this.render();
  },

  async nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 12) { this.currentMonth = 1; this.currentYear++; }
    document.getElementById('page-calendar').innerHTML = `<div class="spinner"></div>`;
    await this.render();
  },

  async goToday() {
    const now       = new Date();
    this.currentYear  = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    document.getElementById('page-calendar').innerHTML = `<div class="spinner"></div>`;
    await this.render();
  }
};
