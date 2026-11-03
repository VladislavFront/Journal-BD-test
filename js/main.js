async function checkAuth() {
  const { data: { user }, error } = await db.auth.getUser();
  
  if (error || !user) {
    alert("Сессия истекла или вы не авторизованы. Пожалуйста, войдите снова.");
    window.location.href = "../../html/auth/registration.html"; 
    return null;
  }
  
  console.log("Пользователь авторизован:", user.email);
  return user; // Возвращаем юзера, чтобы другие скрипты могли взять его user.id
}

// УНИВЕРСАЛЬНАЯ ЛОГИКА КНОПОК ВЫХОДА ДЛЯ ВСЕХ СТРАНИЦ
function initGlobalLogoutButtons() {
  // Находим ВСЕ кнопки выхода на текущей странице (в хедере, бургере, сайдбаре)
  const exitButtons = document.querySelectorAll('.header-right__btn-exit');
  
  if (exitButtons.length === 0) {
    // Если на этой конкретной странице нет кнопок выхода, просто выходим из функции
    return;
  }

  exitButtons.forEach(btn => {
    // На всякий случай очищаем старые слушатели, если они дублировались
    btn.onclick = null; 

    btn.addEventListener('click', async (e) => {
      e.preventDefault(); // Блокируем стандартный переход по ссылке #
      
      // Вызываем логаут на сервере Supabase
      const { error } = await db.auth.signOut();
      
      if (error) {
        alert('Ошибка при выходе из системы: ' + error.message);
      } else {
        // Очищаем временные ID из браузера
        localStorage.removeItem('activeChildId');
        // Перенаправляем на страницу регистрации
        window.location.href = '../auth/registration.html';
      }
    });
  });
}

// Запускаем инициализацию кнопок СТРОГО после того, как весь HTML полностью загрузился
document.addEventListener('DOMContentLoaded', () => {
  initGlobalLogoutButtons();
});


const header = document.querySelector('.header');
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
  // 1. Проверяем, в какую сторону идет скролл
  if (window.scrollY > lastScrollY && window.scrollY > 100) {
    // Скроллим ВНИЗ и ушли ниже чем на 100px — прячем хедер
    header.classList.add('header_hidden');
  } else {
    // Скроллим ВВЕРХ (даже на 1 пиксель или один свайп) — показываем хедер
    header.classList.remove('header_hidden');
  }
  
  // 2. Обновляем значение прошлой позиции скролла
  lastScrollY = window.scrollY;
});

const burgerMenu = document.querySelector('.burger')

function openBurgerMenu() {
  burgerMenu.classList.add('active')
}

function closedBurgerMenu() {
  burgerMenu.classList.remove('active')
}


document.addEventListener('DOMContentLoaded', () => {
    // Находим ВСЕ кнопки печати на странице
    const printButtons = document.querySelectorAll('.export-btn_content-print');
    
    printButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            window.print(); // Запуск печати браузера
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const pdfButtons = document.querySelectorAll('.export-btn_content-export');

    pdfButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // !!! УКАЖИТЕ ТУТ КЛАСС ИЛИ ID КОНТЕЙНЕРА, В КОТОРЫЙ JS ЗАГРУЖАЕТ ЖУРНАЛ !!!
            const journalContainer = document.getElementById('journal-container') || document.querySelector('main');

            if (!journalContainer) {
                console.error('[PDF] Контейнер журнала не найден на странице!');
                return;
            }

            // Временно добавляем класс для превращения журнала в белый печатный вид
            journalContainer.classList.add('pdf-only-print');

            const options = {
                margin: 15, // Отступы от краев страницы (в мм)
                filename: 'Электронный_Дневник.pdf',
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: {
                    scale: 2, // Высокое качество и четкость текста
                    useCORS: true, 
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Генерируем PDF строго из этого контейнера
            html2pdf().set(options).from(journalContainer).save().then(() => {
                // Как только PDF скачался, возвращаем исходный дизайн журнала для пользователя
                journalContainer.classList.remove('pdf-only-print');
            });
        });
    });
});