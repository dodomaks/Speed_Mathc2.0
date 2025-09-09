
// Snake game on a grid; grid is 100x100 logical but scaled to canvas size.
const canvas = document.getElementById("snakeCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("snakeScore");
const speedLabel = document.getElementById("snakeSpeedLabel");
const startBtn = document.getElementById("snakeStart");
const restartBtn = document.getElementById("snakeRestart");
const diffSel = document.getElementById("snakeDifficulty");

let gridSize = 100; // logical grid
let cellSize = Math.floor(canvas.width / gridSize);
let snake = [{x:50,y:50}];
let dir = {x:1,y:0};
let apple = {x:60,y:50};
let tick = null;
let speed = 5;
let eaten = 0;
let alive = true;

function reset(){
  cellSize = Math.floor(canvas.width / gridSize);
  snake = [{x:50,y:50}];
  dir = {x:1,y:0};
  apple = {x:rand(10,90), y:rand(10,90)};
  eaten = 0;
  alive = true;
  scoreEl.textContent = "0";
}

function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function setSpeedFromDifficulty(){
  const d = diffSel.value;
  speed = d==="easy"?5:(d==="medium"?9:14);
  speedLabel.textContent = "Скорость: "+speed;
}

function gameStep(){
  if(!alive) return;
  const head = { x: (snake[0].x + dir.x + gridSize)%gridSize, y: (snake[0].y + dir.y + gridSize)%gridSize };
  // collision with self
  for(let s of snake){
    if(s.x===head.x && s.y===head.y){ alive=false; clearInterval(tick); return; }
  }
  snake.unshift(head);
  // apple?
  if(head.x === apple.x && head.y === apple.y){
    eaten++; scoreEl.textContent = String(eaten);
    apple = {x: rand(0,gridSize-1), y: rand(0,gridSize-1)};
  } else {
    snake.pop();
  }
  render();
}

function render(){
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  // apple
  ctx.fillStyle = '#ff3860';
  ctx.fillRect(apple.x*cellSize, apple.y*cellSize, cellSize, cellSize);
  // snake
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent') || '#10b981';
  for(let s of snake){
    ctx.fillRect(s.x*cellSize, s.y*cellSize, cellSize, cellSize);
  }
}

function startGame(){
  reset();
  setSpeedFromDifficulty();
  if(tick) clearInterval(tick);
  tick = setInterval(gameStep, Math.max(30, 220 - speed*12));
}

function handleKey(e){
  const k = e.key.toLowerCase();
  if(k==='arrowup' || k==='w'){ if(dir.y!==1){ dir={x:0,y:-1}; } }
  if(k==='arrowdown' || k==='s'){ if(dir.y!==-1){ dir={x:0,y:1}; } }
  if(k==='arrowleft' || k==='a'){ if(dir.x!==1){ dir={x:-1,y:0}; } }
  if(k==='arrowright' || k==='d'){ if(dir.x!==-1){ dir={x:1,y:0}; } }
}

window.addEventListener("keydown", handleKey);
startBtn?.addEventListener("click", ()=> startGame());
restartBtn?.addEventListener("click", ()=> startGame());

// responsive: adjust canvas size to container
function fitCanvas(){
  const w = Math.min(800, Math.floor(window.innerWidth*0.9));
  canvas.width = w;
  canvas.height = w;
  cellSize = Math.floor(canvas.width / gridSize);
  render();
}
window.addEventListener("resize", fitCanvas);
fitCanvas();
render();
