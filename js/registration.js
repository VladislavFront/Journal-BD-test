// Собираем элементы в массивы в одинаковом порядке
const cards = [
  document.getElementById('role-parents'),
  document.getElementById('role-student'),
  document.getElementById('role-teacher')
];

const forms = [
  document.getElementById('form-parents'),
  document.getElementById('form-student'),
  document.getElementById('form-teacher')
];

const roleCardsContainer = document.getElementById('role-card-container');

// Навешиваем обработчик в цикле
cards.forEach((card, index) => {
  card.addEventListener('click', () => {
    // 1. Сначала у всех снимаем активные классы
    // cards.forEach(currentCard => currentCard.classList.remove('role-card_active'));
    forms.forEach(currentForm => currentForm.classList.remove('form_active'));

    // 2. Включаем только у того, по кому кликнули (по индексу)
    // card.classList.add('role-card_active');
    forms[index].classList.add('form_active');
    
    roleCardsContainer.classList.add('role-card-container_disable');
  });
});

// 2. СИСТЕМНАЯ ФУНКЦИЯ ПРОВЕРКИ EMAIL В БАЗЕ
async function checkEmailExists(email) {
  const { data, error } = await db
    .from('profiles')
    .select('email')
    .eq('email', email)
    .maybeSingle(); // Ищет одну запись, если нет — вернет null без генерации ошибок

  if (error) {
    console.error('Ошибка проверки email:', error.message);
    return false;
  }
  return data !== null; // Вернет true, если почта найдена, и false, если её нет
}

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОИСКА ID КЛАССА ---
async function getClassId(number, letter) {
  const { data, error } = await db
    .from('classes')
    .select('id')
    .eq('number', parseInt(number))
    .eq('letter', letter.toUpperCase())
    .maybeSingle();

  if (error) {
    console.error('Ошибка поиска класса:', error.message);
    return null;
  }
  return data ? data.id : null; // Возвращает ID или null, если такого класса нет в справочнике
}

// --- ОБНОВЛЕННЫЙ НАСТРОЙЩИК СМАРТ-ФОРМЫ ---
function setupSmartForm(formElement, roleName) {
  if (!formElement) return;

  let isEmailChecked = false;
  let accountExists = false;

  // Живая маска ввода для поля класса (если оно есть в форме)
  const classInput = formElement.querySelector('.js-class-input');
  if (classInput) {
    classInput.addEventListener('input', () => {
      // 1. Просто переводим в верхний регистр и убираем пробелы. 
      // Ничего НЕ блокируем, давая пользователю спокойно допечатать строку!
      classInput.value = classInput.value.toUpperCase().replace(/\s/g, '');
    });
  }


  formElement.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = formElement.querySelector('.js-name');
    const emailInput = formElement.querySelector('.js-email');
    const passwordWrapper = formElement.querySelector('.js-password-wrapper');
    const passwordInput = formElement.querySelector('.reg-password');
    const submitBtn = formElement.querySelector('button[type="submit"]') || formElement.querySelector('.submit-btn');

    const email = emailInput ? emailInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';

    // ШАГ А: Первое нажатие — Проверка почты и валидация класса
    if (!isEmailChecked) {
      if (!email) {
        alert('Пожалуйста, введите Email!');
        return;
      }

      // Если регистрируется ученик, строго проверяем класс перед отправкой запросов
      if (roleName === 'student' && classInput) {
        const classValue = classInput.value.trim();
        
        // Регулярное выражение: число от 1 до 11 и буква от А до Г
        const classRegex = /^(1[0-1]|[1-9])[А-Г]$/;
        
        if (!classRegex.test(classValue)) {
          alert('Неверный формат класса! Используйте цифру от 1 до 11 и русскую букву от А до Г (например: 5А, 11Б, 10Г).');
          return;
        }
      }

      submitBtn.textContent = 'Проверка...';
      submitBtn.disabled = true;

      accountExists = await checkEmailExists(email);
      isEmailChecked = true;

      if (passwordWrapper) {
        passwordWrapper.style.setProperty('display', 'block', 'important');
      }
      if (passwordInput) passwordInput.required = true;
      submitBtn.disabled = false;

      if (accountExists) {
        const label = formElement.querySelector('.password-label');
        if (label) label.textContent = 'Аккаунт найден! Введите пароль для входа';
        submitBtn.textContent = 'Войти';
        if (nameInput) nameInput.disabled = true;
        if (emailInput) emailInput.disabled = true;
        if (classInput) classInput.disabled = true; // Блокируем класс при входе
      } else {
        const label = formElement.querySelector('.password-label');
        if (label) label.textContent = 'Новый аккаунт! Придумайте пароль (от 6 символов)';
        submitBtn.textContent = 'Зарегистрироваться';
      }
      return;
    }

    // ШАГ Б: Второе нажатие — Регистрация или Вход
    const password = passwordInput.value;
    if (!password || password.length < 6) {
      alert('Пароль должен быть не менее 6 символов!');
      return;
    }

    submitBtn.disabled = true;

    if (accountExists) {
      // --- ВХОД ---
      submitBtn.textContent = 'Вход...';
      
      // ДОБАВИЛИ data: authData в деструктуризацию ответа
      const { data: authData, error: signInError } = await db.auth.signInWithPassword({ email, password });

      if (signInError) {
        alert('Неверный пароль или ошибка входа: ' + signInError.message);
        submitBtn.disabled = false;
      } else {
        // Теперь authData гарантированно существует и редирект сработает без ошибок
        if (authData && authData.user) {
          await redirectUserByRole(authData.user.id);
        }
      }
    } else {
      // --- РЕГИСТРАЦИЯ ---
      if (!name) {
        alert('Для регистрации необходимо заполнить поле ФИО!');
        submitBtn.disabled = false;
        return;
      }

      let studentClassId = null;

      if (roleName === 'student' && classInput) {
        submitBtn.textContent = 'Поиск класса...';
        const classValue = classInput.value.trim();
        
        // Разделяем строку на число и букву (первая скобка — цифры, вторая — буквы А-Г)
        const match = classValue.match(/^(\d+)([А-Г])$/);

        if (match) {
          // Объявляем переменные и вытаскиваем чистые данные по индексам массива совпадений
          const num = match[1];   // Извлечет число, например "5"
          const lettr = match[2]; // Извлечет букву, например "А"

          // Передаем их в функцию поиска
          studentClassId = await getClassId(num, lettr);
        }

        if (!studentClassId) {
          alert(`Класс "${classValue}" не найден в справочнике школы! Проверьте, что вы добавили этот класс в таблицу classes в Supabase.`);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Зарегистрироваться';
          return;
        }
      }


      // --- НОВАЯ ЛОГИКА: Сбор данных учителя (Предмет и Руководство) ---
      let teacherLeadClass = 'Отсутствует';
      let teacherSubject = 'Не указан';

      if (roleName === 'teacher') {
        // 1. Сбор класса под руководством (ищем строго по классу)
        const leadClassInput = formElement.querySelector('.teacher-homeroom') || formElement.querySelector('.js-class-input');

        if (leadClassInput && leadClassInput.value.trim() !== '') {
          teacherLeadClass = leadClassInput.value.trim().toUpperCase().replace(/\s/g, '');
        }

        // 2. Сбор предмета из тега select
        const subjectSelect = formElement.querySelector('select');
        if (subjectSelect && subjectSelect.value !== '') {
          const selectedOption = subjectSelect.options[subjectSelect.selectedIndex];
          teacherSubject = selectedOption.textContent.trim();
        }
      }


      submitBtn.textContent = 'Регистрация...';
      const { data: authData, error: authError } = await db.auth.signUp({ email, password });

      if (authError) {
        alert('Ошибка при создании аккаунта: ' + authError.message);
        submitBtn.disabled = false;
        return;
      }

      if (authData.user) {
        const { error: profileError } = await db.from('profiles').insert([
          {
            id: authData.user.id,
            full_name: name,
            email: email,
            role: roleName,
            class_id: studentClassId,
            subject: roleName === 'teacher' ? teacherSubject : null,
            lead_class_name: roleName === 'teacher' ? teacherLeadClass : null
          }
        ]);


        if (profileError) {
          console.error('Ошибка создания профиля:', profileError.message);
          alert('Аккаунт создан, но профиль роли не сохранился: ' + profileError.message);
          submitBtn.disabled = false;
        } else {
          // ЗАМЕНЯЕМ СТАРЫЙ АЛЕРТ НА УМНЫЙ РЕДИРЕКТ ПОСЛЕ РЕГИСТРАЦИИ:
          await redirectUserByRole(authData.user.id);
        }

      }
    }
  });
}

// --- ФУНКЦИЯ ОПРЕДЕЛЕНИЯ РОЛИ И РЕДИРЕКТА ---
async function redirectUserByRole(userId) {
  // Запрашиваем роль пользователя из таблицы profiles
  const { data: profile, error } = await db
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single(); // Нам нужна строго одна строка

  if (error || !profile) {
    console.error('Ошибка получения роли для редиректа:', error?.message);
    alert('Профиль пользователя не найден в базе данных.');
    return;
  }

  // Распределяем по папкам в зависимости от роли (подставьте ваши точные пути к HTML-файлам)
  switch (profile.role) {
    case 'teacher':
      window.location.href = '../../html/teacher/journal.html';
      break;
    case 'student':
      window.location.href = '../../html/student/student.html';
      break;
    case 'parent':
      window.location.href = '../../html/parent/select-child.html';
      break;
    default:
      alert('Неизвестная роль пользователя!');
      window.location.reload();
  }
}

// --- 4. ЗАПУСК ИНИЦИАЛИЗАЦИИ ДЛЯ ВСЕХ ФОРМ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
document.addEventListener('DOMContentLoaded', () => {
  setupSmartForm(document.getElementById('form-parents'), 'parent');
  setupSmartForm(document.getElementById('form-student'), 'student');
  setupSmartForm(document.getElementById('form-teacher'), 'teacher');
});