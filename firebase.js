// Minimal Firebase initialization for client-side usage (cdn-based optional)
/*
Note: This file expects Firebase SDK to be loaded globally if you want to use firebase.* APIs
We also provide modular usage in app.js. If you host the site on HTTPS and configure OAuth/Firestore in GA,
the sign-in will work.
*/
const firebaseConfig = {
  apiKey: "AIzaSyA-GxudNQc0C_rxs7VlSTdUd032bzn1sAg",
  authDomain: "speedmach-d5c2d.firebaseapp.com",
  projectId: "speedmach-d5c2d",
  storageBucket: "speedmach-d5c2d.firebasestorage.app",
  messagingSenderId: "988036223053",
  appId: "1:988036223053:web:227243e695aa4ee1fe0c04",
  measurementId: "G-BJ0CQNBC2T"
};
// If you want to use modular SDK, app.js imports from CDN modules.
// This file is a placeholder to show config is present.
console.log('Firebase config loaded');