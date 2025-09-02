import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJECT.firebaseapp.com",
  projectId: "SEU_PROJECT",
  storageBucket: "SEU_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ELEMENTOS
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const authMsg = document.getElementById('auth-msg');
const userInfo = document.getElementById('user-info');
const collectionEl = document.getElementById('collection');

let currentUser = null;

// LOGIN
btnLogin.addEventListener('click', async () => {
  authMsg.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
  } catch(e) {
    authMsg.textContent = e.message;
  }
});

// SIGNUP
btnSignup.addEventListener('click', async () => {
  authMsg.textContent = '';
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    authMsg.textContent = 'Conta criada com sucesso!';
  } catch(e) {
    authMsg.textContent = e.message;
  }
});

// OBSERVADOR DE LOGIN
onAuthStateChanged(auth, user => {
  currentUser = user;
  if(user) {
    loginScreen.style.display = 'none';
    appScreen.style.display = 'block';
    userInfo.textContent = `Olá, ${user.email}`;
    loadMovies();
  } else {
    loginScreen.style.display = 'block';
    appScreen.style.display = 'none';
    collectionEl.innerHTML = '';
  }
});

// FUNÇÃO EXEMPLO PARA CARREGAR FILMES DO FIRESTORE
function loadMovies() {
  if(!currentUser) return;
  const q = query(collection(db, 'movies'), where('userId', '==', currentUser.uid));
  onSnapshot(q, snapshot => {
    collectionEl.innerHTML = '';
    snapshot.docs.forEach(docSnap => {
      const movie = docSnap.data();
      const div = document.createElement('div');
      div.className = 'movie-item';
      div.innerHTML = `
        <img src="${movie.Poster || 'https://placehold.co/100x150'}" />
        <div class="movie-info">
          <h2>${movie.Title}</h2>
          <p>${movie.Year || ''}</p>
        </div>
      `;
      collectionEl.appendChild(div);
    });
  });
}