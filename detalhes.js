// Configuração Firebase (mesma do app.js)
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  projectId: "SEU_PROJETO_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Elementos DOM
const movieTitle = document.getElementById('movieTitle');
const moviePoster = document.getElementById('moviePoster');
const movieYear = document.getElementById('movieYear');
const movieTypes = document.getElementById('movieTypes');
const movieTags = document.getElementById('movieTags');
const movieSynopsis = document.getElementById('movieSynopsis');
const backBtn = document.getElementById('backBtn');
const editBtn = document.getElementById('editBtn');

// Recupera ID do filme selecionado
const movieId = localStorage.getItem('movieId');
let currentUser = null;

// Voltar para lista
backBtn.addEventListener('click', () => window.location.href = 'index.html');

// Ir para editar
editBtn.addEventListener('click', () => {
  localStorage.setItem('movieId', movieId);
  window.location.href = 'editar.html';
});

// Carregar detalhes
auth.onAuthStateChanged(async user => {
  if (!user) return window.location.href = 'index.html';
  currentUser = user;

  const doc = await db.collection('movies').doc(movieId).get();
  if (!doc.exists) return alert('Filme não encontrado');

  const movie = doc.data();
  movieTitle.textContent = movie.title;
  moviePoster.src = movie.poster;
  movieYear.textContent = movie.year;
  movieTypes.textContent = movie.types.join(', ');
  movieTags.textContent = movie.tags.join(', ');
  movieSynopsis.textContent = movie.synopsis;
});