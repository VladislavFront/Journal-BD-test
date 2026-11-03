// Генерация инициалов из ФИО (например, "Соколова Анастасия Михайловна" -> "СА")
function getStudentInitials(fullName) {
  if (!fullName) return 'УЧ';
  const parts = fullName.trim().split(/\s+/);
  
  // Берем первую букву фамилии и первую букву имени
  const firstLetter = parts[0] ? parts[0].charAt(0).toUpperCase() : '';
  const secondLetter = parts[1] ? parts[1].charAt(0).toUpperCase() : '';
  
  return firstLetter + secondLetter;
}

// === 2. ОСНОВНАЯ ФУНКЦИЯ ЗАГРУЗКИ ПРОФИЛЯ
async function loadStudentProfile() {
  // Получаем текущего авторизованного пользователя из Supabase
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    alert('Пользователь не авторизован');
    window.location.href = "../../html/auth/registration.html"; 
    return;
  }

  // Запрашиваем данные родителя из таблицы profiles
  const { data: profile, error: dbError } = await db
    .from('profiles')
    .select(`
      full_name,
      classes:class_id (
        number,
        letter
      )
    `)
    .eq('id', user.id)
    .single();

  if (dbError || !profile) {
    console.error('Ошибка загрузки профиля ученика:', dbError?.message);
    return;
  }

  // 3. Формируем текстовые значения
  const initials = getStudentInitials(profile.full_name);
  const classText = profile.classes
    ? `${profile.classes.number}${profile.classes.letter} класс` 
    : 'Класс не указан';
  

  // 4. Подставляем данные во все элементы на странице по классам-маркерам
  // 1. Подставляем ФИО (в шапку и сайдбар)
  document.querySelectorAll('.js-student-name').forEach(el => {
    el.textContent = profile.full_name;
  });

  // 2. Генерируем и выводим инициалы для аватарки
  document.querySelectorAll('.js-student-avatar').forEach(el => {
    el.textContent = initials;
  });

  // 3. Генерируем и выводим класс
  document.querySelectorAll('.js-student-class').forEach(el => {
    el.textContent = classText;
  });

  // 4. Выводим классное руководство
  document.querySelectorAll('.js-student-class-teacher').forEach(el => {
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
document.addEventListener('DOMContentLoaded', loadStudentProfile);