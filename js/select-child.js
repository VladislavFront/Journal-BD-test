const childrenGrid = document.getElementById('children-container');
const addChildBtn = document.getElementById('addChildBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addModal = document.getElementById('addModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnSubmitCode = document.getElementById('btnSubmitCode');
const childCodeInput = document.getElementById('childCodeInput');

async function renderChildren(parentUuid) {
  const existingCards = childrenGrid.querySelectorAll('.child-card:not(.add-card)');
  existingCards.forEach(card => card.remove());

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

  relations.forEach(item => {
    const student = item.profiles;
    if (!student) return; 

    const classText = student.classes 
      ? `${student.classes.number}${student.classes.letter}` 
      : '—';

    const card = document.createElement('div');
    card.className = 'child-card';
    card.innerHTML = `
        <div class="child-avatar">👨‍🎓</div>
        <div class="child-name">${student.full_name}</div>
        <div class="child-class">${classText} класс</div>
    `;

    card.addEventListener('click', () => {
      localStorage.setItem('activeChildId', item.child_id);
      window.location.href = 'student.html'; 
    });

    childrenGrid.insertBefore(card, addChildBtn);
  });
}

async function bindChildByCode(parentUuid) {
  const code = childCodeInput.value.trim();
  
  if (!code) {
    alert('Пожалуйста, введите уникальный код ребенка!');
    return;
  }

  btnSubmitCode.disabled = true;
  btnSubmitCode.textContent = 'Проверка...';

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

  if (childProfile.role !== 'student') {
    alert(`Ошибка! Этот код принадлежит пользователю с ролью "${childProfile.role}". Можно привязывать только учеников.`);
    btnSubmitCode.disabled = false;
    btnSubmitCode.textContent = 'Привязать';
    return;
  }

  const { error: insertError } = await db
    .from('parent_children')
    .insert([
      { parent_id: parentUuid, child_id: code }
    ]);

  if (insertError) {
    if (insertError.code === '23505') {
      alert('Этот ребенок уже привязан к вашему аккаунту!');
    } else {
      alert('Не удалось привязать ребенка: ' + insertError.message);
    }
    btnSubmitCode.disabled = false;
    btnSubmitCode.textContent = 'Привязать';
    return;
  }

  alert(`Ребенок ${childProfile.full_name} успешно привязан навсегда!`);

  addModal.classList.remove('modal--active');
  btnSubmitCode.disabled = false;
  btnSubmitCode.textContent = 'Привязать';

  await renderChildren(parentUuid);
}

function initModalEvents(parentUuid) {
  addChildBtn.addEventListener('click', () => {
    addModal.classList.add('modal--active');
    childCodeInput.value = '';
    setTimeout(() => childCodeInput.focus(), 100);
  });

  btnCancelModal.addEventListener('click', () => {
    addModal.classList.remove('modal--active');
  });

  window.addEventListener('click', (e) => {
    if (e.target === addModal) {
      addModal.classList.remove('modal--active');
    }
  });

  btnSubmitCode.addEventListener('click', () => bindChildByCode(parentUuid));
}

function initLogoutEvent() {
  logoutBtn.addEventListener('click', async () => {
    const { error } = await db.auth.signOut();
    
    if (error) {
      alert('Ошибка при выходе из системы: ' + error.message);
    } else {
      localStorage.removeItem('activeChildId');
      window.location.href = '../auth/registration.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = await checkAuth();
  if (!currentUser) return; 

  initModalEvents(currentUser.id);
  initLogoutEvent();

  await renderChildren(currentUser.id);
});
