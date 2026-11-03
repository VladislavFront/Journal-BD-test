// === 1. ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ ПРИ ЗАГРУЗКЕ DOM ===
document.addEventListener('DOMContentLoaded', async () => {
  // На всякий случай проверяем, авторизован ли пользователь (функция из main.js)
  // Для завуча здесь можно добавить проверку роли, если это необходимо
  if (typeof checkAuthGlobal === 'function') {
    await checkAuthGlobal();
  }

  initScheduleLogic();     // Запускаем логику управления расписанием
});

// === 3. ОСНОВНАЯ ЛОГИКА РАБОТЫ С РАСПИСАНИЕМ ===
function initScheduleLogic() {
  const classSelect = document.querySelector('.select-custom_class-select');
  const saveBtn = document.querySelector('.select-submit');

  if (!classSelect || !saveBtn) {
    console.error('Критические элементы управления расписанием не найдены в DOM!');
    return;
  }

  // Убираем старый инлайновый onclick, если он остался в вёрстке
  saveBtn.removeAttribute('onclick');

  // Слушатель смены класса в селекте
  classSelect.addEventListener('change', async () => {
    const classId = classSelect.value;
    if (!classId) {
      clearAllInputs();
      return;
    }
    await loadScheduleForClass(classId);
  });

  // Слушатель нажатия кнопки "Сохранить шаблон расписания"
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

// === 4. ФУНКЦИЯ ЗАГРУЗКИ РАСПИСАНИЯ ИЗ SUPABASE ===
async function loadScheduleForClass(classId) {
  // Очищаем инпуты перед загрузкой новых данных
  clearAllInputs();

  // Запрашиваем расписание по выбранному class_id
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

  // Находим все карточки дней недели на странице
  const dayCards = document.querySelectorAll('.day-card');

  dayCards.forEach(dayCard => {
    const dayTitle = dayCard.querySelector('.day-title').textContent.trim();
    
    // Фильтруем данные из БД конкретно под текущий день недели
    const dayLessons = scheduleData.filter(item => item.day_of_week === dayTitle);

    // Перебираем строки уроков внутри этой карточки дня
    const lessonRows = dayCard.querySelectorAll('.lesson-row');
    lessonRows.forEach(row => {
      const lessonNum = parseInt(row.querySelector('.lesson-num').textContent.trim());
      
      // Ищем в массиве из БД соответствующий номер урока
      const matchingLesson = dayLessons.find(l => l.lesson_number === lessonNum);

      if (matchingLesson) {
        // Подставляем значения времени и предмета из базы в инпуты
        const timeInput = row.querySelector('.input-time');
        const subjectInput = row.querySelector('.input-subject');

        if (timeInput) timeInput.value = matchingLesson.lesson_time || '';
        if (subjectInput) subjectInput.value = matchingLesson.subject_name || '';
      }
    });
  });
}

// === 5. ФУНКЦИЯ СОХРАНЕНИЯ РАСПИСАНИЯ В SUPABASE ===
async function saveScheduleTemplate(classId) {
  const saveBtn = document.querySelector('.select-submit');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Сохранение...';

  const scheduleRecords = [];
  const dayCards = document.querySelectorAll('.day-card');

  // Собираем данные в цикле по структуре вашей вёрстки
  dayCards.forEach(dayCard => {
    const dayTitle = dayCard.querySelector('.day-title').textContent.trim();
    const lessonRows = dayCard.querySelectorAll('.lesson-row');

    lessonRows.forEach(row => {
      const lessonNum = parseInt(row.querySelector('.lesson-num').textContent.trim());
      const timeValue = row.querySelector('.input-time').value.trim();
      const subjectValue = row.querySelector('.input-subject').value.trim();

      // Записываем строчку только если заполнено время ИЛИ предмет (чтобы не плодить пустые строки)
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

  // Отправляем массив данных в Supabase с помощью .upsert()
  // Метод upsert опирается на наш составной уникальный ключ (class_id, day_of_week, lesson_number)
  // Если запись с такими параметрами есть — он обновит её, если нет — создаст новую.
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

// === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ОЧИСТКИ ВСЕХ ПОЛЕЙ ===
function clearAllInputs() {
  const timeInputs = document.querySelectorAll('.input-time');
  const subjectInputs = document.querySelectorAll('.input-subject');
  
  // При очистке можно либо затирать значения полностью, либо ставить дефолты времени
  timeInputs.forEach(input => input.value = '');
  subjectInputs.forEach(input => input.value = '');
}
