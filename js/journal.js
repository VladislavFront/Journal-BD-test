// === КЛАСС-КОНТРОЛЛЕР ЖУРНАЛА ===
class SchoolJournal {
  constructor() {
    this.currentYear = 2026; // Текущий рабочий год проекта
    this.teacherId = null;
    this.teacherSubject = null;
    this.students = [];
    this.loadedGrades = [];

    // Элементы интерфейса
    this.monthSelect = document.querySelector('.js-select-month');
    this.classSelect = document.querySelector('.js-select-class');
    this.tbody = document.getElementById('js-journal-tbody');
    this.daysHeader = document.getElementById('js-month-days-header');
    this.daysRow = document.getElementById('js-days-numbers-row');
    this.saveBtn = document.querySelector('.js-btn-save');
  }

  // Инициализация журнала при входе
  async init() {
    // Получаем текущую сессию учителя из Supabase
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
      window.location.href = '../auth/registration.html';
      return;
    }
    this.teacherId = user.id;

    // Подтягиваем предмет текущего учителя из его профиля
    const { data: profile } = await db.from('profiles').select('subject').eq('id', user.id).single();
    this.teacherSubject = profile ? profile.subject : 'Математика';

    // Автоматически выставляем в селекте текущий системный месяц
    const systemMonth = new Date().getMonth();
    if (this.monthSelect) this.monthSelect.value = systemMonth + 1;

    this.setupEvents();

    // === НОВЫЙ КУСОЧЕК: Проверяем, есть ли сохраненный класс для ЭТОГО учителя ===
    const savedClassId = localStorage.getItem(`last_class_teacher_${this.teacherId}`);
    if (savedClassId && this.classSelect) {
      this.classSelect.value = savedClassId; // Автоматически подставляем класс в селект
    }

    this.renderCalendarGrid();
  }


  // Навешиваем слушатели событий
  setupEvents() {
    if (this.monthSelect) this.monthSelect.addEventListener('change', () => this.onFilterChanged());
    
    if (this.classSelect) {
      this.classSelect.addEventListener('change', () => {
        // === НОВЫЙ КУСОЧЕК: Запоминаем ID выбранного класса в браузере ===
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


  // Расчет количества дней в конкретном месяце
  getDaysInMonth(month) {
    return new Date(this.currentYear, month, 0).getDate();
  }

  // Срабатывает при смене месяца в селекте
  onFilterChanged() {
    this.renderCalendarGrid();
  }

  // Перерисовка сетки чисел месяца (1, 2, 3...31) в шапке
  renderCalendarGrid() {
    const selectedMonth = parseInt(this.monthSelect.value, 10);
    const totalDays = this.getDaysInMonth(selectedMonth);

    // Корректируем colspan главного заголовка чисел месяца
    if (this.daysHeader) this.daysHeader.setAttribute('colspan', totalDays);

    // Очищаем и заново генерируем числа дней в подзаголовке
    if (this.daysRow) {
      this.daysRow.innerHTML = '';
      for (let i = 1; i <= totalDays; i++) {
        const th = document.createElement('th');
        th.textContent = i;
        this.daysRow.appendChild(th);
      }
    }
    
    // Если класс уже выбран в селекте — обновляем данные
    if (this.classSelect && this.classSelect.value) {
      this.loadJournalData();
    }
  }

  // Загрузка данных учеников и оценок из Supabase
  async loadJournalData() {
    const classId = this.classSelect.value;
    const selectedMonth = parseInt(this.monthSelect.value, 10);
    if (!classId) return;

    this.tbody.innerHTML = `<tr><td colspan="35" style="text-align:center;">Загрузка данных журнала...</td></tr>`;

    // 1. Загружаем учеников выбранного класса
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

    // Формируем точный ISO диапазон дат для выбранного месяца
    const totalDays = this.getDaysInMonth(selectedMonth);
    const formattedMonth = String(selectedMonth).padStart(2, '0');
    const startDate = `${this.currentYear}-${formattedMonth}-01`;
    const endDate = `${this.currentYear}-${formattedMonth}-${String(totalDays).padStart(2, '0')}`;

    // 2. Загружаем сохраненные оценки по предмету учителя за этот период
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

  // Генерация строк таблицы с вашими оригинальными классами стилизации
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

      // Порядковый номер (сохраняем ваш sticky-класс)
      const numTd = document.createElement('td');
      numTd.className = 'sticky-col-num';
      numTd.textContent = index + 1;
      tr.appendChild(numTd);

      // ФИО ученика (сохраняем ваш sticky-класс)
      const nameTd = document.createElement('td');
      nameTd.className = 'sticky-col-name';
      nameTd.style.textAlign = 'left';
      nameTd.style.paddingLeft = '10px';
      nameTd.textContent = student.full_name;
      tr.appendChild(nameTd);

      // Цикл генерации селектов оценок для каждого дня месяца
      for (let day = 1; day <= totalDays; day++) {
        const td = document.createElement('td');
        
        const cellDateStr = `${this.currentYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const existingGrade = this.loadedGrades.find(g => g.student_id === student.id && g.grade_date === cellDateStr);

        const select = document.createElement('select');
        // Интегрируем ваш класс для селекта дня
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

        // Слушатель изменения оценки для мгновенного перерасчета среднего балла на клиенте
        select.addEventListener('change', () => this.calculateStudentAverage(tr));

        td.appendChild(select);
        tr.appendChild(td);
      }

      // Ячейка Итога / Среднего балла (сохраняем ваш sticky-класс)
      const avgTd = document.createElement('td');
      avgTd.className = 'student-average-cell sticky-col-result';
      avgTd.style.fontWeight = 'bold';
      tr.appendChild(avgTd);

      this.tbody.appendChild(tr);
      this.calculateStudentAverage(tr); // Считаем средний балл при первой загрузке строки
    });
  }

  // Расчет среднего балла для одной строки ученика
  calculateStudentAverage(rowElement) {
    const selects = rowElement.querySelectorAll('.journal-grade-select');
    const averageCell = rowElement.querySelector('.student-average-cell');
    
    let sum = 0;
    let count = 0;

    selects.forEach(select => {
      const val = select.value;
      // В среднем балле учитываем только цифровые оценки
      if (val === '5' || val === '4' || val === '3' || val === '2') {
        sum += parseInt(val, 10);
        count++;
      }
    });

    if (count > 0) {
      const avg = sum / count;
      averageCell.textContent = avg.toFixed(2); // Округление до сотых (например: 4.67)
    } else {
      averageCell.textContent = '—';
    }
  }

  // Сохранение всех измененных селектов в таблицу grades Supabase
  async saveJournalGrades() {
    this.saveBtn.disabled = true;
    this.saveBtn.textContent = 'Сохранение...';

    const selects = this.tbody.querySelectorAll('.journal-grade-select');
    const recordsToUpsert = [];

    selects.forEach(select => {
      const val = select.value;
      const studentId = select.dataset.studentId;
      const gradeDate = select.dataset.date;

      // Записываем строчку, если учитель выбрал оценку или статус пропуска
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
        await this.loadJournalData(); // Перезагружаем интерфейс для синхронизации
      }
    } else {
      alert('Нет данных для сохранения (все поля пустые).');
    }

    this.saveBtn.disabled = false;
    this.saveBtn.textContent = 'Сохранить';
  }
}

// Запуск контроллера при полной загрузке HTML-страницы
document.addEventListener('DOMContentLoaded', () => {
  const journal = new SchoolJournal();
  journal.init();
});
