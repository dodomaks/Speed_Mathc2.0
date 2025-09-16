let currentLang = 'ru';
const translations = {};
const langList = ['ru','en','zh','ja','de','fr','hi','cu'];

async function loadLang(lang) {
  const res = await fetch(`lang/${lang}.json`);
  translations[lang] = await res.json();
  currentLang = lang;
  updateTexts();
}

function updateTexts() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang] && translations[currentLang][key]) {
      el.innerText = translations[currentLang][key];
    }
  });
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('settingsModal').classList.remove('hidden');
});
function closeSettings() {
  document.getElementById('settingsModal').classList.add('hidden');
}
document.getElementById('themeToggle').addEventListener('change', (e) => {
  document.body.className = e.target.value;
  localStorage.setItem('theme', e.target.value);
});

function startGame(mode) {
  alert("Запуск игры: " + mode);
}

// Firebase auth
async function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch(e) { console.error(e); }
}
async function logout() {
  await firebase.auth().signOut();
}

window.onload = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) document.body.className = savedTheme;
  const langSelect = document.getElementById('languageSelect');
  langList.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l; opt.textContent = l;
    langSelect.appendChild(opt);
  });
  langSelect.value = currentLang;
  langSelect.addEventListener('change', e => loadLang(e.target.value));
  loadLang(currentLang);
};
