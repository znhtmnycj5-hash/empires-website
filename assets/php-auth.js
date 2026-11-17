(function () {
  'use strict';

  const API = 'api/php-auth.php';
  let ready = null;
  let currentUser = null;
  let currentProfile = null;
  let csrfToken = '';

  async function request(action, options = {}) {
    const method = options.method || 'GET';
    const headers = { 'Accept': 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

    const url = API + '?action=' + encodeURIComponent(action) +
      (options.query ? '&' + new URLSearchParams(options.query).toString() : '');
    const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    let data;
    try { data = await response.json(); }
    catch (_) { throw new Error('Сервер вернул некорректный ответ.'); }

    if (data.csrf) csrfToken = data.csrf;
    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Не удалось выполнить запрос.');
    }
    return data;
  }

  function publish() {
    window.EMPIRE_AUTH_STATE = { user: currentUser, profile: currentProfile, client: null };
    document.dispatchEvent(new CustomEvent('empire:auth-changed', {
      detail: window.EMPIRE_AUTH_STATE
    }));
    updateHeader();
  }

  function accept(data) {
    const raw = data.user || null;
    currentUser = raw ? { id: raw.id, email: raw.email, status: raw.status || 'active' } : null;
    currentProfile = data.profile || raw?.profile || null;
    publish();
    return data;
  }

  function updateHeader() {
    const links = [
      document.querySelector('a.login'),
      document.getElementById('communityAuthButton')
    ].filter(Boolean);

    links.forEach(link => {
      if (currentUser) {
        link.textContent = '♙ Выйти из профиля';
        link.title = 'Выйти из профиля';
        link.dataset.authSignout = '1';
        link.href = '#';
      } else {
        link.textContent = '♙ Войти в сообщество';
        link.removeAttribute('data-auth-signout');
        link.removeAttribute('title');
        link.href = 'register.html';
      }
    });

    const cabinet = document.getElementById('personalCabinet');
    if (!cabinet) return;
    cabinet.hidden = !currentUser;
    if (!currentUser) return;

    const name = currentProfile?.display_name || 'Пользователь';
    const label = document.getElementById('cabinetName');
    if (label) label.textContent = name;
    const avatar = document.getElementById('cabinetAvatar');
    if (avatar && currentProfile?.avatar_url) avatar.src = currentProfile.avatar_url;
    const target = document.getElementById('cabinetProfileLink');
    if (target) target.href = 'profile.html?user=' + encodeURIComponent(name);
  }

  async function init() {
    if (!ready) {
      ready = request('me').then(data => {
        accept(data);
        return null;
      }).catch(error => {
        ready = null;
        throw error;
      });
    }
    await ready;
    return null;
  }

  async function signIn(email, password) {
    await init();
    const data = await request('login', {
      method: 'POST', body: { email: String(email).trim(), password }
    });
    accept(data);
  }

  async function signUp(email, password, displayName) {
    await init();
    const data = await request('register', {
      method: 'POST',
      body: { email: String(email).trim(), password, display_name: displayName }
    });
    accept(data);
    return { session: true, user: currentUser };
  }

  async function signOut() {
    await init();
    const data = await request('logout', { method: 'POST', body: {} });
    accept({ ...data, user: null, profile: null });
    ready = null;
  }

  async function checkNameAvailable(displayName) {
    await init();
    const data = await request('check_name', {
      query: { name: String(displayName || '').trim() }
    });
    return !!data.available && !!data.valid;
  }

  async function profilePatch(patch) {
    await init();
    const data = await request('profile_update', { method: 'POST', body: patch });
    accept(data);
    return currentProfile;
  }

  async function unsupported(feature) {
    throw new Error(feature + ' пока не перенесено на PHP. Эта функция будет подключена на следующем этапе миграции.');
  }

  window.EMPIRE_AUTH = {
    init,
    signIn,
    signUp,
    signOut,
    checkNameAvailable,
    profilePatch,
    resetPassword: () => unsupported('Восстановление пароля'),
    updatePassword: () => unsupported('Смена пароля'),
    uploadAvatar: () => unsupported('Загрузка аватара'),
    deleteAvatar: () => unsupported('Удаление аватара'),
    touchPresence: () => Promise.resolve(),
    deleteAccount: () => unsupported('Удаление аккаунта'),
    get user() { return currentUser; },
    get profile() { return currentProfile; },
    get client() { return null; }
  };

  document.addEventListener('click', async event => {
    const link = event.target.closest('[data-auth-signout]');
    if (!link) return;
    event.preventDefault();
    try {
      await signOut();
      location.reload();
    } catch (error) {
      alert(error.message || 'Не удалось выйти из аккаунта.');
    }
  });

  init().catch(error => console.error('Clanwars PHP auth:', error));
})();
