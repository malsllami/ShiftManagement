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

  render(container) {
    container = container || document.getElementById('page-calendar');
    // حساب محلي فوري — بدون API
    const calData = this._buildLocalData(this.currentYear, this.currentMonth);
    this._buildUI(calData, container);
  },

  // ── حساب التقويم محلياً من الإعدادات ──
  _buildLocalData(year, month) {
    const settings = AppState.settings || {};
    const refDateStr = settings['cycle_reference_date'] || '2026-05-27';
    const refDate = new Date(refDateStr);
    refDate.setHours(0,0,0,0);

    const posKeys = {
      'أ': 'shift_a_position', 'ب': 'shift_b_position',
      'د': 'shift_d_position', 'ج': 'shift_j_position'
    };
    const refPos = {};
    SHIFTS.forEach(s => { refPos[s] = parseInt(settings[posKeys[s]] || '1', 10); });

    const getStatus = (dateObj, shift) => {
      const diff = Math.round((dateObj - refDate) / 86400000);
      const dayPos = ((refPos[shift] - 1 + diff) % 8 + 8) % 8 + 1;
      return dayPos <= 2 ? 'صباح' : dayPos <= 4 ? 'مساء' : 'راحة';
    };

    const WD = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    const daysInMonth = new Date(year, month, 0).getDate();
    const calendar = [];
    const monthStats = {};
    SHIFTS.forEach(s => { monthStats[s] = { morning: 0, evening: 0, off: 0 }; });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      dateObj.setHours(0,0,0,0);
      const mm = String(month).padStart(2,'0');
      const dd = String(d).padStart(2,'0');
      const dateStr = `${year}-${mm}-${dd}`;
      const shifts = {};
      SHIFTS.forEach(s => {
        const st = getStatus(dateObj, s);
        shifts[s] = st;
        if (st === 'صباح') monthStats[s].morning++;
        else if (st === 'مساء') monthStats[s].evening++;
        else monthStats[s].off++;
      });
      calendar.push({ day: d, date: dateStr, weekDay: WD[dateObj.getDay()], shifts, hijri: '' });
    }
    return { year, month, calendar, monthStats };
  },

  _buildUI(data, container) {
    const todayStr   = new Date().toISOString().split('T')[0];
    const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                        'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const monthAr    = monthNames[data.month - 1];
    const hijriLabel = this._getHijriMonthLabel(data.year, data.month);
    const myShift    = Auth.getShift();
    const firstDow   = new Date(data.year, data.month - 1, 1).getDay(); // 0=أحد
    const ICONS = { 'صباح': '☀️', 'مساء': '🌙', 'راحة': '🏖️' };

    let html = `
      <div class="cal-wrap">

        <!-- ── رأس التقويم ── -->
        <div class="cal-header">
          <button class="cal-nav-btn" onclick="CalendarPage.prevMonth()">›</button>
          <div class="cal-header-center">
            <div class="cal-month-title">📅 ${monthAr} ${data.year}</div>
            ${hijriLabel ? `<div class="cal-hijri-sub">${hijriLabel}</div>` : ''}
          </div>
          <button class="cal-nav-btn" onclick="CalendarPage.nextMonth()">‹</button>
        </div>

        <!-- ── أدوات التحكم ── -->
        <div class="cal-controls">
          <button class="btn btn-ghost btn-sm" onclick="CalendarPage.goToday()">📍 اليوم</button>
          <select class="form-control cal-shift-sel" id="calShiftFilter"
                  onchange="CalendarPage.setShiftFilter(this.value)">
            <option value="">جميع الورديات</option>
            ${SHIFTS.map(s => `<option value="${s}" ${s===myShift?'selected':''}>${'وردية '+s}</option>`).join('')}
          </select>
        </div>

        <!-- ── دليل الألوان ── -->
        <div class="cal-legend">
          ${SHIFTS.map(s => {
            const c = AppState.shiftColors[s] || '#1565C0';
            return `<span class="cal-leg" style="color:${c}">
              <span style="background:${c};"></span>وردية ${s}
            </span>`;
          }).join('')}
          <span class="cal-leg-icons">☀️ صباح &nbsp; 🌙 مساء &nbsp; 🏖️ راحة</span>
        </div>

        <!-- ── رؤوس الأيام ── -->
        <div class="cal-grid-head">
          ${[['الأحد','أح'],['الاثنين','إث'],['الثلاثاء','ثل'],
             ['الأربعاء','أر'],['الخميس','خم'],['الجمعة','جم'],['السبت','سب']]
            .map(([full,short]) => `<div>
              <span class="cal-wd-full">${full}</span>
              <span class="cal-wd-short">${short}</span>
            </div>`).join('')}
        </div>

        <!-- ── شبكة الأيام ── -->
        <div class="cal-grid" id="calGrid">`;

    // خلايا فارغة قبل أول يوم في الشهر
    for (let i = 0; i < firstDow; i++) {
      html += `<div class="cal-cell cal-cell-empty"></div>`;
    }

    // ألوان خلفية الحالات
    const STATUS_BG = {
      'صباح': 'rgba(255,152,0,.18)',
      'مساء': 'rgba(33,33,220,.15)',
      'راحة': 'rgba(106,27,154,.13)'
    };
    const STATUS_BORDER = {
      'صباح': 'rgba(255,152,0,.5)',
      'مساء': 'rgba(63,81,181,.5)',
      'راحة': 'rgba(106,27,154,.4)'
    };

    // خلايا الأيام
    data.calendar.forEach(day => {
      const isToday = day.date === todayStr;
      const hijri   = this._safeHijri(day.date);

      html += `<div class="cal-cell ${isToday ? 'cal-cell-today' : ''}" id="calday-${day.date}">
        <div class="cal-cell-top">
          <span class="cal-day-num ${isToday ? 'cal-day-today' : ''}">${day.day}</span>
          ${hijri ? `<span class="cal-day-hijri">${hijri}</span>` : ''}
        </div>
        <div class="cal-cell-chips">
          ${SHIFTS.map(s => {
            const status = day.shifts[s] || 'راحة';
            const shiftColor = AppState.shiftColors[s] || '#1565C0';
            const isMine = s === myShift;
            const bg     = STATUS_BG[status];
            const bdr    = STATUS_BORDER[status];
            return `<div class="cal-chip ${isMine ? 'cal-chip-mine' : ''}" data-shift="${s}"
                        style="background:${bg};border-color:${bdr};">
              <span class="cal-chip-ltr" style="color:${shiftColor}">${s}</span>
              <span class="cal-chip-ico">${ICONS[status]}</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    });

    html += `</div>`; // end cal-grid

    // إحصائيات الشهر
    html += this._buildCompactStats(data.monthStats);
    html += `</div>`; // end cal-wrap

    container.innerHTML = html;

    // تطبيق فلتر الوردية الأولي
    CalendarPage._applyFilter(myShift);

    // الانتقال لليوم الحالي
    setTimeout(() => {
      const el = document.getElementById('calday-' + todayStr);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  },

  setShiftFilter(shift) {
    this._currentFilter = shift;
    this._applyFilter(shift);
  },
  _applyFilter(shift) {
    document.querySelectorAll('.cal-chip').forEach(chip => {
      chip.style.display = (!shift || chip.dataset.shift === shift) ? '' : 'none';
    });
  },

  _buildCompactStats(stats) {
    return `
      <div class="card mt-16">
        <div style="font-weight:800;margin-bottom:12px;font-size:.95rem;color:var(--text);">
          📊 إحصائيات الشهر
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>الوردية</th>
                <th>☀️ صباح</th>
                <th>🌙 مساء</th>
                <th>🏖️ راحة</th>
                <th>إجمالي دوام</th>
              </tr>
            </thead>
            <tbody>
              ${SHIFTS.map(s => {
                const d = stats[s] || { morning: 0, evening: 0, off: 0 };
                const c = AppState.shiftColors[s] || '#1565C0';
                const total = (d.morning || 0) + (d.evening || 0);
                return `<tr>
                  <td><strong style="color:${c}">وردية ${s}</strong></td>
                  <td>${d.morning || 0}</td>
                  <td>${d.evening || 0}</td>
                  <td>${d.off || 0}</td>
                  <td><strong style="color:${c}">${total} يوم</strong></td>
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

  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 1) { this.currentMonth = 12; this.currentYear--; }
    this.load();
  },
  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 12) { this.currentMonth = 1; this.currentYear++; }
    this.load();
  },
  goToday() {
    const now         = new Date();
    this.currentYear  = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    this.load();
    // تحديد بصري لليوم
    setTimeout(() => {
      const todayStr  = now.toISOString().split('T')[0];
      const todayCard = document.getElementById('calday-' + todayStr);
      if (todayCard) {
        todayCard.classList.add('cal2-today-flash');
        setTimeout(() => todayCard.classList.remove('cal2-today-flash'), 1200);
        todayCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  }
};
