class StudentGradesViewer {
  constructor() {
    this.currentYear = 2026; // Текущий рабочий год проекта
    this.studentId = null;
    this.classId = null;

    this.monthSelect = document.querySelector('.js-student-select-month');
    this.tbody = document.getElementById('js-student-grades-tbody');
    this.daysHeader = document.getElementById('js-student-days-header');
    this.daysRow = document.getElementById('js-student-days-row');
  }

  async init() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      window.location.href = '../auth/registration.html';
      return;
    }

    const { data: profile } = await db.from('profiles').select('role, class_id').eq('id', user.id).single();
    if (!profile) return;

    if (profile.role === 'parent') {
      this.studentId = localStorage.getItem('activeChildId');
      if (!this.studentId) {
        window.location.href = 'select-child.html';
        return;
      }
      const { data: child } = await db.from('profiles').select('class_id').eq('id', this.studentId).single();
      this.classId = child ? child.class_id : null;
    } else {
      this.studentId = user.id;
      this.classId = profile.class_id;
    }

    if (!this.classId) {
      this.tbody.innerHTML = `<tr><td colspan="35" style="text-align:center; color:white; padding:20px;">Класс не привязан к аккаунту.</td></tr>`;
      return;
    }

    const systemMonth = new Date().getMonth();
    if (this.monthSelect) this.monthSelect.value = systemMonth + 1;

    this.setupEvents();
    this.renderCalendarGrid();
  }

  setupEvents() {
    if (this.monthSelect) {
      this.monthSelect.addEventListener('change', () => this.renderCalendarGrid());
    }
  }

  getDaysInMonth(month) {
    return new Date(this.currentYear, month, 0).getDate();
  }

  renderCalendarGrid() {
    const selectedMonth = parseInt(this.monthSelect.value, 10);
    const totalDays = this.getDaysInMonth(selectedMonth);

    if (this.daysHeader) this.daysHeader.setAttribute('colspan', totalDays);

    if (this.daysRow) {
      this.daysRow.innerHTML = '';
      for (let i = 1; i <= totalDays; i++) {
        const th = document.createElement('th');
        th.textContent = i;
        this.daysRow.appendChild(th);
      }
    }
    
    this.loadStudentGradesData();
  }

  async loadStudentGradesData() {
    const selectedMonth = parseInt(this.monthSelect.value, 10);
    this.tbody.innerHTML = `<tr><td colspan="35" style="text-align:center;">Загрузка оценок...</td></tr>`;

    const { data: scheduleData } = await db
      .from('schedule')
      .select('subject_name')
      .eq('class_id', this.classId)
      .not('subject_name', 'eq', '');

    const uniqueSubjects = [...new Set((scheduleData || []).map(item => item.subject_name))].sort();

    if (uniqueSubjects.length === 0) {
      this.tbody.innerHTML = `<tr><td colspan="35" style="text-align:center;">В расписании класса пока нет предметов</td></tr>`;
      return;
    }

    const totalDays = this.getDaysInMonth(selectedMonth);
    const formattedMonth = String(selectedMonth).padStart(2, '0');
    const startDate = `${this.currentYear}-${formattedMonth}-01`;
    const endDate = `${this.currentYear}-${formattedMonth}-${String(totalDays).padStart(2, '0')}`;

    const { data: gradesData, error: gradesErr } = await db
      .from('grades')
      .select('subject_name, grade_value, grade_date')
      .eq('student_id', this.studentId)
      .gte('grade_date', startDate)
      .lte('grade_date', endDate);

    if (gradesErr) {
      console.error(gradesErr);
      return;
    }

    this.renderGradesRows(uniqueSubjects, gradesData || [], totalDays, selectedMonth);
  }

  renderGradesRows(subjects, grades, totalDays, selectedMonth) {
    this.tbody.innerHTML = '';

    subjects.forEach((subjectName) => {
      const tr = document.createElement('tr');

      const subjectTd = document.createElement('td');
      subjectTd.className = 'sticky-col-name';
      subjectTd.style.textAlign = 'left';
      subjectTd.style.paddingLeft = '10px';
      subjectTd.textContent = subjectName;
      tr.appendChild(subjectTd);

      const subjectGrades = grades.filter(g => g.subject_name.toLowerCase() === subjectName.toLowerCase());

      let sum = 0;
      let count = 0;

      for (let day = 1; day <= totalDays; day++) {
        const td = document.createElement('td');
        
        const cellDateStr = `${this.currentYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const foundGrade = subjectGrades.find(g => g.grade_date === cellDateStr);

        if (foundGrade) {
          const val = foundGrade.grade_value;
          td.textContent = val;

          if (val === '5') { td.className = 'grade-cell-select_excellent'; sum += 5; count++; }
          else if (val === '4') { td.className = 'grade-cell-select_good'; sum += 4; count++; }
          else if (val === '3') { td.className = 'grade-cell-select_normal'; sum += 3; count++; }
          else if (val === '2') { td.className = 'grade-cell-select_horrible'; sum += 2; count++; }
          else if (['Н'].includes(val)) { td.className = 'grade-cell-select_absence-horrible'; }
          else if (['Б'].includes(val)) { td.className = 'grade-cell-select_absence-excellent'; }
          else if (['У'].includes(val)) { td.className = 'grade-cell-select_absence-good'; }
        } else {
          td.textContent = '';
        }
        
        tr.appendChild(td);
      }

      const avgTd = document.createElement('td');
      avgTd.className = 'sticky-col-result';
      avgTd.style.fontWeight = 'bold';
      
      if (count > 0) {
        const avg = sum / count;
        avgTd.textContent = avg.toFixed(2);

        if (avg <= 2.50) {
          avgTd.style.color = 'var(--horrible-color-dark)'
        } else if (avg <= 3.50) {
          avgTd.style.color = 'var(--normal-color-dark)'
        } else if (avg <= 4.50) {
          avgTd.style.color = 'var(--good-color-dark)'
        } else if (avg > 4.50) {
          avgTd.style.color = 'var(--excellent-color-dark)'
        }
        
      } else {
        avgTd.textContent = '—';
      }
      tr.appendChild(avgTd);

      this.tbody.appendChild(tr);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const viewer = new StudentGradesViewer();
  viewer.init();
});
