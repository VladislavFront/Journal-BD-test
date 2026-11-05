function getStudentInitials(fullName) {
  if (!fullName) return 'УЧ';
  const parts = fullName.trim().split(/\s+/);

  const firstLetter = parts[0] ? parts[0].charAt(0).toUpperCase() : '';
  const secondLetter = parts[1] ? parts[1].charAt(0).toUpperCase() : '';
  
  return firstLetter + secondLetter;
}

async function loadStudentProfile() {
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    alert('Пользователь не авторизован');
    window.location.href = "../../html/auth/registration.html"; 
    return;
  }

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

  const initials = getStudentInitials(profile.full_name);
  const classText = profile.classes
    ? `${profile.classes.number}${profile.classes.letter} класс` 
    : 'Класс не указан';

  document.querySelectorAll('.js-student-name').forEach(el => {
    el.textContent = profile.full_name;
  });

  document.querySelectorAll('.js-student-avatar').forEach(el => {
    el.textContent = initials;
  });

  document.querySelectorAll('.js-student-class').forEach(el => {
    el.textContent = classText;
  });

  document.querySelectorAll('.js-student-class-teacher').forEach(el => {
    const leadClass = profile.lead_class_name || 'Отсутствует';
    
    if (leadClass === 'Отсутствует') {
      el.textContent = ' Отсутствует';
    } else {
      const formattedClass = leadClass.replace(/^(\d+)([А-Яа-я])$/, '$1 $2');
      el.textContent = `${formattedClass} класса`;
    }
  });
}

document.addEventListener('DOMContentLoaded', loadStudentProfile);