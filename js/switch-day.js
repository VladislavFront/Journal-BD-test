// Находим контейнер и все карточки внутри него
const container = document.querySelector('.days-down');
const cards = container.querySelectorAll('.days-down__day-card');

// Используем делегирование событий для лучшей производительности
container.addEventListener('click', (event) => {
  // Находим ближайшего родителя с классом карточки (на случай клика по тексту внутри)
  const clickedCard = event.target.closest('.days-down__day-card');
  
  // Если клик был не по карточке или внутри этого контейнера, ничего не делаем
  if (!clickedCard) return;

  // Удаляем активный класс у старой карточки
  const currentActive = container.querySelector('.days-down__day-card_active');
  if (currentActive) {
    currentActive.classList.remove('days-down__day-card_active');
  }

  // Добавляем активный класс на кликнутую карточку
  clickedCard.classList.add('days-down__day-card_active');
});

// ==========================================
// НЕЗАВИСИМЫЙ МОДУЛЬ ДЛЯ КНОПОК КАЛЕНДАРЯ
// ==========================================

// 1. Функция обновления дат на верхних кнопках
function updateTopCalendar(weekDays) {
  // Короткие имена для кнопок
  const shortNames = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];
  
  // Находим все твои кнопки дней на странице по их общему классу
  const topButtons = document.querySelectorAll(".days-down .days-down__day-card");
  const todayString = new Date().toDateString();

  // Перебираем кнопки и меняем в них текст
  topButtons.forEach((btn, index) => {
    if (weekDays[index]) {
      const dayData = weekDays[index];
      
      // Перезаписываем текст кнопки в твоем формате: ПН <span>Число</span>
      btn.innerHTML = `${shortNames[index]} <span>${dayData.dateNumber}</span>`;
      
      // Если этот день совпадает с сегодняшним на компьютере — подсвечиваем его
      if (dayData.fullDateString === todayString) {
        btn.classList.add("days-down__day-card_active");
      } else {
        btn.classList.remove("days-down__day-card_active");
      }
    }
  });
}
