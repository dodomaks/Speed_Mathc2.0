
// Multiplication game
const q = document.getElementById("mulQuestion");
const ans = document.getElementById("mulAnswer");
const t = document.getElementById("mulTimer");
const s = document.getElementById("mulScore");
const msg = document.getElementById("mulMessage");
const start = document.getElementById("mulStart");
const restart = document.getElementById("mulRestart");
const timeInput = document.getElementById("mulTimeLimit");
const diffSel = document.getElementById("mulDifficulty");

let timer=null, timeLeft=0, score=0, a=0,b=0;

function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function genTask(){
  const d = diffSel.value;
  if(d==="easy"){ a=randInt(1,10); b=randInt(1,10); }
  else if(d==="medium"){ a=randInt(10,99); b=randInt(10,99); }
  else { a=randInt(100,999); b=randInt(100,999); }
  q.textContent = `${a} × ${b} = ?`;
}

function startRound(){
  genTask();
  ans.value=""; ans.disabled=false; ans.focus();
  timeLeft = Number(timeInput.value) || (diffSel.value==="easy"?20:30);
  updateT();
  if(timer) clearInterval(timer);
  timer = setInterval(()=>{ timeLeft-=0.1; updateT(); if(timeLeft<=0){ clearInterval(timer); endRound(false,"Время вышло! Правильный: "+(a*b)); } },100);
}

function updateT(){ t.textContent = `⏱ ${timeLeft.toFixed(1)}s`; }

function endRound(won, reason){
  if(timer) clearInterval(timer);
  ans.disabled=true;
  msg.textContent = reason || "";
  if(!won){ saveBest(); score=0; }
  s.textContent = String(score);
}

function saveBest(){
  const key = "sm:scores";
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  data.mul = data.mul || [];
  const idx = diffSel.selectedIndex;
  const prev = data.mul[idx] && data.mul[idx].best ? data.mul[idx].best : 0;
  if(score > prev){
    data.mul[idx] = { best: score, ts: Date.now(), user: "Гость" };
    localStorage.setItem(key, JSON.stringify(data));
  }
}

ans?.addEventListener("keydown",(e)=>{
  if(e.key==="Enter" && !ans.disabled){
    const val = Number(ans.value);
    if(val === a*b){ score++; msg.textContent="Верно!"; startRound(); } else endRound(false,"Неверный. Правильный: "+(a*b));
  }
});

start?.addEventListener("click", ()=>{ score=0; s.textContent="0"; msg.textContent=""; startRound(); });
restart?.addEventListener("click", ()=>{ score=0; s.textContent="0"; msg.textContent=""; startRound(); });
