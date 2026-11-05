class HomeworkManager {
  constructor() {
    this.daysOfWeekRu = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

    this.dateInput = document.querySelector('.js-hw-date');
    this.subjectSelect = document.querySelector('.js-hw-subject');
    this.classSelect = document.querySelector('.js-hw-class');
    this.textTask = document.querySelector('.js-hw-text');
    this.linkInput = document.querySelector('.js-hw-link');
    this.saveBtn = document.querySelector('.js-hw-save');
  }

  init() {
    if (!this.saveBtn) return;

    const today = new Date().toISOString().split('T')[0];
    if (this.dateInput) this.dateInput.value = today;

    this.saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleSaveProcess();
    });
  }

  formatDateRu(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  }

  async handleSaveProcess() {
    const classId = this.classSelect.value;
    const subject = this.subjectSelect.value;
    const selectedDate = this.dateInput.value;
    const taskText = this.textTask.value.trim();
    const materialLink = this.linkInput.value.trim();

    if (!classId || !subject || !selectedDate || !taskText) {
      alert('Пожалуйста, заполните класс, предмет, дату и текст домашнего задания!');
      return;
    }

    const dateObj = new Date(selectedDate);
    const dayIndex = dateObj.getDay(); // 0 - воскресенье, 6 - суббота

    if (dayIndex === 0 || dayIndex === 6) {
      alert('НЕЛЬЗЯ ТУТ ВЫХОДНЫЕ! Пожалуйста, выберите будний день.');
      return;
    }

    this.saveBtn.disabled = true;
    this.saveBtn.textContent = 'Проверка расписания...';

    const dayNameRu = this.daysOfWeekRu[dayIndex];
    
    const hasLesson = await this.checkLessonInSchedule(classId, dayNameRu, subject);

    if (!hasLesson) {
      const nextLessonDate = await this.findNextLessonDate(classId, selectedDate, subject);
      
      let confirmMessage = `Выбранного урока нет на ${this.formatDateRu(selectedDate)}.`;
      if (nextLessonDate) {
        confirmMessage += `\nВыставить на ближайший урок ${this.formatDateRu(nextLessonDate)}?`;
      } else {
        confirmMessage += `\nЭтот предмет вообще отсутствует в расписании данного класса. Всё равно сохранить на выбранную дату?`;
      }

      const userAgreed = confirm(confirmMessage);
      
      if (!userAgreed) {
        this.resetSaveButton();
        return;
      }

      if (userAgreed && nextLessonDate) {
        this.dateInput.value = nextLessonDate;
        this.saveBtn.disabled = true;
        this.saveBtn.textContent = 'Сохранение...';
        await this.executeUpsert(classId, subject, nextLessonDate, taskText, materialLink);
        this.resetSaveButton();
        return;
      }
    }

    await this.executeUpsert(classId, subject, selectedDate, taskText, materialLink);
    this.resetSaveButton();
  }

  async checkLessonInSchedule(classId, dayName, subject) {
    const { data, error } = await db
      .from('schedule')
      .select('id')
      .eq('class_id', parseInt(classId, 10))
      .eq('day_of_week', dayName)
      .eq('subject_name', subject)
      .limit(1);

    if (error) {
      console.error('Ошибка проверки расписания:', error.message);
      return false;
    }
    return data && data.length > 0;
  }

  async findNextLessonDate(classId, startDateStr, subject) {
    const { data: activeDays, error } = await db
      .from('schedule')
      .select('day_of_week')
      .eq('class_id', parseInt(classId, 10))
      .eq('subject_name', subject);

    if (error || !activeDays || activeDays.length === 0) return null;

    const allowedDayIndexes = activeDays.map(item => this.daysOfWeekRu.indexOf(item.day_of_week));

    let checkDate = new Date(startDateStr);
    for (let i = 1; i <= 14; i++) {
      checkDate.setDate(checkDate.getDate() + 1);
      if (allowedDayIndexes.includes(checkDate.getDay())) {
        return checkDate.toISOString().split('T')[0]; 
      }
    }
    return null;
  }

  async executeUpsert(classId, subject, finalDate, text, link) {
    const { error } = await db
      .from('homework')
      .upsert({
        class_id: parseInt(classId, 10),
        subject_name: subject,
        homework_date: finalDate,
        description: text,
        material_link: link || null
      }, { onConflict: 'class_id,subject_name,homework_date' });

    if (error) {
      alert('Ошибка при сохранении ДЗ: ' + error.message);
      console.error(error);
    } else {
      alert(`Домашнее задание успешно сохранено на ${this.formatDateRu(finalDate)}!`);
      this.textTask.value = '';
      this.linkInput.value = '';
    }
  }

  resetSaveButton() {
    this.saveBtn.disabled = false;
    this.saveBtn.textContent = 'Сохранить выставленное ДЗ';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const hw = new HomeworkManager();
  hw.init();
});
