function getParentInitials(fullName) {
  if (!fullName) return 'РД';
  const parts = fullName.trim().split(/\s+/);
  const firstLetter = parts[0] ? parts[0].charAt(0).toUpperCase() : '';
  const secondLetter = parts[1] ? parts[1].charAt(0).toUpperCase() : '';
  return firstLetter + secondLetter;
}

function formatChildNameToGenitive(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);

  const lastName = parts[0] || '';
  const firstName = parts[1] || '';
  
  if (!lastName) return fullName; 

  let genitiveFirstName = firstName;
  if (firstName.endsWith('а')) genitiveFirstName = firstName.slice(0, -1) + 'ы';
  else if (firstName.endsWith('я')) genitiveFirstName = firstName.slice(0, -1) + 'и';
  else if (/[бвгджзйклмнпрстфхцчшщ]$/i.test(firstName)) genitiveFirstName = firstName + 'а';

  let genitiveLastName = lastName;
  if (/[ов|ев|ин]$/i.test(lastName)) {
    genitiveLastName = lastName + 'а';
  } else if (/[ова|ева|ина]$/i.test(lastName)) {
    genitiveLastName = lastName.slice(0, -1) + 'ой';
  } else if (lastName.endsWith('ий')) {
    genitiveLastName = lastName.slice(0, -2) + 'ого'; 
  } else if (lastName.endsWith('ая')) {
    genitiveLastName = lastName.slice(0, -2) + 'ой'; 
  }
  return `${genitiveLastName} ${genitiveFirstName}`.trim();
}

async function initParentInterface() {

  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) {
    console.log('Родитель не авторизован');
    window.location.href = '../auth/registration.html';
    return;
  }

  const { data: parentProfile, error: parentError } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  if (parentError || !parentProfile) {
    console.error('Не удалось загрузить профиль родителя:', parentError?.message);
    return;
  }

  const activeChildId = localStorage.getItem('activeChildId');
  let statusText = 'Родитель (ученик не выбран)';

  if (activeChildId) {
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

  const parentInitials = getParentInitials(parentProfile.full_name);

  document.querySelectorAll('.js-parent-name').forEach(el => {
    el.textContent = parentProfile.full_name;
  });

  document.querySelectorAll('.js-parent-avatar').forEach(el => {
    el.textContent = parentInitials;
  });

  document.querySelectorAll('.js-parent-status').forEach(el => {
    el.textContent = statusText;
  });
}

document.addEventListener('DOMContentLoaded', initParentInterface);