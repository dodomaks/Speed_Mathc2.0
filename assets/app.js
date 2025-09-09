// Shared app logic: theme, i18n loading, Firebase auth (minimal), leaderboard local storage.
// Firebase config provided by user
const firebaseConfig = {
  apiKey: "AIzaSyA-GxudNQc0C_rxs7VlSTdUd032bzn1sAg",
  authDomain: "speedmach-d5c2d.firebaseapp.com",
  projectId: "speedmach-d5c2d",
  storageBucket: "speedmach-d5c2d.firebasestorage.app",
  messagingSenderId: "988036223053",
  appId: "1:988036223053:web:227243e695aa4ee1fe0c04",
  measurementId: "G-BJ0CQNBC2T"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const LANGS = ["ru","en","zh","ja","de","fr","hi","cu"];
const LANG_NAMES = {"ru":"Русский","en":"English","zh":"简体中文","ja":"日本語","de":"Deutsch","fr":"Français","hi":"हिन्दी","cu":"Старославянский"};

const yearEl = document.getElementById("year");
if(yearEl) yearEl.textContent = new Date().getFullYear();

const storage = {
  get(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch(e){return d} },
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)) }
};

function applyTheme(theme){
  document.body.setAttribute("data-theme", theme);
  storage.set("sm:theme", theme);
}
function loadTheme(){
  const t = storage.get("sm:theme", "dark");
  applyTheme(t);
  const sel = document.getElementById("themeSelect");
  if(sel) sel.value = t;
}
function populateLangs(){
  const sel = document.getElementById("languageSelect");
  if(!sel) return;
  sel.innerHTML = LANGS.map(l=>`<option value="${l}">${LANG_NAMES[l]||l}</option>`).join("");
  sel.value = storage.get("sm:lang","ru");
}
async function loadI18n(lang){
  try{
    const res = await fetch(`lang/${lang}.json`);
    const data = await res.json();
    document.querySelectorAll("[data-i18n]").forEach(el=>{
      const key = el.getAttribute("data-i18n");
      if(data[key]) el.textContent = data[key];
    });
  }catch(e){}
}

function initSettingsModal(){
  const openBtns = document.querySelectorAll("#openSettings, #openSettingsPow, #openSettingsMul, #openSettingsFrac, #openSettingsSnake, #openSettingsFooter");
  openBtns.forEach(b=>b && b.addEventListener("click", ()=> {
    const modal = document.getElementById("settingsModal");
    if(modal) modal.classList.add("show");
  }));
  const close = document.getElementById("closeSettings");
  if(close) close.addEventListener("click", ()=> document.getElementById("settingsModal").classList.remove("show"));
  const save = document.getElementById("saveSettings");
  if(save) save.addEventListener("click", ()=> {
    const lang = document.getElementById("languageSelect").value;
    const theme = document.getElementById("themeSelect").value;
    storage.set("sm:lang", lang);
    applyTheme(theme);
    document.getElementById("settingsModal").classList.remove("show");
    loadI18n(lang);
  });
}

function initAuthButtons(){
  const authBtn = document.getElementById("authBtn");
  const authBtnModal = document.getElementById("authBtnModal");
  const signOutBtn = document.getElementById("signOutBtn");
  const userInfo = document.getElementById("userInfo") || document.getElementById("userInfoPow") || document.getElementById("userInfoMul");
  if(authBtn) authBtn.addEventListener("click", ()=> toggleSign());
  if(authBtnModal) authBtnModal.addEventListener("click", ()=> toggleSign());
  if(signOutBtn) signOutBtn.addEventListener("click", async ()=> {
    await signOut(auth);
    alert("Вы вышли");
  });

  onAuthStateChanged(auth, async (user)=>{
    const uels = document.querySelectorAll(".user-info");
    uels.forEach(el=> el.textContent = user ? (user.displayName || "User") : "Гость" );
    if(user){
      // ensure user doc minimal
      try{
        const userDoc = doc(db, "users", user.uid);
        const snap = await getDoc(userDoc);
        if(!snap.exists()){
          await setDoc(userDoc, { uid:user.uid, displayName:user.displayName||"", createdAt: Date.now() });
        }
      }catch(e){}
    }
    // change auth button labels
    const allAuthBtns = document.querySelectorAll("#authBtn, #authBtnModal");
    allAuthBtns.forEach(b=>{ if(user) b.textContent = "Выйти"; else b.textContent = "Войти через Google"; });
  });

  async function toggleSign(){
    if(auth.currentUser) await signOut(auth);
    else{
      try{
        await signInWithPopup(auth, provider);
      }catch(e){
        alert("Ошибка авторизации: "+(e.message||e));
      }
    }
  }
}

function loadLeaderTable(){
  const tbl = document.querySelector("#bestTable tbody");
  if(!tbl) return;
  const data = storage.get("sm:scores", {});
  tbl.innerHTML = "";
  const mode = document.getElementById("bestModeSelect")?.value || "pow";
  // show rows for mode (from local storage)
  if(mode === "pow"){
    const diffNames = ["Очень лёгкая","Лёгкая","Средняя","Сложная","Очень сложная","Невозможная"];
    diffNames.forEach((dn,idx)=>{
      const v = data?.pow?.[idx] ?? "-";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>Возведение</td><td>${dn}</td><td class="mono">${v?.best ?? '-'}</td><td>${v?.user ?? '-'}</td>`;
      tbl.appendChild(tr);
    });
  }else{
    // generic
    const arr = data?.[mode] || [];
    if(arr.length === 0){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="4" class="muted">Нет записей</td>`;
      tbl.appendChild(tr);
    }else{
      arr.forEach((v,idx)=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${mode}</td><td>${v?.difficulty ?? idx}</td><td class="mono">${v?.best ?? '-'}</td><td>${v?.user ?? '-'}</td>`;
        tbl.appendChild(tr);
      });
    }
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  populateLangs();
  loadTheme();
  const lang = storage.get("sm:lang","ru");
  loadI18n(lang);
  initSettingsModal();
  initAuthButtons();
  loadLeaderTable();
  document.getElementById("bestModeSelect")?.addEventListener("change", loadLeaderTable);
});
