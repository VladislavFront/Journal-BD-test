// === АВТОНОМНЫЙ МОДУЛЬ ДОМАШНИХ ЗАДАНИЙ ДЛЯ ДНЕВНИКА ===

async function loadDiaryHomework() {
  const diaryContainer = document.getElementById("journal-container");
  if (!diaryContainer) return; // Защита: выходим, если это не страница дневника

  // Находим сгенерированные дни (только если они есть на экране)
  const dayBlocks = diaryContainer.querySelectorAll('.schedule-week');
  if (dayBlocks.length === 0) return; 
  
  // ИСПРАВЛЕНО: Корректно берем первый и последний заголовки из коллекции дней
  const firstHeader = dayBlocks[0].querySelector('.schedule-header__sub-title');
  const lastHeader = dayBlocks[dayBlocks.length - 1].querySelector('.schedule-header__sub-title');
  
  if (!firstHeader || !lastHeader) return; 

  const firstDayText = firstHeader.textContent.trim();
  const lastDayText = lastHeader.textContent.trim();

  // Вытаскиваем рабочий год проекта (2026) из глобального заголовка
  const weekTitleText = document.getElementById("week-title")?.textContent || "";
  const yearMatch = weekTitleText.match(/\d{4}/);
  const currentYear = yearMatch ? yearMatch[0] : "2026";

  const [startDay, startMonth] = firstDayText.split('.');
  const [endDay, endMonth] = lastDayText.split('.');

  const startDate = `${currentYear}-${startMonth}-${startDay}`;
  const endDate = `${currentYear}-${endMonth}-${endDay}`;

  // Узнаем class_id (для ученика или выбранного ребенка родителя)
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  const { data: profile } = await db.from('profiles').select('role, class_id').eq('id', user.id).single();
  if (!profile) return;

  let classId = profile.class_id;
  if (profile.role === 'parent') {
    const activeChildId = localStorage.getItem('activeChildId');
    if (!activeChildId) return;
    const { data: child } = await db.from('profiles').select('class_id').eq('id', activeChildId).single();
    classId = child ? child.class_id : null;
  }

  if (!classId) return;

  // Запрашиваем ДЗ из Supabase на этот диапазон дат
  const { data: homeworkList, error } = await db
    .from('homework')
    .select('homework_date, subject_name, description, material_link')
    .eq('class_id', classId)
    .gte('homework_date', startDate)
    .lte('homework_date', endDate);

  if (error) {
    console.error('Ошибка загрузки ДЗ:', error.message);
    return;
  }

  // Раскладываем ДЗ по ячейкам уроков
  dayBlocks.forEach((dayBlock) => {
    const subTitle = dayBlock.querySelector('.schedule-header__sub-title').textContent.trim();
    const [d, m] = subTitle.split('.');
    const isoDate = `${currentYear}-${m}-${d}`;

    const dayHomeworks = (homeworkList || []).filter(h => h.homework_date === isoDate);

    // Перебираем строки уроков внутри этой карточки дня
    const lessonRows = dayBlock.querySelectorAll('.schedule-main');
    lessonRows.forEach(row => {
      const titleElement = row.querySelector('.schedule-right__title');
      
      // ЗАЩИТА: Пропускаем выходные дни, где нет названия предмета
      if (!titleElement) return;

      const subjectTitle = titleElement.textContent.trim();
      const hwTextElement = row.querySelector('.schedule-right__homework-text');
      
      if (!hwTextElement) return;

      // Ищем совпадение по имени предмета
      const matchedHw = dayHomeworks.find(h => h.subject_name.toLowerCase() === subjectTitle.toLowerCase());

      if (matchedHw) {
        let htmlContent = matchedHw.description;

        if (matchedHw.material_link && matchedHw.material_link.trim() !== '') {
          htmlContent += `<br><a href="${matchedHw.material_link.trim()}" target="_blank" style="color: #4b7bec; text-decoration: underline; font-size: 12px; margin-top: 5px; display: inline-block;">🔗 Материалы к уроку</a>`;
        }
        hwTextElement.innerHTML = htmlContent;
      } else {
        hwTextElement.textContent = 'Не задано';
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Ловим кастомное событие от основного скрипта (сработает при любой перезагрузке!)
  document.addEventListener('diaryRendered', loadDiaryHomework);

  // Оставляем триггеры на стрелочки переключения недель
  const prevBtn = document.getElementById("prev-week-btn");
  const nextBtn = document.getElementById("next-week-btn");
  
  if (prevBtn) prevBtn.addEventListener("click", () => setTimeout(loadDiaryHomework, 400));
  if (nextBtn) nextBtn.addEventListener("click", () => setTimeout(loadDiaryHomework, 400));
});

