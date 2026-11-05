class SupabaseStudentDiary {
  constructor() {
    this.BASE_YEAR = 2026; // Текущий рабочий год проекта
    this.daysOfWeekRu = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    this.studentClassId = null;
    this.globalStartMonday = this.getFirstMondayOfYear(this.BASE_YEAR);

    this.currentWeek = this.initWeekIndex();

    this.container = document.getElementById("journal-container");
    this.weekTitle = document.getElementById("week-title");
    this.prevBtn = document.getElementById("prev-week-btn");
    this.nextBtn = document.getElementById("next-week-btn");
  }

  getFirstMondayOfYear(year) {
    let date = new Date(year, 8, 1); 
    let dayOfWeek = date.getDay();
    if (dayOfWeek !== 1) {
      let daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      date.setDate(date.getDate() - daysToSubtract);
    }
    return date;
  }

  initWeekIndex() {
    const today = new Date();
    const diffInMs = today - this.globalStartMonday;
    const msInWeek = 1000 * 60 * 60 * 24 * 7;
    const realWeekIndex = Math.floor(diffInMs / msInWeek);
    const calculatedWeek = realWeekIndex < 0 ? 0 : realWeekIndex;

    let savedWeek = localStorage.getItem('selectedWeek');
    let lastRealWeek = localStorage.getItem('lastRealWeekIndex');

    if (lastRealWeek !== null && parseInt(lastRealWeek, 10) !== calculatedWeek) {
      localStorage.setItem('selectedWeek', calculatedWeek);
      localStorage.setItem('lastRealWeekIndex', calculatedWeek);
      return calculatedWeek;
    }
    
    localStorage.setItem('lastRealWeekIndex', calculatedWeek);
    return savedWeek !== null ? parseInt(savedWeek, 10) : calculatedWeek;
  }

  getWeekDays(weekIndex) {
    const days = [];
    const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    const monthsNamesArr = ["сентября", "октября", "ноября", "декабря", "января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа"];
    
    for (let i = 0; i < 6; i++) {
      let dayDate = new Date(this.globalStartMonday); 
      let offset = (weekIndex * 7) + i;
      dayDate.setDate(dayDate.getDate() + offset);
      
      days.push({
        name: dayNames[i],
        dateNumber: dayDate.getDate(),
        dateString: dayDate.getDate().toString().padStart(2, '0'),
        monthString: (dayDate.getMonth() + 1).toString().padStart(2, '0'),
        monthNameGenitive: monthsNamesArr[dayDate.getMonth() >= 8 ? dayDate.getMonth() - 8 : dayDate.getMonth() + 4],
        year: dayDate.getFullYear(),
        fullDateString: dayDate.toDateString(),
        dayIndex: i + 1
      });
    }
    return days;
  }

  getLessonWordForm(count) {
    if (count === 1) return 'урок';
    if (count >= 2 && count <= 4) return 'урока';
    return 'уроков';
  }

  async init() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    const { data: profile } = await db.from('profiles').select('role, class_id').eq('id', user.id).single();
    if (!profile) return;

    if (profile.role === 'parent') {
      const activeChildId = localStorage.getItem('activeChildId');
      if (!activeChildId) {
        window.location.href = 'select-child.html';
        return;
      }
      const { data: child } = await db.from('profiles').select('class_id').eq('id', activeChildId).single();
      this.studentClassId = child ? child.class_id : null;
    } else {
      this.studentClassId = profile.class_id;
    }

    if (!this.studentClassId) {
      if (this.container) this.container.innerHTML = '<div style="color:white; text-align:center; padding:20px;">Класс не привязан в БД.</div>';
      return;
    }

    this.setupNavigation();
    await this.renderDiary();
  }

  setupNavigation() {
    if (this.prevBtn && this.nextBtn) {
      this.prevBtn.onclick = async () => {
        if (this.currentWeek > 0) {
          this.currentWeek--;
          localStorage.setItem('selectedWeek', this.currentWeek);
          await this.renderDiary();
        }
      };
      this.nextBtn.onclick = async () => {
        this.currentWeek++;
        localStorage.setItem('selectedWeek', this.currentWeek);
        await this.renderDiary();
      };
    }
  }

  async renderDiary() {
    const weekDays = this.getWeekDays(this.currentWeek);

    const firstDay = weekDays[0];
    const lastDay = weekDays[weekDays.length - 1];
    if (this.weekTitle) {
      this.weekTitle.textContent = `${firstDay.dateNumber} - ${lastDay.dateNumber} ${lastDay.monthNameGenitive} ${lastDay.year}`;
    }

    this.updateTopCalendarButtons(weekDays);

    const { data: schedule, error } = await db
      .from('schedule')
      .select('day_of_week, lesson_number, lesson_time, subject_name')
      .eq('class_id', this.studentClassId)
      .order('lesson_number');

    if (error) {
      console.error('Ошибка загрузки расписания:', error.message);
      return;
    }

    if (!this.container) return;
    this.container.innerHTML = "";

    weekDays.forEach((day, index) => {
      const dayLessons = (schedule || []).filter(item => 
        item.day_of_week.toLowerCase() === day.name.toLowerCase() && item.subject_name !== ''
      );

      let lessonsHTML = "";

      if (dayLessons.length === 0) {
        lessonsHTML = `
          <div class="schedule-main">
            <div class="schedule-right">
              <p class="schedule-right__homework-text" style="text-align: center; color: var(--no-active-color-dark); padding: 15px 0;">
                Выходной день
              </p>
            </div>
          </div>
        `;
      } else {
        lessonsHTML = dayLessons.map(lesson => {
          let timeStart = '—';
          let timeEnd = '—';
          
          if (lesson.lesson_time && lesson.lesson_time.trim() !== '') {
            const rawTime = lesson.lesson_time.trim();
            
            const separator = ['-', '–', '—'].find(s => rawTime.includes(s));
            
            if (separator) {
              const timeParts = rawTime.split(separator);
              timeStart = timeParts[0] ? timeParts[0].trim() : '—';
              timeEnd = timeParts[1] ? timeParts[1].trim() : '—';
            } else {
              timeStart = rawTime;
              timeEnd = '—';
            }
          }

          return `
            <div class="schedule-main">
              <div class="schedule-left">
                <div class="schedule-left__number">${lesson.lesson_number}</div>
                <div class="schedule-left__time">
                  <span>${timeStart}</span><br><span>${timeEnd}</span>
                </div>
              </div>
              <div class="schedule-right">
                <div class="schedule-right__header">
                  <h3 class="schedule-right__title">${lesson.subject_name}</h3>



                </div>
                <div class="schedule-right__homework">
                  <div class="schedule-right__homework-title">
                    <h4>Домашнее задание ДЗ</h4>
                  </div>
                  <p class="schedule-right__homework-text" id="hw-${day.dateString}.${day.monthString}-${lesson.lesson_number}">
                    Нет ДЗ
                  </p>
                </div>
              </div>
            </div>
          `;
        }).join("");
      }

      const weekBlock = document.createElement("div");
      weekBlock.className = "schedule-week";
      weekBlock.id = `day-block-${index}`;

      weekBlock.innerHTML = `
        <div class="schedule-header">
          <div class="schedule-header__day">
            <h2 class="schedule-header__title">${day.name}</h2>
            <span class="schedule-header__sub-title">${day.dateString}.${day.monthString}</span>
          </div>
          <div class="schedule-header__info-day">
            <div class="schedule-header__rait-container"></div>
            <div class="schedule-header__count-lesson">${dayLessons.length} ${this.getLessonWordForm(dayLessons.length)}</div>
          </div>
        </div>
        <div class="schedule-block">
          ${lessonsHTML}
        </div>
      `;
      this.container.appendChild(weekBlock);
    });

    this.initTopCalendarClicks();
    document.dispatchEvent(new CustomEvent('diaryRendered'))
  }

  updateTopCalendarButtons(weekDays) {
    const shortNames = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
    const topButtons = document.querySelectorAll(".days-down .days-down__day-card");
    const todayString = new Date().toDateString();

    topButtons.forEach((btn, index) => {
      if (weekDays[index]) {
        const dayData = weekDays[index];

        btn.innerHTML = `${shortNames[index]} <span>${dayData.dateNumber}</span>`;

        if (dayData.fullDateString === todayString) {
        btn.classList.add("days-down__day-card_active");
        } else {
        btn.classList.remove("days-down__day-card_active");
        }
      }
    });
    }

    initTopCalendarClicks() {
      const topCalendarContainer = document.querySelector(".days-down");
      if (!topCalendarContainer) return;
      topCalendarContainer.onclick = null;
      topCalendarContainer.onclick = (event) => {
        const targetBtn = event.target.closest(".days-down__day-card");

        if (targetBtn) {
          const dayAttr = targetBtn.getAttribute("data-day");
          const dayIndex = parseInt(dayAttr, 10) - 1;
          const targetBlock = document.getElementById(`day-block-${dayIndex}`);

          if (targetBlock) {
            targetBlock.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

            document.querySelectorAll(".days-down__day-card").forEach(b => {
              b.classList.remove("days-down__day-card_active");
            });
            targetBtn.classList.add("days-down__day-card_active");
          }
        }
      };
    }
}

document.addEventListener("DOMContentLoaded", () => {
  const diary = new SupabaseStudentDiary();
  diary.init();
});