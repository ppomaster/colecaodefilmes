// Configuração Firebase
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
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const movieGrid = document.getElementById('movieGrid');
const searchInput = document.getElementById('searchInput');
const addMovieForm = document.getElementById('addMovieForm');

// Estado
let currentUser = null;
let movies = [];

// Funções Auth
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.querySelector('.screen').style.display = 'block';
    loginForm.parentElement.style.display = 'none';
    loadMovies();
  } else {
    currentUser = null;
    document.querySelector('.screen').style.display = 'none';
    loginForm.parentElement.style.display = 'block';
  }
});

loginForm.addEventListener('submit', e => {
  e.preventDefault();
  auth.signInWithEmailAndPassword(emailInput.value, passInput.value)
    .catch(err => alert(err.message));
});

logoutBtn.addEventListener('click', () => auth.signOut());

// Carregar filmes do Firestore
async function loadMovies() {
  const snapshot = await db.collection('movies').where('uid', '==', currentUser.uid).get();
  movies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderMovies();
}

// Renderizar filmes
function renderMovies() {
  movieGrid.innerHTML = '';
  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <img src="${movie.poster}" class="poster" />
      <div class="card-body">
        <strong>${movie.title} (${movie.year})</strong>
        <p class="small">${movie.tags.join(', ')}</p>
        <p class="small">${movie.types.join(', ')}</p>
      </div>
      <div class="icons">
        <div class="icon-btn" onclick="editMovie('${movie.id}')">✏️</div>
        <div class="icon-btn" onclick="viewDetails('${movie.id}')">🔍</div>
      </div>
    `;
    card.querySelector('.poster').addEventListener('click', () => viewDetails(movie.id));
    movieGrid.appendChild(card);
  });
}

// Adicionar novo filme
addMovieForm.addEventListener('submit', async e => {
  e.preventDefault();
  const title = addMovieForm.title.value;
  const types = Array.from(addMovieForm.types.selectedOptions).map(o => o.value);

  // Buscar no TMDb
  const data = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=SUA_TMDb_API&query=${encodeURIComponent(title)}&language=pt-BR`)
    .then(res => res.json());
  if (!data.results || !data.results[0]) return alert('Filme não encontrado');
  const movieData = data.results[0];

  // Traduzir sinopse (já em pt-BR via TMDb)
  const synopsis = movieData.overview;

  // Gerar tags automáticas
  const tags = synopsis.toLowerCase().match(/\b(\w{4,})\b/g)?.slice(0,8) || [];

  const newMovie = {
    uid: currentUser.uid,
    title: movieData.title,
    year: movieData.release_date?.split('-')[0] || '',
    poster: `https://image.tmdb.org/t/p/w500${movieData.poster_path}`,
    synopsis,
    tags,
    types
  };

  const docRef = await db.collection('movies').add(newMovie);
  movies.push({ id: docRef.id, ...newMovie });
  renderMovies();
  addMovieForm.reset();
});

// Funções de detalhe e edição
function viewDetails(id) {
  localStorage.setItem('movieId', id);
  window.location.href = 'detalhes.html';
}

function editMovie(id) {
  localStorage.setItem('movieId', id);
  window.location.href = 'editar.html';
}

// Busca local
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  const filtered = movies.filter(m => m.title.toLowerCase().includes(q));
  movieGrid.innerHTML = '';
  filtered.forEach(m => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <img src="${m.poster}" class="poster" />
      <div class="card-body">
        <strong>${m.title} (${m.year})</strong>
        <p class="small">${m.tags.join(', ')}</p>
        <p class="small">${m.types.join(', ')}</p>
      </div>
    `;
    card.querySelector('.poster').addEventListener('click', () => viewDetails(m.id));
    movieGrid.appendChild(card);
  });
});