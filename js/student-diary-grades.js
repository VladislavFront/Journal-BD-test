async function loadDiaryGrades() {
  const diaryContainer = document.getElementById("journal-container");
  if (!diaryContainer) return; 

  const dayBlocks = diaryContainer.querySelectorAll('.schedule-week');
  if (dayBlocks.length === 0) return;

  const firstDayText = dayBlocks[0].querySelector('.schedule-header__sub-title').textContent.trim();
  const lastDayText = dayBlocks[dayBlocks.length - 1].querySelector('.schedule-header__sub-title').textContent.trim();

  const weekTitleText = document.getElementById("week-title")?.textContent || "";
  const yearMatch = weekTitleText.match(/\d{4}/);
  const currentYear = yearMatch ? yearMatch[0] : "2026";

  const [startDay, startMonth] = firstDayText.split('.');
  const [endDay, endMonth] = lastDayText.split('.');

  const startDate = `${currentYear}-${startMonth}-${startDay}`;
  const endDate = `${currentYear}-${endMonth}-${endDay}`;

  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!profile) return;

  let studentId = user.id;
  if (profile.role === 'parent') {
    studentId = localStorage.getItem('activeChildId');
  }

  if (!studentId) return;

  const { data: gradesList, error } = await db
    .from('grades')
    .select('grade_date, subject_name, grade_value')
    .eq('student_id', studentId)
    .gte('grade_date', startDate)
    .lte('grade_date', endDate);

  if (error) {
    console.error('Ошибка загрузки оценок в дневник:', error.message);
    return;
  }

  function getGradeClass(val) {
    if (val === '5') return '_excellent';
    if (val === '4') return '_good';
    if (val === '3') return '_normal';
    if (val === '2') return '_horrible';

    if (val === 'Н') return '_horrible';
    if (val === 'Б') return '_excellent';
    if (val === 'У') return '_good';

    return 'undefind';
  }

  function getHeaderGradeClass(val) {
    if (val === '5') return 'schedule-header__point_excellent';
    if (val === '4') return 'schedule-header__point_good';
    if (val === '3') return 'schedule-header__point_normal';
    if (val === '2') return 'schedule-header__point_horrible';

    if (val === 'Н') return 'schedule-header__point_absence-horrible';
    if (val === 'Б') return 'schedule-header__point_absence-excellent';
    if (val === 'У') return 'schedule-header__point_absence-good';

    return 'undefind';
  }

  dayBlocks.forEach((dayBlock) => {
    const subTitle = dayBlock.querySelector('.schedule-header__sub-title').textContent.trim();
    const [d, m] = subTitle.split('.');
    const isoDate = `${currentYear}-${m}-${d}`;

    let dayGrades = (gradesList || []).filter(g => g.grade_date === isoDate);

    const raitContainer = dayBlock.querySelector('.schedule-header__rait-container')
                           
    if (raitContainer) {
      raitContainer.innerHTML = '';
      dayGrades.forEach(grade => {
        const span = document.createElement('span');
        span.className = `schedule-header__point ${getHeaderGradeClass(grade.grade_value)}`;
        span.textContent = grade.grade_value;
        raitContainer.appendChild(span);
      });
    }

    const lessonRows = dayBlock.querySelectorAll('.schedule-main');
    lessonRows.forEach(row => {
      const titleElement = row.querySelector('.schedule-right__title');
      const headerElement = row.querySelector('.schedule-right__header');
      
      if (!titleElement || !headerElement) return;

      const subjectTitle = titleElement.textContent.trim();

      const oldPoint = headerElement.querySelector('.schedule-right__point');
      if (oldPoint) oldPoint.remove();

      const gradeIndex = dayGrades.findIndex(g => g.subject_name.toLowerCase() === subjectTitle.toLowerCase());

      if (gradeIndex !== -1) {
        const matchedGrade = dayGrades[gradeIndex];
        const val = matchedGrade.grade_value;
        const gradeSpan = document.createElement('span');

        gradeSpan.className = `schedule-right__point schedule-right__point${getGradeClass(val)}`;
        gradeSpan.textContent = val;
        headerElement.appendChild(gradeSpan);

        dayGrades.splice(gradeIndex, 1);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener('diaryRendered', loadDiaryGrades);

  const prevBtn = document.getElementById("prev-week-btn");
  const nextBtn = document.getElementById("next-week-btn");
  
  if (prevBtn) prevBtn.addEventListener("click", () => setTimeout(loadDiaryGrades, 450));
  if (nextBtn) nextBtn.addEventListener("click", () => setTimeout(loadDiaryGrades, 450));
});
