// 1. ПОИСК ИЗМЕНЕНИЙ В ИНТЕРФЕЙСЕ
const childrenGrid = document.getElementById('children-container');
const addChildBtn = document.getElementById('addChildBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addModal = document.getElementById('addModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnSubmitCode = document.getElementById('btnSubmitCode');
const childCodeInput = document.getElementById('childCodeInput');

// 2. ФУНКЦИЯ ОТРИСОВКИ КАРТОЧЕК ДЕТЕЙ
async function renderChildren(parentUuid) {
  // Удаляем старые карточки (кнопку "Добавить" не трогаем)
  const existingCards = childrenGrid.querySelectorAll('.child-card:not(.add-card)');
  existingCards.forEach(card => card.remove());

  // Запрашиваем из БД связку: parent_children -> профиль ребенка -> класс ребенка
  const { data: relations, error } = await db
    .from('parent_children')
    .select(`
      child_id,
      profiles:child_id (
        full_name,
        classes:class_id (
          number,
          letter
        )
      )
    `)
    .eq('parent_id', parentUuid);

  if (error) {
    console.error('Ошибка при получении списка детей:', error.message);
    return;
  }

  // Строим карточки на основе ответов из Supabase
  relations.forEach(item => {
    const student = item.profiles;
    if (!student) return; // Защита, если профиль ученика вдруг удален

    // Формируем красивое название класса (например, "9А")
    const classText = student.classes 
      ? `${student.classes.number}${student.classes.letter}` 
      : '—';

    // Создаем HTML-структуру карточки
    const card = document.createElement('div');
    card.className = 'child-card';
    card.innerHTML = `
        <div class="child-avatar">👨‍🎓</div>
        <div class="child-name">${student.full_name}</div>
        <div class="child-class">${classText} класс</div>
    `;
    
    // При клике на карточку — "проваливаемся" в дневник конкретного ребенка
    card.addEventListener('click', () => {
      localStorage.setItem('activeChildId', item.child_id);
      window.location.href = 'student.html'; 
    });
    
    // Вставляем карточку на экран перед кнопкой "Добавить ребенка"
    childrenGrid.insertBefore(card, addChildBtn);
  });
}

// 3. ЛОГИКА ДОБАВЛЕНИЯ РЕБЕНКА ПО КОДУ
async function bindChildByCode(parentUuid) {
  const code = childCodeInput.value.trim(); // Это UUID ученика из таблицы profiles
  
  if (!code) {
    alert('Пожалуйста, введите уникальный код ребенка!');
    return;
  }

  btnSubmitCode.disabled = true;
  btnSubmitCode.textContent = 'Проверка...';

  // Шаг А: Проверяем, существует ли пользователь с таким ID в таблице profiles
  const { data: childProfile, error: profileError } = await db
    .from('profiles')
    .select('role, full_name')
    .eq('id', code)
    .maybeSingle();

  if (profileError || !childProfile) {
    alert('Ученик с таким кодом не найден. Проверьте правильность скопированного ID.');
    btnSubmitCode.disabled = false;
    btnSubmitCode.textContent = 'Привязать';
    return;
  }

  // Шаг Б: Проверяем, что этот код принадлежит именно ученику, а не учителю/родителю
  if (childProfile.role !== 'student') {
    alert(`Ошибка! Этот код принадлежит пользователю с ролью "${childProfile.role}". Можно привязывать только учеников.`);
    btnSubmitCode.disabled = false;
    btnSubmitCode.textContent = 'Привязать';
    return;
  }

  // Шаг В: Записываем связь в таблицу parent_children
  const { error: insertError } = await db
    .from('parent_children')
    .insert([
      { parent_id: parentUuid, child_id: code }
    ]);

  if (insertError) {
    // Код ошибки PostgreSQL '23505' означает нарушение уникальности (Unique Constraint)
    if (insertError.code === '23505') {
      alert('Этот ребенок уже привязан к вашему аккаунту!');
    } else {
      alert('Не удалось привязать ребенка: ' + insertError.message);
    }
    btnSubmitCode.disabled = false;
    btnSubmitCode.textContent = 'Привязать';
    return;
  }

  // Успешный исход
  alert(`Ребенок ${childProfile.full_name} успешно привязан навсегда!`);
  
  // Закрываем модальное окно и сбрасываем кнопку
  addModal.classList.remove('modal--active');
  btnSubmitCode.disabled = false;
  btnSubmitCode.textContent = 'Привязать';

  // Обновляем список карточек на экране
  await renderChildren(parentUuid);
}

// === 5. НАСТРОЙКА АНИМАЦИИ МОДАЛЬНОГО ОКНА ===
function initModalEvents(parentUuid) {
  // Открытие окна
  addChildBtn.addEventListener('click', () => {
    addModal.classList.add('modal--active');
    childCodeInput.value = '';
    setTimeout(() => childCodeInput.focus(), 100);
  });

  // Закрытие по кнопке "Отмена"
  btnCancelModal.addEventListener('click', () => {
    addModal.classList.remove('modal--active');
  });

  // Закрытие по клику на темную область вокруг окна
  window.addEventListener('click', (e) => {
    if (e.target === addModal) {
      addModal.classList.remove('modal--active');
    }
  });

  // Отправка кода по клику на кнопку
  btnSubmitCode.addEventListener('click', () => bindChildByCode(parentUuid));
}

// === 6. ЛОГИКА ВЫХОДА ИЗ СИСТЕМЫ ===
function initLogoutEvent() {
  logoutBtn.addEventListener('click', async () => {
    const { error } = await db.auth.signOut();
    
    if (error) {
      alert('Ошибка при выходе из системы: ' + error.message);
    } else {
      // Стираем временные данные сессии и отправляем на регистрацию
      localStorage.removeItem('activeChildId');
      window.location.href = '../auth/registration.html';
    }
  });
}

// === 7. ТОЧКА ВХОДА ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ===
document.addEventListener('DOMContentLoaded', async () => {
  // Проверяем авторизацию в Supabase
  const currentUser = await checkAuth();
  if (!currentUser) return; // Если не авторизован, выполнение прервется редиректом

  // Запускаем обработчики событий
  initModalEvents(currentUser.id);
  initLogoutEvent();

  // Выводим карточки детей, закрепленных за этим родителем в БД
  await renderChildren(currentUser.id);
});
