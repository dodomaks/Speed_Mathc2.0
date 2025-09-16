// Main application (ES module)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyA-GxudNQc0C_rxs7VlSTdUd032bzn1sAg",
  authDomain: "speedmach-d5c2d.firebaseapp.com",
  projectId: "speedmach-d5c2d",
  storageBucket: "speedmach-d5c2d.firebasestorage.app",
  messagingSenderId: "988036223053",
  appId: "1:988036223053:web:227243e695aa4ee1fe0c04",
  measurementId: "G-BJ0CQNBC2T"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Languages
const LANGS = ['ru','en','zh','ja','de','fr','hi','cu'];
let translations = {};
let currentLang = localStorage.getItem('lang') || 'ru';
let theme = localStorage.getItem('theme') || 'dark';
let currentUser = null;

// Modes config
const MODES = [
  { id:'exp', titleKey:'exp_title', descKey:'exp_desc', difficulties: [
      {id:'very_easy', label:'Очень лёгкая', config:{baseMin:1,baseMax:10,powMax:2,time:60}},
      {id:'easy', label:'Лёгкая', config:{baseMin:1,baseMax:10,powMax:3,time:60}},
      {id:'medium', label:'Средняя', config:{baseMin:1,baseMax:10,powMax:3,time:60}},
      {id:'hard', label:'Сложная', config:{baseMin:10,baseMax:20,powMax:2,time:60}},
      {id:'very_hard', label:'Очень сложная', config:{baseMin:10,baseMax:100,powMax:2,time:60}},
      {id:'impossible', label:'Невозможная', config:{baseMin:20,baseMax:99,powMax:3,time:120}},
    ]},
  { id:'mul', titleKey:'mul_title', descKey:'mul_desc', difficulties:[
      {id:'easy', label:'Легко', config:{aDigits:1,bDigits:1,time:20}},
      {id:'medium', label:'Средне', config:{aDigits:2,bDigits:2,time:30}},
      {id:'hard', label:'Сложно', config:{aDigits:3,bDigits:3,time:60}},
    ]},
  { id:'frac', titleKey:'frac_title', descKey:'frac_desc', difficulties:[
      {id:'easy', label:'Лёгкая', config:{aDigitsRange:[1,2],bRange:[1,9],time:20}},
      {id:'medium', label:'Средняя', config:{aDigitsRange:[2,3],bRange:[3,10],time:30}},
      {id:'hard', label:'Сложная', config:{aDigitsRange:[3,5],bRange:[2,999],time:60}},
    ]},
  { id:'infinite', titleKey:'infinite_desc', descKey:'infinite_desc', difficulties:[{id:'inf',label:'∞',config:{infinite:true,time:9999}}] }
];

// Utils
function el(sel, ctx=document){ return ctx.querySelector(sel); }
function create(tag, cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }

async function loadAllLangs(){
  await Promise.all(LANGS.map(async l => {
    const r = await fetch(`lang/${l}.json`);
    translations[l] = await r.json();
  }));
}

function t(key){
  return (translations[currentLang] && translations[currentLang][key]) || key;
}

function applyTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(elm=>{
    const key = elm.getAttribute('data-i18n');
    if(key) elm.textContent = t(key);
  });
  const ls = el('#langSelect');
  if(ls) ls.value = currentLang;
}

function applyTheme(){
  const app = document.getElementById('app');
  if(theme==='light') app.classList.add('theme-light'); else app.classList.remove('theme-light');
  localStorage.setItem('theme', theme);
}

// UI build
function buildModeCards(){
  const container = el('.modes');
  container.innerHTML = '';
  const tpl = el('#cardTpl');
  MODES.forEach(mode=>{
    const node = tpl.content.cloneNode(true);
    const card = node.querySelector('.mode-card');
    card.dataset.mode = mode.id;
    card.querySelector('.mode-title').textContent = t(mode.titleKey) || mode.id;
    card.querySelector('.mode-desc').textContent = t(mode.descKey) || '';
    const sel = card.querySelector('.difficulty');
    mode.difficulties.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id; opt.textContent = d.label;
      sel.appendChild(opt);
    });
    const start = card.querySelector('.startBtn');
    start.addEventListener('click', ()=> startGame(mode.id, sel.value));
    container.appendChild(card);
  });
}

// Game engine
class Game {
  constructor(modeId, diffId){
    this.modeId = modeId; this.diffId = diffId;
    this.mode = MODES.find(m=>m.id===modeId);
    this.diff = this.mode.difficulties.find(d=>d.id===diffId) || this.mode.difficulties[0];
    this.correct = 0; this.timeLeft = this.diff.config.time || 60;
    this.elapsed = 0; this.active = false; this.currentAnswer = null;
  }

  start(){
    this.renderScreen();
    this.active = true;
    this.tickInterval = setInterval(()=> this.tick(), 1000);
    this.nextQuestion();
  }

  stop(){
    clearInterval(this.tickInterval);
    this.active = false;
  }

  tick(){
    this.timeLeft--; this.elapsed++;
    const timerEl = el('.game-screen .timer');
    if(timerEl) timerEl.textContent = formatTime(this.timeLeft);
    if(this.timeLeft<=0){
      this.end();
    }
  }

  nextQuestion(){
    const qEl = el('.game-screen .question');
    if(this.modeId==='exp'){
      const cfg = this.diff.config;
      const b = randInt(cfg.baseMin||1, cfg.baseMax||10);
      const p = Math.min(cfg.powMax||2, 4);
      const pow = (cfg.powMax>2 && Math.random()<0.3)?3:2;
      qEl.textContent = `${b}^${pow}`;
      this.currentAnswer = Math.pow(b,pow);
    } else if(this.modeId==='mul'){
      const cfg = this.diff.config;
      const a = randDigits(cfg.aDigits||1);
      const b = randDigits(cfg.bDigits||1);
      qEl.textContent = `${a} × ${b}`;
      this.currentAnswer = a*b;
    } else if(this.modeId==='frac'){
      const cfg = this.diff.config;
      // produce divisible pair
      const b = randInt(cfg.bRange ? cfg.bRange[0] : 2, cfg.bRange ? cfg.bRange[1] : 9);
      const times = randInt(1, Math.pow(10,(cfg.aDigitsRange?cfg.aDigitsRange[0]:2)));
      const a = b * randInt(1,10);
      qEl.textContent = `${a} ÷ ${b}`;
      this.currentAnswer = a/b;
    } else {
      // infinite fallback: simple multiplication
      const a = randInt(1,12);
      const b = randInt(1,12);
      qEl.textContent = `${a} × ${b}`;
      this.currentAnswer = a*b;
    }
    const input = el('.game-screen .answer');
    if(input){ input.value=''; input.focus(); }
  }

  submitAnswer(val){
    if(!this.active) return;
    if(val==='' || val==null) return;
    const got = Number(val);
    if(Number.isNaN(got)) return;
    if(got === this.currentAnswer){
      this.correct++;
      el('.game-screen .correct').textContent = String(this.correct);
      el('.game-screen .feedback').textContent = t('correct') || 'Правильно';
      this.nextQuestion();
    } else {
      el('.game-screen .feedback').textContent = (t('wrong')||'Неверно') + ' ' + this.currentAnswer;
    }
  }

  end(){
    this.stop();
    showResult(this);
    // try save score to Firestore if authed
    if(currentUser){
      saveScore({uid:currentUser.uid, name: currentUser.displayName||currentUser.email, score:this.correct, mode:this.modeId});
    } else {
      // Save to local leaderboard
      addLocalScore({name:'guest', score:this.correct, mode:this.modeId});
    }
  }
}

// helpers
function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function randDigits(d){ const min = Math.pow(10,d-1); const max = Math.pow(10,d)-1; return randInt(min, max); }
function formatTime(s){ const mm = Math.floor(s/60).toString().padStart(2,'0'); const ss = (s%60).toString().padStart(2,'0'); return mm+':'+ss; }

// UI: start game
let currentGame = null;
function startGame(modeId, diffId){
  // render game template
  const tpl = el('#gameTpl');
  const node = tpl.content.cloneNode(true);
  const container = el('#gameContainer');
  container.innerHTML = '';
  container.appendChild(node);
  el('.game-screen .question').textContent = '?';
  el('.game-screen .correct').textContent = '0';
  // wire buttons
  el('.backBtn').addEventListener('click', ()=> { container.innerHTML=''; });
  el('.game-screen .answer').addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){ currentGame.submitAnswer(e.target.value.trim()); }
  });
  el('.settingsInGame').addEventListener('click', ()=> openSettings());

  currentGame = new Game(modeId, diffId);
  currentGame.start();
}

// result screen
function showResult(game){
  const tpl = el('#resultTpl');
  const node = tpl.content.cloneNode(true);
  node.querySelector('.res-correct').textContent = (t('correct_answers')||'Правильных') + ': ' + game.correct;
  node.querySelector('.res-time').textContent = (t('time_spent')||'Время') + ': ' + game.elapsed + 's';
  node.querySelector('.res-answer').textContent = '';
  const container = el('#gameContainer');
  container.innerHTML = '';
  container.appendChild(node);
  node.querySelector('.restart').addEventListener('click', ()=> startGame(game.modeId, game.diffId));
  node.querySelector('.toMenu').addEventListener('click', ()=> { container.innerHTML=''; });
}

// leaderboard (local fallback)
function addLocalScore(obj){
  const ls = JSON.parse(localStorage.getItem('local_scores')||'[]');
  ls.push({...obj, ts: Date.now()});
  ls.sort((a,b)=>b.score-a.score);
  localStorage.setItem('local_scores', JSON.stringify(ls.slice(0,50)));
  renderLeaderboard();
}

function renderLeaderboard(){
  const tbody = el('#leaderboard tbody');
  tbody.innerHTML='';
  const ls = JSON.parse(localStorage.getItem('local_scores')||'[]');
  ls.slice(0,20).forEach((s,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${s.name}</td><td>${s.mode}</td><td>${s.score}</td>`;
    tbody.appendChild(tr);
  });
}

// Firebase save
async function saveScore(obj){
  try{
    const col = collection(db,'scores');
    await addDoc(col, {...obj, createdAt: serverTimestamp()});
    renderFirestoreTop();
  }catch(e){ console.warn('saveScore failed',e); }
}

// render firestore top (if available)
async function renderFirestoreTop(){
  try{
    const q = query(collection(db,'scores'), orderBy('score','desc'), limit(10));
    const snap = await getDocs(q);
    const tbody = el('#leaderboard tbody'); tbody.innerHTML='';
    let idx=1;
    snap.forEach(d=>{
      const data = d.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx++}</td><td>${data.name||data.uid.substring(0,6)}</td><td>${data.mode}</td><td>${data.score}</td>`;
      tbody.appendChild(tr);
    });
  }catch(e){ /* ignore if no permissions or offline */ renderLeaderboard(); }
}

// Auth handling
onAuthStateChanged(auth, user => {
  currentUser = user;
  const authBtn = el('#authBtn');
  const gBtn = el('#googleSignIn');
  if(user){
    authBtn.textContent = user.displayName || user.email;
    gBtn.textContent = t('signed_in_as') + ' ' + (user.displayName||user.email);
  } else {
    authBtn.textContent = t('not_signed');
    gBtn.textContent = t('sign_in');
  }
  renderFirestoreTop();
});

document.addEventListener('click', (e)=>{
  if(e.target && e.target.id==='googleSignIn'){
    signInWithPopup(auth, provider).catch(err=>alert('Sign in failed: '+err.message));
  }
  if(e.target && e.target.id==='signOutBtn'){
    signOut(auth).then(()=> { closeSettings(); }).catch(()=>{});
  }
  if(e.target && e.target.id==='openSettings') openSettings();
});

function openSettings(){ el('#modalOverlay').classList.remove('hidden'); el('#settingsModal').classList.remove('hidden'); }
function closeSettings(){ el('#modalOverlay').classList.add('hidden'); el('#settingsModal').classList.add('hidden'); }

// Init
async function init(){
  await loadAllLangs();
  // fill language selector
  LANGS.forEach(l=>{
    const opt = document.createElement('option'); opt.value=l; opt.textContent = l; el('#langSelect').appendChild(opt);
  });
  el('#langSelect').value = currentLang;
  el('#langSelect').addEventListener('change', (e)=>{ currentLang = e.target.value; localStorage.setItem('lang', currentLang); applyTranslations(); });
  el('#themeToggle').addEventListener('click', ()=>{ theme = theme==='dark'?'light':'dark'; applyTheme(); });
  el('#closeSettings').addEventListener('click', closeSettings);
  el('#settingsBtn').addEventListener('click', openSettings);
  el('#selfTest').addEventListener('click', runSelfTest);

  applyTheme();
  applyTranslations();
  buildModeCards();
  renderLeaderboard();
}

// Self-test: programmatically play to 10 correct in each mode/difficulty
async function runSelfTest(){
  const report = [];
  for(const mode of MODES){
    for(const diff of mode.difficulties){
      // skip infinite
      if(mode.id==='infinite') continue;
      const g = new Game(mode.id, diff.id);
      // simulate correct answers 10 times quickly
      g.start();
      for(let i=0;i<10;i++){
        // answer current question with correct value
        g.submitAnswer(String(g.currentAnswer));
        // small wait via promise
        await new Promise(r=>setTimeout(r,50));
      }
      g.end();
      report.push({mode:mode.id,diff:diff.id,score:g.correct});
      // short pause to let storage update
      await new Promise(r=>setTimeout(r,100));
    }
  }
  console.log('Self-test report', report);
  alert('Self-test finished. Check console for details.');
}

// start app
init();
