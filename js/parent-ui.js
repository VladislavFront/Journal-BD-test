// === 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ГЕНЕРАЦИИ ===

// Генерация аватарки родителя из его ФИО (например, "Иванов Игорь" -> "ИИ")
function getParentInitials(fullName) {
  if (!fullName) return 'РД';
  const parts = fullName.trim().split(/\s+/);
  const firstLetter = parts[0] ? parts[0].charAt(0).toUpperCase() : '';
  const secondLetter = parts[1] ? parts[1].charAt(0).toUpperCase() : '';
  return firstLetter + secondLetter;
}

// Склонение Фамилии и Имени ребёнка в родительный падеж (Фамилия Имя)
function formatChildNameToGenitive(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  
  // Чаще всего в базе лежит формат: Фамилия Имя Отчество
  const lastName = parts[0] || '';
  const firstName = parts[1] || '';
  
  if (!lastName) return fullName; // Фолбэк, если строка пустая

  // 1. СКЛОНЕНИЕ ИМЕНИ
  let genitiveFirstName = firstName;
  if (firstName.endsWith('а')) genitiveFirstName = firstName.slice(0, -1) + 'ы';      // Анастасия -> Анастасии, Маша -> Маши
  else if (firstName.endsWith('я')) genitiveFirstName = firstName.slice(0, -1) + 'и'; // Мария -> Марии, Настя -> Насти
  else if (/[бвгджзйклмнпрстфхцчшщ]$/i.test(firstName)) genitiveFirstName = firstName + 'а'; // Иван -> Ивана, Максим -> Максима

  // 2. СКЛОНЕНИЕ ФАМИЛИИ
  let genitiveLastName = lastName;
  if (/[ов|ев|ин]$/i.test(lastName)) {
    genitiveLastName = lastName + 'а'; // Петров -> Петрова, Ильин -> Ильина
  } else if (/[ова|ева|ина]$/i.test(lastName)) {
    genitiveLastName = lastName.slice(0, -1) + 'ой'; // Петрова -> Петровой, Ильина -> Ильиной
  } else if (lastName.endsWith('ий')) {
    genitiveLastName = lastName.slice(0, -2) + 'ого'; // Покровский -> Покровского
  } else if (lastName.endsWith('ая')) {
    genitiveLastName = lastName.slice(0, -2) + 'ой'; // Покровская -> Покровской
  }
  // Фамилии на -о, -их, -ых, -ко (Шевченко, Белых) в русском языке не склоняются, оставляем как есть

  // Возвращаем результат: Фамилия + Имя в родительном падеже
  return `${genitiveLastName} ${genitiveFirstName}`.trim();
}

// === 2. ОСНОВНАЯ ФУНКЦИЯ ЗАПОЛНЕНИЯ ИНТЕРФЕЙСА ===
async function initParentInterface() {
  // А. Получаем текущую сессию родителя из Supabase Auth
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    console.log('Родитель не авторизован');
    window.location.href = '../auth/registration.html';
    return;
  }

  // Б. Запрашиваем ФИО родителя из таблицы profiles
  const { data: parentProfile, error: parentError } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  if (parentError || !parentProfile) {
    console.error('Не удалось загрузить профиль родителя:', parentError?.message);
    return;
  }

  // В. АВТООПРЕДЕЛЕНИЕ РЕБЕНКА ИЗ LOCALSTORAGE
  const activeChildId = localStorage.getItem('activeChildId');
  let statusText = 'Родитель (ученик не выбран)';

  if (activeChildId) {
    // Делаем точечный запрос в бэкенд за именем конкретно этого выбранного ученика
    const { data: childProfile, error: childError } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', activeChildId)
      .single();

    if (!childError && childProfile) {
      const genitiveName = formatChildNameToGenitive(childProfile.full_name);
      statusText = `Родитель: ${genitiveName}`;
    } else {
      console.error('Выбранный ребенок не найден в базе данных');
    }
  }

  // Г. РАСКЛАДЫВАЕМ ДАННЫЕ В ВЕРСТКУ
  const parentInitials = getParentInitials(parentProfile.full_name);

  // Выводим имя родителя
  document.querySelectorAll('.js-parent-name').forEach(el => {
    el.textContent = parentProfile.full_name;
  });

  // Выводим аватарку родителя
  document.querySelectorAll('.js-parent-avatar').forEach(el => {
    el.textContent = parentInitials;
  });

  // Выводим статус привязанного ребенка
  document.querySelectorAll('.js-parent-status').forEach(el => {
    el.textContent = statusText;
  });
}

// Запуск логики при загрузке страницы
document.addEventListener('DOMContentLoaded', initParentInterface);
