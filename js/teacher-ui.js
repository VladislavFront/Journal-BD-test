function getInitials(fullName) {
  if (!fullName) return 'УЧ';
  const parts = fullName.trim().split(/\s+/);

  const firstLetter = parts[0] ? parts[0][0].toUpperCase() : '';
  const secondLetter = parts[1] ? parts[1][0].toUpperCase() : '';
  
  return firstLetter + secondLetter;
}

function formatSubject(subject) {
  if (!subject || subject === 'Не указан') return 'Предмет не указан';
  return subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
}

async function loadTeacherProfile() {
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    alert('Пользователь не авторизован');
    window.location.href = "../../html/auth/registration.html"; 
    return;
  }

  const { data: profile, error: dbError } = await db
    .from('profiles')
    .select('full_name, subject, lead_class_name')
    .eq('id', user.id)
    .single();

  if (dbError || !profile) {
    console.error('Ошибка загрузки профиля учителя:', dbError?.message);
    return;
  }

  document.querySelectorAll('.js-teacher-name').forEach(el => {
    el.textContent = profile.full_name;
  });

  document.querySelectorAll('.js-teacher-avatar').forEach(el => {
    el.textContent = getInitials(profile.full_name);
  });

  document.querySelectorAll('.js-teacher-subject').forEach(el => {
    el.textContent = `${formatSubject(profile.subject)}`;
  });

  document.querySelectorAll('.js-teacher-lead').forEach(el => {
    const leadClass = profile.lead_class_name || 'Отсутствует';
    
    if (leadClass === 'Отсутствует') {
      el.textContent = ' Отсутствует';
    } else {
      const formattedClass = leadClass.replace(/^(\d+)([А-Яа-я])$/, '$1 $2');
      el.textContent = `${formattedClass} класса`;
    }
  });
}

document.addEventListener('DOMContentLoaded', loadTeacherProfile);