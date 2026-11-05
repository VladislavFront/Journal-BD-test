class SchoolJournal {
  constructor() {
    this.currentYear = 2026; // Текущий рабочий год проекта
    this.teacherId = null;
    this.teacherSubject = null;
    this.students = [];
    this.loadedGrades = [];
    
    this.monthSelect = document.querySelector('.js-select-month');
    this.classSelect = document.querySelector('.js-select-class');
    this.tbody = document.getElementById('js-journal-tbody');
    this.daysHeader = document.getElementById('js-month-days-header');
    this.daysRow = document.getElementById('js-days-numbers-row');
    this.saveBtn = document.querySelector('.js-btn-save');
  }

  // Инициализация журнала при входе
  async init() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      window.location.href = '../auth/registration.html';
      return;
    }
    this.teacherId = user.id;

    const { data: profile } = await db.from('profiles').select('subject').eq('id', user.id).single();
    this.teacherSubject = profile ? profile.subject : 'Математика';

    const systemMonth = new Date().getMonth();
    if (this.monthSelect) this.monthSelect.value = systemMonth + 1;

    this.setupEvents();

    const savedClassId = localStorage.getItem(`last_class_teacher_${this.teacherId}`);
    if (savedClassId && this.classSelect) {
      this.classSelect.value = savedClassId; 
    }

    this.renderCalendarGrid();
  }

  setupEvents() {
    if (this.monthSelect) this.monthSelect.addEventListener('change', () => this.onFilterChanged());
    
    if (this.classSelect) {
      this.classSelect.addEventListener('change', () => {
        if (this.classSelect.value) {
          localStorage.setItem(`last_class_teacher_${this.teacherId}`, this.classSelect.value);
        } else {
          localStorage.removeItem(`last_class_teacher_${this.teacherId}`);
        }
        this.onFilterChanged();
      });
    }
    
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.saveJournalGrades();
      });
    }
  }


  getDaysInMonth(month) {
    return new Date(this.currentYear, month, 0).getDate();
  }

  onFilterChanged() {
    this.renderCalendarGrid();
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

    if (this.classSelect && this.classSelect.value) {
      this.loadJournalData();
    }
  }

  async loadJournalData() {
    const classId = this.classSelect.value;
    const selectedMonth = parseInt(this.monthSelect.value, 10);
    if (!classId) return;

    this.tbody.innerHTML = `<tr><td colspan="35" style="text-align:center;">Загрузка данных журнала...</td></tr>`;

    const { data: students, error: studentErr } = await db
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student')
      .eq('class_id', parseInt(classId, 10))
      .order('full_name');

    if (studentErr) {
      console.error('Ошибка загрузки учеников:', studentErr.message);
      return;
    }
    this.students = students || [];

    const totalDays = this.getDaysInMonth(selectedMonth);
    const formattedMonth = String(selectedMonth).padStart(2, '0');
    const startDate = `${this.currentYear}-${formattedMonth}-01`;
    const endDate = `${this.currentYear}-${formattedMonth}-${String(totalDays).padStart(2, '0')}`;

    const { data: grades, error: gradesErr } = await db
      .from('grades')
      .select('student_id, grade_value, grade_date')
      .eq('subject_name', this.teacherSubject)
      .gte('grade_date', startDate)
      .lte('grade_date', endDate);

    if (gradesErr) {
      console.error('Ошибка загрузки оценок:', gradesErr.message);
    }

    this.loadedGrades = grades || [];
    this.renderStudentsRows();
  }

  renderStudentsRows() {
    this.tbody.innerHTML = '';
    const selectedMonth = parseInt(this.monthSelect.value, 10);
    const totalDays = this.getDaysInMonth(selectedMonth);

    if (this.students.length === 0) {
      this.tbody.innerHTML = `<tr><td colspan="35" style="text-align:center;">В выбранном классе нет учеников</td></tr>`;
      return;
    }

    this.students.forEach((student, index) => {
      const tr = document.createElement('tr');

      const numTd = document.createElement('td');
      numTd.className = 'sticky-col-num';
      numTd.textContent = index + 1;
      tr.appendChild(numTd);

      const nameTd = document.createElement('td');
      nameTd.className = 'sticky-col-name';
      nameTd.style.textAlign = 'left';
      nameTd.style.paddingLeft = '10px';
      nameTd.textContent = student.full_name;
      tr.appendChild(nameTd);

      for (let day = 1; day <= totalDays; day++) {
        const td = document.createElement('td');
        
        const cellDateStr = `${this.currentYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const existingGrade = this.loadedGrades.find(g => g.student_id === student.id && g.grade_date === cellDateStr);

        const select = document.createElement('select');
        select.className = 'journal-grade-select day-cell-select';
        select.dataset.studentId = student.id;
        select.dataset.date = cellDateStr;
        
        const options = ['', '5', '4', '3', '2', 'Н', 'У', 'Б'];
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt || ' ';
          if (existingGrade && existingGrade.grade_value === opt) {
            option.selected = true;
          }
          select.appendChild(option);
        });

        select.addEventListener('change', () => this.calculateStudentAverage(tr));

        td.appendChild(select);
        tr.appendChild(td);
      }

      const avgTd = document.createElement('td');
      avgTd.className = 'student-average-cell sticky-col-result';
      avgTd.style.fontWeight = 'bold';
      tr.appendChild(avgTd);

      this.tbody.appendChild(tr);
      this.calculateStudentAverage(tr); 
    });
  }

  calculateStudentAverage(rowElement) {
    const selects = rowElement.querySelectorAll('.journal-grade-select');
    const averageCell = rowElement.querySelector('.student-average-cell');
    
    let sum = 0;
    let count = 0;

    selects.forEach(select => {
      const val = select.value;
      if (val === '5' || val === '4' || val === '3' || val === '2') {
        sum += parseInt(val, 10);
        count++;
      }
    });

    if (count > 0) {
      const avg = sum / count;
      averageCell.textContent = avg.toFixed(2);
    } else {
      averageCell.textContent = '—';
    }
  }

  async saveJournalGrades() {
    this.saveBtn.disabled = true;
    this.saveBtn.textContent = 'Сохранение...';

    const selects = this.tbody.querySelectorAll('.journal-grade-select');
    const recordsToUpsert = [];

    selects.forEach(select => {
      const val = select.value;
      const studentId = select.dataset.studentId;
      const gradeDate = select.dataset.date;

      if (val !== '') {
        recordsToUpsert.push({
          student_id: studentId,
          teacher_id: this.teacherId,
          subject_name: this.teacherSubject,
          grade_value: val,
          grade_date: gradeDate
        });
      }
    });

    if (recordsToUpsert.length > 0) {
      const { error } = await db
        .from('grades')
        .upsert(recordsToUpsert, { onConflict: 'student_id,grade_date,subject_name' });

      if (error) {
        alert('Ошибка при сохранении журнала: ' + error.message);
        console.error(error);
      } else {
        alert('Все оценки журнала успешно сохранены на сервере!');
        await this.loadJournalData();
      }
    } else {
      alert('Нет данных для сохранения (все поля пустые).');
    }

    this.saveBtn.disabled = false;
    this.saveBtn.textContent = 'Сохранить';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const journal = new SchoolJournal();
  journal.init();
});
