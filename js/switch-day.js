const container = document.querySelector('.days-down');
const cards = container.querySelectorAll('.days-down__day-card');

container.addEventListener('click', (event) => {
  const clickedCard = event.target.closest('.days-down__day-card');

  if (!clickedCard) return;

  const currentActive = container.querySelector('.days-down__day-card_active');
  if (currentActive) {
    currentActive.classList.remove('days-down__day-card_active');
  }

  clickedCard.classList.add('days-down__day-card_active');
});

function updateTopCalendar(weekDays) {
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
