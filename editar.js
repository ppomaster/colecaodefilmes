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
const moviePoster = document.getElementById('moviePoster');
const editTitle = document.getElementById('editTitle');
const editYear = document.getElementById('editYear');
const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
const editTags = document.getElementById('editTags');
const editSynopsis = document.getElementById('editSynopsis');
const editWatched = document.getElementById('editWatched');
const editFavorite = document.getElementById('editFavorite');
const saveBtn = document.getElementById('saveBtn');
const backBtn = document.getElementById('backBtn');

// ID do filme
const movieId = localStorage.getItem('movieId');
let currentUser = null;

// Voltar
backBtn.addEventListener('click', () => window.location.href = 'detalhes.html');

// Carregar dados
auth.onAuthStateChanged(async user => {
  if (!user) return window.location.href = 'index.html';
  currentUser = user;

  const docSnap = await db.collection('movies').doc(movieId).get();
  if (!docSnap.exists) return alert('Filme não encontrado');
  const movie = docSnap.data();

  moviePoster.src = movie.poster || '';
  editTitle.value = movie.title || '';
  editYear.value = movie.year || '';
  editSynopsis.value = movie.synopsis || '';
  editTags.value = movie.tags ? movie.tags.join(', ') : '';
  editWatched.checked = movie.watched || false;
  editFavorite.checked = movie.favorite || false;

  // Selecionar checkboxes existentes
  if (movie.types) {
    checkboxes.forEach(cb => cb.checked = movie.types.includes(cb.value));
  }
});

// Salvar alterações
saveBtn.addEventListener('click', async () => {
  const title = editTitle.value.trim();
  const year = editYear.value.trim();
  const types = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  const tags = editTags.value.split(',').map(t => t.trim()).filter(Boolean);
  const synopsis = editSynopsis.value.trim();
  const watched = editWatched.checked;
  const favorite = editFavorite.checked;

  if (!title) return alert('Título obrigatório');

  try {
    await db.collection('movies').doc(movieId).update({
      title,
      year,
      types,
      tags,
      synopsis,
      watched,
      favorite
    });
    alert('Filme atualizado com sucesso!');
    window.location.href = 'detalhes.html';
  } catch(err) {
    console.error(err);
    alert('Erro ao salvar alterações');
  }
});