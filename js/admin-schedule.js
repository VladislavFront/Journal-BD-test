document.addEventListener('DOMContentLoaded', async () => {
  if (typeof checkAuthGlobal === 'function') {
    await checkAuthGlobal();
  }

  initScheduleLogic();
});

function initScheduleLogic() {
  const classSelect = document.querySelector('.select-custom_class-select');
  const saveBtn = document.querySelector('.select-submit');

  if (!classSelect || !saveBtn) {
    console.error('Критические элементы управления расписанием не найдены в DOM!');
    return;
  }

  saveBtn.removeAttribute('onclick');

  classSelect.addEventListener('change', async () => {
    const classId = classSelect.value;
    if (!classId) {
      clearAllInputs();
      return;
    }
    await loadScheduleForClass(classId);
  });

  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const classId = classSelect.value;
    
    if (!classId || classId === "") {
      alert('Пожалуйста, выберите класс из списка перед сохранением!');
      return;
    }

    await saveScheduleTemplate(classId);
  });
}

async function loadScheduleForClass(classId) {
  clearAllInputs();

  const { data: scheduleData, error } = await db
    .from('schedule')
    .select('day_of_week, lesson_number, lesson_time, subject_name')
    .eq('class_id', classId);

  if (error) {
    console.error('Ошибка загрузки расписания:', error.message);
    alert('Не удалось загрузить существующее расписание: ' + error.message);
    return;
  }

  if (!scheduleData || scheduleData.length === 0) {
    console.log('Расписание для этого класса отсутствует, инпуты оставлены пустыми.');
    return;
  }

  const dayCards = document.querySelectorAll('.day-card');

  dayCards.forEach(dayCard => {
    const dayTitle = dayCard.querySelector('.day-title').textContent.trim();

    const dayLessons = scheduleData.filter(item => item.day_of_week === dayTitle);

    const lessonRows = dayCard.querySelectorAll('.lesson-row');
    lessonRows.forEach(row => {
      const lessonNum = parseInt(row.querySelector('.lesson-num').textContent.trim());

      const matchingLesson = dayLessons.find(l => l.lesson_number === lessonNum);

      if (matchingLesson) {
        const timeInput = row.querySelector('.input-time');
        const subjectInput = row.querySelector('.input-subject');

        if (timeInput) timeInput.value = matchingLesson.lesson_time || '';
        if (subjectInput) subjectInput.value = matchingLesson.subject_name || '';
      }
    });
  });
}

async function saveScheduleTemplate(classId) {
  const saveBtn = document.querySelector('.select-submit');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Сохранение...';

  const scheduleRecords = [];
  const dayCards = document.querySelectorAll('.day-card');

  dayCards.forEach(dayCard => {
    const dayTitle = dayCard.querySelector('.day-title').textContent.trim();
    const lessonRows = dayCard.querySelectorAll('.lesson-row');

    lessonRows.forEach(row => {
      const lessonNum = parseInt(row.querySelector('.lesson-num').textContent.trim());
      const timeValue = row.querySelector('.input-time').value.trim();
      const subjectValue = row.querySelector('.input-subject').value.trim();

      if (timeValue !== '' || subjectValue !== '') {
        scheduleRecords.push({
          class_id: parseInt(classId),
          day_of_week: dayTitle,
          lesson_number: lessonNum,
          lesson_time: timeValue,
          subject_name: subjectValue
        });
      }
    });
  });

  const { error } = await db
    .from('schedule')
    .upsert(scheduleRecords, { onConflict: 'class_id, day_of_week, lesson_number' });

  if (error) {
    alert('Произошла ошибка при сохранении расписания: ' + error.message);
    console.error('Ошибка сохранения расписания:', error);
  } else {
    alert('Шаблон расписания успешно сохранен на сервере!');
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Сохранить шаблон расписания';
}

function clearAllInputs() {
  const timeInputs = document.querySelectorAll('.input-time');
  const subjectInputs = document.querySelectorAll('.input-subject');
  
  timeInputs.forEach(input => input.value = '');
  subjectInputs.forEach(input => input.value = '');
}
