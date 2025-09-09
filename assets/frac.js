
// Division (fractions) game: ensure division without remainder for easier checking
const q = document.getElementById("fracQuestion");
const ans = document.getElementById("fracAnswer");
const t = document.getElementById("fracTimer");
const s = document.getElementById("fracScore");
const msg = document.getElementById("fracMessage");
const start = document.getElementById("fracStart");
const restart = document.getElementById("fracRestart");
const timeInput = document.getElementById("fracTimeLimit");
const diffSel = document.getElementById("fracDifficulty");

let timer=null, timeLeft=0, score=0, a=0,b=1;

function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function genTask(){
  const d = diffSel.value;
  if(d==="easy"){ b = randInt(2,9); a = b * randInt(1,20); }
  else if(d==="medium"){ b = randInt(3,10); a = b * randInt(10,99); }
  else { b = randInt(10,999); a = b * randInt(100,999); }
  q.textContent = `${a} ÷ ${b} = ?`;
}

function startRound(){
  genTask();
  ans.value=""; ans.disabled=false; ans.focus();
  timeLeft = Number(timeInput.value) || 20;
  updateT();
  if(timer) clearInterval(timer);
  timer = setInterval(()=>{ timeLeft-=0.1; updateT(); if(timeLeft<=0){ clearInterval(timer); endRound(false,"Время вышло! Правильный: "+(a/b)); } },100);
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
  data.frac = data.frac || [];
  const idx = diffSel.selectedIndex;
  const prev = data.frac[idx] && data.frac[idx].best ? data.frac[idx].best : 0;
  if(score > prev){
    data.frac[idx] = { best: score, ts: Date.now(), user: "Гость" };
    localStorage.setItem(key, JSON.stringify(data));
  }
}

ans?.addEventListener("keydown",(e)=>{
  if(e.key==="Enter" && !ans.disabled){
    const val = Number(ans.value);
    if(val === (a/b)){ score++; msg.textContent="Верно!"; startRound(); } else endRound(false,"Неверный. Правильный: "+(a/b));
  }
});

start?.addEventListener("click", ()=>{ score=0; s.textContent="0"; msg.textContent=""; startRound(); });
restart?.addEventListener("click", ()=>{ score=0; s.textContent="0"; msg.textContent=""; startRound(); });
