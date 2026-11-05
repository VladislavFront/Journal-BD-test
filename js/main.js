async function checkAuth() {
  const { data: { user }, error } = await db.auth.getUser();
  
  if (error || !user) {
    alert("Сессия истекла или вы не авторизованы. Пожалуйста, войдите снова.");
    window.location.href = "../../html/auth/registration.html"; 
    return null;
  }
  
  console.log("Пользователь авторизован:", user.email);
  return user;
}

function initGlobalLogoutButtons() {
  const exitButtons = document.querySelectorAll('.header-right__btn-exit');
  
  if (exitButtons.length === 0) {
    return;
  }

  exitButtons.forEach(btn => {
    btn.onclick = null; 

    btn.addEventListener('click', async (e) => {
      e.preventDefault(); 

      const { error } = await db.auth.signOut();
      
      if (error) {
        alert('Ошибка при выходе из системы: ' + error.message);
      } else {
        localStorage.removeItem('activeChildId');
        window.location.href = '../auth/registration.html';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initGlobalLogoutButtons();
});


const header = document.querySelector('.header');
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
  if (window.scrollY > lastScrollY && window.scrollY > 100) {
    header.classList.add('header_hidden');
  } else {
    header.classList.remove('header_hidden');
  }

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
    const printButtons = document.querySelectorAll('.export-btn_content-print');
  
    printButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            window.print();
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const pdfButtons = document.querySelectorAll('.export-btn_content-export');

    pdfButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const journalContainer = document.getElementById('journal-container') || document.querySelector('main');

            if (!journalContainer) {
                console.error('[PDF] Контейнер журнала не найден на странице!');
                return;
            }

            journalContainer.classList.add('pdf-only-print');

            const options = {
                margin: 15,
                filename: 'Электронный_Дневник.pdf',
                image: { type: 'jpeg', quality: 1.0 },
                html2canvas: {
                    scale: 2,
                    useCORS: true, 
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(options).from(journalContainer).save().then(() => {
                journalContainer.classList.remove('pdf-only-print');
            });
        });
    });
});