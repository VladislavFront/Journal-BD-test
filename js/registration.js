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

cards.forEach((card, index) => {
  card.addEventListener('click', () => {

    forms.forEach(currentForm => currentForm.classList.remove('form_active'));
    forms[index].classList.add('form_active');
    
    roleCardsContainer.classList.add('role-card-container_disable');
  });
});

async function checkEmailExists(email) {
  const { data, error } = await db
    .from('profiles')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Ошибка проверки email:', error.message);
    return false;
  }
  return data !== null;
}

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
  return data ? data.id : null;
}

function setupSmartForm(formElement, roleName) {
  if (!formElement) return;

  let isEmailChecked = false;
  let accountExists = false;

  const classInput = formElement.querySelector('.js-class-input');
  if (classInput) {
    classInput.addEventListener('input', () => {
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

    if (!isEmailChecked) {
      if (!email) {
        alert('Пожалуйста, введите Email!');
        return;
      }

      if (roleName === 'student' && classInput) {
        const classValue = classInput.value.trim();

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
        if (classInput) classInput.disabled = true;
      } else {
        const label = formElement.querySelector('.password-label');
        if (label) label.textContent = 'Новый аккаунт! Придумайте пароль (от 6 символов)';
        submitBtn.textContent = 'Зарегистрироваться';
      }
      return;
    }

    const password = passwordInput.value;
    if (!password || password.length < 6) {
      alert('Пароль должен быть не менее 6 символов!');
      return;
    }

    submitBtn.disabled = true;

    if (accountExists) {
      submitBtn.textContent = 'Вход...';

      const { data: authData, error: signInError } = await db.auth.signInWithPassword({ email, password });

      if (signInError) {
        alert('Неверный пароль или ошибка входа: ' + signInError.message);
        submitBtn.disabled = false;
      } else {
        if (authData && authData.user) {
          await redirectUserByRole(authData.user.id);
        }
      }
    } else {
      if (!name) {
        alert('Для регистрации необходимо заполнить поле ФИО!');
        submitBtn.disabled = false;
        return;
      }

      let studentClassId = null;

      if (roleName === 'student' && classInput) {
        submitBtn.textContent = 'Поиск класса...';
        const classValue = classInput.value.trim();

        const match = classValue.match(/^(\d+)([А-Г])$/);

        if (match) {
          const num = match[1];
          const lettr = match[2]; 

          studentClassId = await getClassId(num, lettr);
        }

        if (!studentClassId) {
          alert(`Класс "${classValue}" не найден в справочнике школы! Проверьте, что вы добавили этот класс в таблицу classes в Supabase.`);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Зарегистрироваться';
          return;
        }
      }

      let teacherLeadClass = 'Отсутствует';
      let teacherSubject = 'Не указан';

      if (roleName === 'teacher') {
        const leadClassInput = formElement.querySelector('.teacher-homeroom') || formElement.querySelector('.js-class-input');

        if (leadClassInput && leadClassInput.value.trim() !== '') {
          teacherLeadClass = leadClassInput.value.trim().toUpperCase().replace(/\s/g, '');
        }

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
          await redirectUserByRole(authData.user.id);
        }

      }
    }
  });
}

async function redirectUserByRole(userId) {
  const { data: profile, error } = await db
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('Ошибка получения роли для редиректа:', error?.message);
    alert('Профиль пользователя не найден в базе данных.');
    return;
  }

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

document.addEventListener('DOMContentLoaded', () => {
  setupSmartForm(document.getElementById('form-parents'), 'parent');
  setupSmartForm(document.getElementById('form-student'), 'student');
  setupSmartForm(document.getElementById('form-teacher'), 'teacher');
});