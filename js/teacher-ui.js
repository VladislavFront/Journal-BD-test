// === 1. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

// Генерация аватарки из ФИО (например, "Соколова Анастасия" -> "СА")
function getInitials(fullName) {
  if (!fullName) return 'УЧ';
  const parts = fullName.trim().split(/\s+/);
  
  // Берем первую букву первого слова и первую букву второго слова
  const firstLetter = parts[0] ? parts[0][0].toUpperCase() : '';
  const secondLetter = parts[1] ? parts[1][0].toUpperCase() : '';
  
  return firstLetter + secondLetter;
}

// Форматирование предмета (Делает первую букву заглавной)
function formatSubject(subject) {
  if (!subject || subject === 'Не указан') return 'Предмет не указан';
  return subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
}

// === 2. ОСНОВНАЯ ФУНКЦИЯ ЗАГРУЗКИ ПРОФИЛЯ ===
async function loadTeacherProfile() {
  // Получаем текущего авторизованного пользователя из Supabase
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    alert('Пользователь не авторизован');
    window.location.href = "../../html/auth/registration.html"; 
    return;
  }

  // Запрашиваем данные учителя из таблицы profiles
  const { data: profile, error: dbError } = await db
    .from('profiles')
    .select('full_name, subject, lead_class_name')
    .eq('id', user.id)
    .single();

  if (dbError || !profile) {
    console.error('Ошибка загрузки профиля учителя:', dbError?.message);
    return;
  }

  // === 3. РАСКЛАДЫВАЕМ ДАННЫЕ В ВЕРСТКУ ===
  
  // 1. Подставляем ФИО (в шапку и сайдбар)
  document.querySelectorAll('.js-teacher-name').forEach(el => {
    el.textContent = profile.full_name;
  });

  // 2. Генерируем и выводим инициалы для аватарки
  document.querySelectorAll('.js-teacher-avatar').forEach(el => {
    el.textContent = getInitials(profile.full_name);
  });

  // 3. Выводим отформатированный предмет
  document.querySelectorAll('.js-teacher-subject').forEach(el => {
    el.textContent = `${formatSubject(profile.subject)}`;
  });

  // 4. Выводим классное руководство
  document.querySelectorAll('.js-teacher-lead').forEach(el => {
    const leadClass = profile.lead_class_name || 'Отсутствует';
    
    if (leadClass === 'Отсутствует') {
      el.textContent = ' Отсутствует';
    } else {
      // Форматируем красиво под вашу верстку, например: "Классный руководитель: 9 А класса"
      // Добавляем пробел между цифрой и буквой, если строка длинная (например, "9А" -> "9 А")
      const formattedClass = leadClass.replace(/^(\d+)([А-Яа-я])$/, '$1 $2');
      el.textContent = `${formattedClass} класса`;
    }
  });
}

// Запускаем автоматическое заполнение при загрузке страницы
document.addEventListener('DOMContentLoaded', loadTeacherProfile);
