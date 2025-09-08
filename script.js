
/*
  script.js - main logic for pages (i18n, theme, auth, games, leaderboards)
*/
import * as fb from './firebase.js';

// Utilities
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));
const storageGet = (k, def=null) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch(e){ return def; } }
const storageSet = (k,v) => localStorage.setItem(k, JSON.stringify(v));

// --- i18n ---
let LANG = storageGet('sm_lang','ru') || 'ru';
async function loadLang(lang) {
  try {
    const res = await fetch(`./lang/${lang}.json`);
    const obj = await res.json();
    applyLang(obj);
    LANG = lang;
  } catch(e){
    console.warn("lang load failed", e);
  }
}
function applyLang(dict) {
  qsa('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(!key) return;
    const v = (key.split('.').reduce((o,k)=> o && o[k], dict));
    if(v !== undefined) el.textContent = v;
  });
  // attributes
  qsa('[data-i18n-placeholder]').forEach(el=>{
    const key = el.getAttribute('data-i18n-placeholder');
    const v = (key.split('.').reduce((o,k)=> o && o[k], dict));
    if(v !== undefined) el.setAttribute('placeholder', v);
  });
}

// --- theme ---
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
}
const savedTheme = storageGet('sm_theme','dark') || 'dark';
applyTheme(savedTheme);

// --- Auth UI ---
const authBtn = qs('#authBtn');
const userTagEls = qsa('#userTag');

function updateUserTag(name) {
  userTagEls.forEach(el => { if(name) el.textContent = name; else el.textContent = 'Гость'; });
}

if(authBtn){
  authBtn.addEventListener('click', async (e)=>{
    e.preventDefault();
    try {
      if(fb.auth.currentUser) {
        await fb.signOutUser();
      } else {
        await fb.signIn();
      }
    } catch(err) {
      alert("Auth error: "+(err.message||err));
    }
  });
}

fb.onAuth(user => {
  if(user) {
    updateUserTag(user.displayName || user.email || 'User');
    if(authBtn) authBtn.textContent = 'Выйти';
  } else {
    updateUserTag('Гость');
    if(authBtn) authBtn.textContent = 'Войти';
  }
});

// --- Settings modal ---
const settingsBtn = qs('#settingsBtn');
const settingsModal = qs('#settingsModal');
const closeSettings = qs('#closeSettings');
const saveSettings = qs('#saveSettings');
const languageSelect = qs('#languageSelect');
const themeSelectModal = qs('#themeSelectModal');
const themeSelectFooter = qs('#themeSelect');

if(settingsBtn) settingsBtn.addEventListener('click', (e)=>{ e.preventDefault(); if(settingsModal) settingsModal.classList.remove('hidden'); });
if(closeSettings) closeSettings.addEventListener('click', ()=> settingsModal.classList.add('hidden'));
if(saveSettings) saveSettings.addEventListener('click', ()=>{
  const lang = languageSelect ? languageSelect.value : LANG;
  const theme = themeSelectModal ? themeSelectModal.value : savedTheme;
  storageSet('sm_lang', lang);
  storageSet('sm_theme', theme);
  applyTheme(theme);
  loadLang(lang);
  settingsModal.classList.add('hidden');
  if(themeSelectFooter) themeSelectFooter.value = theme;
});

// init selects
if(languageSelect) languageSelect.value = LANG;
if(themeSelectModal) themeSelectModal.value = savedTheme;
if(themeSelectFooter) themeSelectFooter.value = savedTheme;
qs('#year') && (qs('#year').textContent = new Date().getFullYear());

// initial load language
loadLang(LANG);

// Best table rendering (uses localStorage first)
const bestModeSelect = qs('#bestModeSelect');
async function refreshBestTable() {
  const mode = bestModeSelect ? bestModeSelect.value : 'pow';
  const tbody = qs('#bestTable tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  const local = storageGet('sm_local_scores', {});
  const arr = [];
  if(mode === 'pow') {
    const diffs = ['very_easy','easy','medium','hard','very_hard','impossible'];
    diffs.forEach((d,i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td>${local?.pow?.[d]?.best ?? '—'}</td><td>${local?.pow?.[d]?.user ?? '—'}</td><td>${local?.pow?.[d]?.ts ? new Date(local.pow[d].ts).toLocaleString() : '—'}</td>`;
      tbody.appendChild(tr);
    });
  } else {
    // generic
    const items = local[mode] || [];
    (items.slice(0,10)).forEach((it,idx)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx+1}</td><td>${it.user||'—'}</td><td>${it.best||'—'}</td><td>${it.ts?new Date(it.ts).toLocaleString():'—'}</td>`;
      tbody.appendChild(tr);
    });
  }
}
if(bestModeSelect) bestModeSelect.addEventListener('change', refreshBestTable);
refreshBestTable();

// --- Page specific logic ---
const page = document.body.dataset.page || 'index';

// Virtual numeric keyboard helper
function createVK(container, targetInput) {
  if(!container || !targetInput) return;
  container.innerHTML = '';
  const keys = ['7','8','9','4','5','6','1','2','3','0','←','⏎'];
  keys.forEach(k=>{
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = k;
    b.addEventListener('click', ()=> {
      if(k === '←') targetInput.value = targetInput.value.slice(0,-1);
      else if(k === '⏎') {
        targetInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}));
      } else targetInput.value += k;
      targetInput.focus();
    });
    container.appendChild(b);
  });
}

// Helper random
function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

// Save local best
function saveLocalBest(mode, difficulty, score) {
  const local = storageGet('sm_local_scores', {});
  local[mode] = local[mode] || {};
  local[mode][difficulty] = local[mode][difficulty] || {};
  const prev = local[mode][difficulty].best || 0;
  if(score > prev) {
    local[mode][difficulty] = { best: score, ts: Date.now(), user: (fb.auth.currentUser && fb.auth.currentUser.displayName) || 'Гость' };
    storageSet('sm_local_scores', local);
  }
  refreshBestTable();
}

// Save score to firebase (and local fallback)
async function saveScore(mode, difficulty, score, extra={}) {
  const obj = { mode, difficulty, score: Number(score||0), ts: Date.now(), userName: (fb.auth.currentUser && fb.auth.currentUser.displayName) || 'Гость', uid: (fb.auth.currentUser && fb.auth.currentUser.uid) || null, extra };
  // save local best
  saveLocalBest(mode,difficulty,score);
  try {
    await fb.saveScoreToDb(obj);
  } catch(e) {
    console.warn("Saving to firestore failed, kept local only.");
  }
}

// --- Game 1: pow ---
if(page === 'game1') {
  const backBtn = qs('#backBtn'); backBtn && backBtn.addEventListener('click', ()=> location.href = './index.html');
  const startBtn = qs('#startBtn');
  const question = qs('#powQuestion');
  const answer = qs('#powAnswer');
  const timerEl = qs('#powTimer'); const scoreEl = qs('#powScore'); const message = qs('#powMessage');
  const vkpad = qs('#vkpadPow'); createVK(vkpad, answer);

  let timer=null, timeLeft=0, curBase=0, curPow=0, score=0, infinite=false;

  function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }
  function startTimer(){
    stopTimer();
    timer = setInterval(()=>{
      timeLeft-=0.1;
      timerEl.textContent = `⏱ ${timeLeft.toFixed(1)}s`;
      if(timeLeft <= 0) {
        stopTimer();
        const corr = (BigInt(curBase) ** BigInt(curPow)).toString();
        endGame(false, `Время вышло! Правильный ответ: ${corr}`);
      }
    },100);
  }

  function genTask(diff) {
    // simplified from spec
    let b,p;
    if(diff === 'very_easy'){ b = randInt(1,10); p = 2; }
    else if(diff === 'easy'){ b = randInt(1,10); p = randInt(2,3); }
    else if(diff === 'medium'){ b = randInt(1,10); p = randInt(2,6); }
    else if(diff === 'hard'){ b = randInt(5,20); p = randInt(2,6); }
    else if(diff === 'very_hard'){ b = randInt(10,200); p = randInt(2,6); }
    else { b = randInt(20,99); p = randInt(3,4); }
    return {b,p};
  }

  function askQuestion(){
    const diff = qs('#difficultyPow').value;
    const task = genTask(diff);
    curBase = task.b; curPow = task.p;
    question.textContent = `${curBase} ^ ${curPow} = ?`;
    answer.value = '';
    answer.disabled = false;
    answer.focus();
    timeLeft = Number(qs('#timeLimit').value) || 60;
    timerEl.textContent = `⏱ ${timeLeft.toFixed(1)}s`;
    startTimer();
  }

  function endGame(won, msg) {
    stopTimer();
    answer.disabled = true;
    message.textContent = msg || '';
    // save score
    saveScore('pow', qs('#difficultyPow').value, score, { won });
    score = 0; scoreEl.textContent = '0';
  }

  answer.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' && !answer.disabled) {
      const user = answer.value.trim();
      const correct = (BigInt(curBase) ** BigInt(curPow)).toString();
      if(user === correct) {
        score++; scoreEl.textContent = String(score); message.textContent = 'Верно!';
        if(!qs('#infiniteMode').checked) {
          // continue until wrong or time
          askQuestion();
        } else askQuestion();
      } else {
        endGame(false, `Неверно! Правильный: ${correct}`);
      }
    }
  });

  startBtn.addEventListener('click', ()=>{
    score = 0; scoreEl.textContent = '0'; message.textContent = '';
    askQuestion();
  });
}

// --- Game 2: mul ---
if(page === 'game2') {
  const backBtnMul = qs('#backBtnMul'); backBtnMul && backBtnMul.addEventListener('click', ()=> location.href = './index.html');
  const start = qs('#startMul');
  const qEl = qs('#mulQuestion');
  const ans = qs('#mulAnswer');
  const tEl = qs('#mulTimer'); const sEl = qs('#mulScore'); const msg = qs('#mulMessage');
  const vkpad = qs('#vkpadMul'); createVK(vkpad, ans);

  let a=0,b=0, timer=null, timeLeft=0, score=0;

  function pick(){
    const d = qs('#difficultyMul').value;
    if(d==='easy'){ a=randInt(1,10); b=randInt(1,10); }
    else if(d==='medium'){ a=randInt(10,99); b=randInt(10,99); }
    else { a=randInt(100,999); b=randInt(100,999); }
  }
  function startTimer(){ clearInterval(timer); timer=setInterval(()=>{ timeLeft-=0.1; tEl.textContent = `⏱ ${timeLeft.toFixed(1)}s`; if(timeLeft<=0){ clearInterval(timer); endGame(false, 'Время вышло! Правильный: '+(a*b)); } },100); }
  function ask(){
    pick(); qEl.textContent = `${a} × ${b} = ?`; ans.value=''; ans.disabled=false; ans.focus(); timeLeft = Number(qs('#timeLimitMul').value)||20; tEl.textContent = `⏱ ${timeLeft.toFixed(1)}s`; startTimer();
  }
  function endGame(won,msgText){
    clearInterval(timer); ans.disabled=true; msg.textContent=msgText||''; saveScore('mul', qs('#difficultyMul').value, score);
    score=0; sEl.textContent='0';
  }

  ans.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' && !ans.disabled){
      const val = Number(ans.value);
      if(val === a*b){ score++; sEl.textContent = String(score); msg.textContent='Верно!'; ask(); }
      else endGame(false, 'Неверно! Правильный: '+(a*b));
    }
  });
  start.addEventListener('click', ()=>{ score=0; sEl.textContent='0'; msg.textContent=''; ask(); });
}

// --- Game 3: frac (division) ---
if(page === 'game3') {
  const backBtn = qs('#backBtnFrac'); backBtn && backBtn.addEventListener('click', ()=> location.href = './index.html');
  const start = qs('#startFrac');
  const qEl = qs('#fracQuestion'), ans = qs('#fracAnswer'), tEl = qs('#fracTimer'), sEl = qs('#fracScore'), msg = qs('#fracMessage');
  const vkpad = qs('#vkpadFrac'); createVK(vkpad, ans);
  let a=0,b=0, timer=null, timeLeft=0, score=0;

  function pickTask(){
    const d = qs('#difficultyFrac').value;
    if(d==='easy'){ b = randInt(1,9); const c = randInt(1,9); a = b * c; }
    else if(d==='medium'){ b = randInt(3,10); const c = randInt(4,99); a = b * c; }
    else { b = randInt(10,999); const c = randInt(1,50); a = b * c; }
  }
  function startTimer(){ clearInterval(timer); timer=setInterval(()=>{ timeLeft-=0.1; tEl.textContent=`⏱ ${timeLeft.toFixed(1)}s`; if(timeLeft<=0){ clearInterval(timer); endGame(false, 'Время вышло! Правильный: '+(a/b)); } },100); }
  function ask(){ pickTask(); qEl.textContent = `${a} ÷ ${b} = ?`; ans.value=''; ans.disabled=false; ans.focus(); timeLeft = Number(qs('#timeLimitFrac').value)||30; tEl.textContent = `⏱ ${timeLeft.toFixed(1)}s`; startTimer(); }
  function endGame(won,msgText){ clearInterval(timer); ans.disabled=true; msg.textContent=msgText||''; saveScore('frac', qs('#difficultyFrac').value, score); score=0; sEl.textContent='0'; }

  ans.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !ans.disabled){ const v = Number(ans.value); if(v === (a/b)){ score++; sEl.textContent=String(score); msg.textContent='Верно!'; ask(); } else endGame(false, 'Неверно! Правильный: '+(a/b)); } });

  start.addEventListener('click', ()=>{ score=0; sEl.textContent='0'; msg.textContent=''; ask(); });
}

// --- Game 4: roots ---
if(page === 'game4') {
  const backBtn = qs('#backBtnRoot'); backBtn && backBtn.addEventListener('click', ()=> location.href = './index.html');
  const start = qs('#startRoot');
  const qEl = qs('#rootQuestion'), ans = qs('#rootAnswer'), tEl = qs('#rootTimer'), sEl = qs('#rootScore'), msg = qs('#rootMessage');
  const vkpad = qs('#vkpadRoot'); createVK(vkpad, ans);
  let val=0, power=2, timer=null, timeLeft=0, score=0;

  function pick(){
    const d = qs('#difficultyRoot').value;
    if(d==='easy'){ power = 2; val = Math.pow(randInt(2,20), power); }
    else if(d==='medium'){ power = [2,3][randInt(0,1)]; val = Math.pow(randInt(2,12), power); }
    else { power = [2,3,4][randInt(0,2)]; val = Math.pow(randInt(2,8), power); }
  }
  function startTimer(){ clearInterval(timer); timer=setInterval(()=>{ timeLeft-=0.1; tEl.textContent=`⏱ ${timeLeft.toFixed(1)}s`; if(timeLeft<=0){ clearInterval(timer); endGame(false, 'Время вышло! Правильный: '+Math.round(Math.pow(val,1/power))); } },100); }
  function ask(){ pick(); qEl.textContent = `${val} ^(1/${power}) = ?`; ans.value=''; ans.disabled=false; ans.focus(); timeLeft = Number(qs('#timeLimitRoot').value)||30; tEl.textContent = `⏱ ${timeLeft.toFixed(1)}s`; startTimer(); }
  function endGame(won,msgText){ clearInterval(timer); ans.disabled=true; msg.textContent=msgText||''; saveScore('root', qs('#difficultyRoot').value, score); score=0; sEl.textContent='0'; }

  ans.addEventListener('keydown', (e)=>{ if(e.key==='Enter' && !ans.disabled){ const v = Number(ans.value); if(v === Math.round(Math.pow(val,1/power))){ score++; sEl.textContent=String(score); msg.textContent='Верно!'; ask(); } else endGame(false, 'Неверно! Правильный: '+Math.round(Math.pow(val,1/power))); } });
  start.addEventListener('click', ()=>{ score=0; sEl.textContent='0'; msg.textContent=''; ask(); });
}

// --- Snake ---
if(page === 'snake') {
  const backBtn = qs('#backSnake'); backBtn && backBtn.addEventListener('click', ()=> location.href = './index.html');
  const startBtn = qs('#startSnake'); const canvas = qs('#snakeCanvas'); const ctx = canvas.getContext('2d');
  const scoreEl = qs('#snakeScore'); const msg = qs('#snakeMessage');
  const controls = qsa('.arrow');
  let GRID = 100; // 100x100 as requested
  const canvasSize = Math.min(canvas.width, canvas.height);
  const cell = Math.floor(canvasSize / GRID);
  let snake = [{x:Math.floor(GRID/2), y:Math.floor(GRID/2)}];
  let dir = {x:1,y:0}, apple = null, speed = 120; // ms per step

  function spawnApple(){
    apple = { x: randInt(1,GRID-2), y: randInt(1,GRID-2) };
  }
  function draw(){
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card');
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // apple
    ctx.fillStyle = 'red';
    ctx.fillRect(apple.x*cell, apple.y*cell, cell, cell);
    // snake
    ctx.fillStyle = 'lime';
    snake.forEach(s => ctx.fillRect(s.x*cell, s.y*cell, cell, cell));
  }

  function step(){
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    // wall collision
    if(head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      endGame();
      return;
    }
    // self collision
    if(snake.some(s => s.x === head.x && s.y === head.y)) { endGame(); return; }
    snake.unshift(head);
    if(head.x === apple.x && head.y === apple.y) {
      // grow
      spawnApple();
      scoreEl.textContent = String(snake.length-1);
    } else {
      snake.pop();
    }
    draw();
  }

  let snakeTimer = null;
  function startSnake(){
    // difficulty adjust
    const d = qs('#difficultySnake').value;
    if(d === 'easy') speed = 120;
    else if(d === 'medium') speed = 80;
    else speed = 45;
    snake = [{x:Math.floor(GRID/2), y:Math.floor(GRID/2)}];
    dir = {x:1,y:0};
    spawnApple();
    draw();
    if(snakeTimer) clearInterval(snakeTimer);
    snakeTimer = setInterval(step, speed);
    msg.textContent = '';
  }
  function endGame(){
    if(snakeTimer) { clearInterval(snakeTimer); snakeTimer=null; }
    msg.textContent = 'Игра окончена';
    saveScore('snake', qs('#difficultySnake').value, snake.length-1);
  }

  // keyboard controls
  document.addEventListener('keydown', (e)=>{
    const key = e.key.toLowerCase();
    if(key === 'arrowup' || key === 'w') { if(dir.y !== 1) { dir = {x:0,y:-1}; } }
    if(key === 'arrowdown' || key === 's') { if(dir.y !== -1) { dir = {x:0,y:1}; } }
    if(key === 'arrowleft' || key === 'a') { if(dir.x !== 1) { dir = {x:-1,y:0}; } }
    if(key === 'arrowright' || key === 'd') { if(dir.x !== -1) { dir = {x:1,y:0}; } }
  });
  controls.forEach(b => b.addEventListener('click', ()=> {
    const dirName = b.dataset.dir;
    if(dirName === 'up' && dir.y !== 1) dir = {x:0,y:-1};
    if(dirName === 'down' && dir.y !== -1) dir = {x:0,y:1};
    if(dirName === 'left' && dir.x !== 1) dir = {x:-1,y:0};
    if(dirName === 'right' && dir.x !== -1) dir = {x:1,y:0};
  }));

  startBtn.addEventListener('click', ()=> startSnake());
}

// --- Leaderboard page ---
if(page === 'leaderboard') {
  const back = qs('#backLeaderboard'); back && back.addEventListener('click', ()=> location.href = './index.html');
  const modeSel = qs('#lbMode'); const diffSel = qs('#lbDifficulty'); const refreshBtn = qs('#refreshLb'); const tbody = qs('#leaderboardTable tbody');

  async function refreshLb(){
    const mode = modeSel.value; const diff = diffSel.value;
    tbody.innerHTML = '<tr><td colspan="6">Загрузка...</td></tr>';
    const rows = await fb.getTopScores(mode, diff, 50);
    if(!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6">Нет записей</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    rows.forEach((r,i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td>${r.userName||r.user||'—'}</td><td>${r.mode}</td><td>${r.difficulty||'—'}</td><td class="mono">${r.score}</td><td>${r.ts?new Date(r.ts).toLocaleString():'—'}</td>`;
      tbody.appendChild(tr);
    });
  }
  refreshBtn.addEventListener('click', refreshLb);
  // if query params present, preselect
  const qsParams = new URLSearchParams(location.search);
  if(qsParams.get('mode')) modeSel.value = qsParams.get('mode');
  refreshLb();
}

// End of script
