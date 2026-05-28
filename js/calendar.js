// ================================================================
// calendar.js - تقويم الورديات - تصميم بطاقات يومية
// ================================================================

const CalendarPage = {
  currentYear:  new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,

  async load() {
    const container = document.getElementById('page-calendar');
    container.innerHTML = `<div class="spinner"></div>`;
    await this.render(container);
  },

  async render(container) {
    container = container || document.getElementById('page-calendar');

    let calData;
    try {
      const res = await API.getMonthCalendar(this.currentYear, this.currentMonth);
      if (!res.success) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-text">${res.message || 'تعذّر تحميل التقويم'}</div>
            <button class="btn btn-primary mt-16" onclick="CalendarPage.load()">إعادة المحاولة</button>
          </div>`;
        return;
      }
      calData = res;
    } catch(err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div class="empty-state-text">خطأ في الاتصال: ${err.message}</div>
          <button class="btn btn-primary mt-16" onclick="CalendarPage.load()">إعادة المحاولة</button>
        </div>`;
      return;
    }

    try {
      this._buildUI(calData, container);
    } catch(err) {
      console.error('Calendar render error:', err);
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-text">خطأ في عرض التقويم</div>
          <button class="btn btn-primary mt-16" onclick="CalendarPage.load()">إعادة المحاولة</button>
        </div>`;
    }
  },

  _buildUI(data, container) {
    const todayStr   = new Date().toISOString().split('T')[0];
    const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                        'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const monthAr    = monthNames[data.month - 1];

    // رأس التقويم
    let html = `
      <div class="cal2-header">
        <div>
          <div class="cal2-month-title">${monthAr} ${data.year}</div>
          <div class="cal2-month-sub">${this._getHijriMonthLabel(data.year, data.month)}</div>
        </div>
        <div class="cal2-nav">
          <button class="cal2-btn-nav" onclick="CalendarPage.prevMonth()">&#8250; السابق</button>
          <button class="cal2-btn-today" onclick="CalendarPage.goToday()">اليوم</button>
          <button class="cal2-btn-nav" onclick="CalendarPage.nextMonth()">التالي &#8249;</button>
        </div>
      </div>

      <!-- أعمدة الورديات -->
      <div class="cal2-shift-legend">
        <div class="cal2-legend-spacer"></div>
        ${SHIFTS.map(s => {
          const color = AppState.shiftColors[s] || '#1565C0';
          return `<div class="cal2-legend-item" style="color:${color}">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-left:5px;"></span>
            وردية ${s}
          </div>`;
        }).join('')}
      </div>

      <div class="cal2-grid" id="cal2Grid">`;

    // بطاقات الأيام
    data.calendar.forEach(day => {
      const isToday  = (day.date === todayStr);
      const hijri    = this._safeHijri(day.date);

      html += `
        <div class="cal2-day-card ${isToday ? 'cal2-today' : ''}" id="calday-${day.date}">
          <!-- معلومات اليوم -->
          <div class="cal2-day-info">
            <div class="cal2-day-num ${isToday ? 'cal2-day-today-num' : ''}">${day.day}</div>
            <div class="cal2-day-texts">
              <div class="cal2-day-wd">${day.weekDay}</div>
              <div class="cal2-day-hijri">${hijri}</div>
            </div>
            ${isToday ? '<div class="cal2-today-dot"></div>' : ''}
          </div>

          <!-- الورديات -->
          <div class="cal2-shifts-row">
            ${SHIFTS.map(s => {
              const status = day.shifts[s] || 'راحة';
              const color  = AppState.shiftColors[s] || '#1565C0';
              const icons  = { 'صباح': '🌅', 'مساء': '🌙', 'راحة': '🏠' };
              const bgs    = { 'صباح': '#E3F2FD', 'مساء': '#FFF3E0', 'راحة': '#F3E5F5' };
              const fgs    = { 'صباح': '#1565C0', 'مساء': '#E65100', 'راحة': '#6A1B9A' };
              return `
                <div class="cal2-shift-chip" style="border-right:3px solid ${color}">
                  <div class="cal2-chip-shift" style="color:${color}">وردية ${s}</div>
                  <div class="cal2-chip-status" style="background:${bgs[status]};color:${fgs[status]}">
                    ${icons[status]} ${status}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    });

    html += `</div>`;

    // إحصائيات الشهر
    html += this._buildMonthStats(data.monthStats);

    container.innerHTML = html;

    // الانتقال التلقائي لليوم الحالي
    setTimeout(() => {
      const todayCard = document.getElementById('calday-' + todayStr);
      if (todayCard) {
        todayCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  },

  _buildMonthStats(stats) {
    return `
      <div class="card mt-24">
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
            <tbody>
              ${SHIFTS.map(s => {
                const d     = stats[s] || {};
                const color = AppState.shiftColors[s] || '#1565C0';
                return `<tr>
                  <td><strong style="color:${color}">وردية ${s}</strong></td>
                  <td>${d['صباح'] || 0} يوم</td>
                  <td>${d['مساء'] || 0} يوم</td>
                  <td><strong>${d['دوام'] || 0} يوم</strong></td>
                  <td>${d['راحة'] || 0} يوم</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _safeHijri(dateStr) {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric', month: 'long'
      }).format(d);
    } catch {
      try {
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('ar', {
          calendar: 'islamic',
          day: 'numeric', month: 'short'
        }).format(d);
      } catch { return ''; }
    }
  },

  _getHijriMonthLabel(year, month) {
    try {
      const d = new Date(year, month - 1, 15);
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        month: 'long', year: 'numeric'
      }).format(d);
    } catch { return ''; }
  },

  async prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 1) { this.currentMonth = 12; this.currentYear--; }
    await this.load();
  },
  async nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 12) { this.currentMonth = 1; this.currentYear++; }
    await this.load();
  },
  async goToday() {
    const now         = new Date();
    this.currentYear  = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    await this.load();
    // تحديد بصري لليوم
    const todayStr  = now.toISOString().split('T')[0];
    const todayCard = document.getElementById('calday-' + todayStr);
    if (todayCard) {
      todayCard.classList.add('cal2-today-flash');
      setTimeout(() => todayCard.classList.remove('cal2-today-flash'), 1200);
    }
  }
};
