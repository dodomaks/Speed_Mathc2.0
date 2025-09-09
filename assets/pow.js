// Pow game
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const answer = document.getElementById("powAnswer");
const question = document.getElementById("powQuestion");
const timerEl = document.getElementById("powTimer");
const scoreEl = document.getElementById("powScore");
const msg = document.getElementById("powMessage");
const startBtn = document.getElementById("powStart");
const restartBtn = document.getElementById("powRestart");
const timeInput = document.getElementById("powTimeLimit");
const diffSel = document.getElementById("powDifficulty");
const infiniteCb = document.getElementById("infiniteMode");
const numericPad = document.getElementById("numericPad");

let timer = null;
let timeLeft = 0;
let score = 0;
let current = { b:2, p:2, ans:"4" };

function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function generate(d){
  // implement simplified rules according to spec
  if(d==="very_easy"){ const b=randInt(1,10); const p=2; return {b,p,ans:(BigInt(b)**BigInt(p)).toString()}; }
  if(d==="easy"){ const b=randInt(1,10); const p=randInt(2,3); return {b,p,ans:(BigInt(b)**BigInt(p)).toString()}; }
  if(d==="medium"){ const b=randInt(1,10); const p=randInt(2,3); return {b,p,ans:(BigInt(b)**BigInt(p)).toString()}; }
  if(d==="hard"){ const b=randInt(10,20); const p=2; return {b,p,ans:(BigInt(b)**BigInt(p)).toString()}; }
  if(d==="very_hard"){ const b=randInt(10,100); const p=2; return {b,p,ans:(BigInt(b)**BigInt(p)).toString()}; }
  // impossible
  const b=randInt(20,99); const p=[3,4][Math.floor(Math.random()*2)]; return {b,p,ans:(BigInt(b)**BigInt(p)).toString()};
}

function startRound(){
  const d = diffSel.value;
  current = generate(d);
  question.textContent = `${current.b} ^ ${current.p} = ?`;
  answer.value = "";
  answer.disabled = false;
  answer.focus();
  timeLeft = Number(timeInput.value) || (infiniteCb.checked?9999:60);
  updateTimerDisplay();
  if(timer) clearInterval(timer);
  timer = setInterval(()=>{
    timeLeft -= 0.1;
    updateTimerDisplay();
    if(timeLeft <= 0){
      clearInterval(timer);
      endRound(false, "Время вышло! Правильный: "+current.ans);
    }
  },100);
}

function updateTimerDisplay(){ timerEl.textContent = `⏱ ${timeLeft.toFixed(1)}s`; }

function endRound(won, reason){
  if(timer) clearInterval(timer);
  answer.disabled = true;
  msg.textContent = reason || "";
  if(won) score++;
  else {
    // show correct and stop if not infinite
    if(!infiniteCb.checked) {
      saveBest();
      score = 0;
    }
  }
  scoreEl.textContent = String(score);
}

function saveBest(){
  const key = "sm:scores";
  const data = JSON.parse(localStorage.getItem(key) || "{}");
  data.pow = data.pow || {};
  const idx = diffSel.selectedIndex;
  const prev = data.pow[idx] && data.pow[idx].best ? data.pow[idx].best : 0;
  if(score > prev){
    data.pow[idx] = { best: score, ts: Date.now(), user: (getAuth()?getAuth().currentUser?.displayName:null) || "Гость" };
    localStorage.setItem(key, JSON.stringify(data));
    // attempt save to Firestore if logged
    try{
      const auth = getAuth();
      if(auth.currentUser){
        const db = getFirestore();
        const docRef = doc(db, "scores", auth.currentUser.uid);
        setDoc(docRef, { pow: data.pow }, { merge: true }).catch(()=>{});
      }
    }catch(e){}
  }
}

answer?.addEventListener("keydown", (e)=>{
  if(e.key === "Enter" && !answer.disabled){
    const v = answer.value.trim();
    if(v === current.ans){
      endRound(true, "Верно!");
      if(!infiniteCb.checked) startRound();
      else startRound();
    }else{
      endRound(false, "Неверный ответ. Правильный: "+current.ans);
    }
  }
});

startBtn?.addEventListener("click", ()=>{
  score = 0; scoreEl.textContent = "0"; msg.textContent = "";
  startRound();
});

restartBtn?.addEventListener("click", ()=>{
  score = 0; scoreEl.textContent = "0"; msg.textContent = "";
  startRound();
});

// numeric pad
numericPad?.addEventListener("click", (e)=>{
  const k = e.target?.getAttribute?.("data-key");
  if(!k) return;
  if(k === "-"){
    answer.value = answer.value.slice(0,-1);
  }else{
    answer.value += k;
  }
});
document.getElementById("padEnter")?.addEventListener("click", ()=> {
  const ev = new KeyboardEvent('keydown',{key:'Enter'});
  answer.dispatchEvent(ev);
});

// show/hide pad based on viewport
if(window.innerWidth < 700) document.getElementById("numericPad")?.classList.remove("hidden");
