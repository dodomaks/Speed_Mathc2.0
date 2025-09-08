
// Firebase initialization and helper functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyA-GxudNQc0C_rxs7VlSTdUd032bzn1sAg",
  authDomain: "speedmach-d5c2d.firebaseapp.com",
  projectId: "speedmach-d5c2d",
  storageBucket: "speedmach-d5c2d.firebasestorage.app",
  messagingSenderId: "988036223053",
  appId: "1:988036223053:web:227243e695aa4ee1fe0c04",
  measurementId: "G-BJ0CQNBC2T"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

export async function signIn() {
  return signInWithPopup(auth, provider);
}
export async function signOutUser() {
  return signOut(auth);
}
export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function saveScoreToDb(obj) {
  try {
    const col = collection(db, "leaderboards");
    await addDoc(col, obj);
    return true;
  } catch (e) {
    console.warn("saveScoreToDb failed:", e);
    throw e;
  }
}

export async function getTopScores(mode, difficulty, limit=50) {
  try {
    const col = collection(db, "leaderboards");
    const snap = await getDocs(col);
    const arr = [];
    snap.forEach(doc => {
      const d = doc.data();
      if((!mode || d.mode === mode) && (!difficulty || difficulty === "" || d.difficulty === difficulty)) {
        arr.push(Object.assign({}, d, { id: doc.id }));
      }
    });
    arr.sort((a,b) => (b.score||0) - (a.score||0));
    return arr.slice(0,limit);
  } catch(e) {
    console.warn("getTopScores failed", e);
    return [];
  }
}
