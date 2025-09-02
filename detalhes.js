// detalhes.js - edição completa de um filme (detalhes.html)
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const movieId = params.get('id');
if (!movieId) {
  alert('ID do filme ausente. Voltando.');
  location.href = 'index.html';
}

const titleEl = document.getElementById('title-el');
const posterEl = document.getElementById('poster-el');
const metaEl = document.getElementById('meta-el');

const chkDVD = document.getElementById('owned-dvd');
const chkBlu = document.getElementById('owned-bluray');
const chkDigital = document.getElementById('owned-digital');
const chkVHS = document.getElementById('owned-vhs');
const chkTelegram = document.getElementById('owned-telegram');
const chkWatched = document.getElementById('movie-watched');
const chkFavorite = document.getElementById('movie-favorite');
const selType = document.getElementById('movie-type');
const inpRating = document.getElementById('movie-rating');
const inpTags = document.getElementById('movie-tags');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const statusMsg = document.getElementById('status-msg');

let currentUser = null;
let currentMovie = null;

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    alert('Faça login para editar o filme. Redirecionando...');
    location.href = 'index.html';
    return;
  }
  await loadMovie();
});

async function loadMovie() {
  try {
    const ref = doc(db, 'movies', movieId);
    const snap = await getDoc(ref);
    if (!snap.exists()) { alert('Filme não encontrado.'); location.href = 'index.html'; return; }
    const m = snap.data();
    if (m.userId !== currentUser.uid) { alert('Você não tem permissão para editar este filme.'); location.href = 'index.html'; return; }
    currentMovie = { id: snap.id, ...m };
    titleEl.textContent = currentMovie.Title || '—';
    posterEl.src = currentMovie.Poster || 'https://placehold.co/360x540?text=Sem+Imagem';
    metaEl.textContent = `${currentMovie.Year || ''} • ${currentMovie.Genre || ''}`;
    // populate fields (booleans may be undefined)
    chkDVD.checked = !!currentMovie.OwnedDVD;
    chkBlu.checked = !!currentMovie.OwnedBluRay;
    chkDigital.checked = !!currentMovie.OwnedDigital;
    chkVHS.checked = !!currentMovie.OwnedVHS;
    chkTelegram.checked = !!currentMovie.OwnedTelegram;
    chkWatched.checked = !!currentMovie.Watched;
    chkFavorite.checked = !!currentMovie.Favorite;
    selType.value = currentMovie.Type || 'Digital';
    inpRating.value = currentMovie.Rating || '';
    inpTags.value = (currentMovie.Tags || []).join(', ');
  } catch (err) {
    console.error(err); alert('Erro ao carregar filme.'); location.href = 'index.html';
  }
}

saveBtn.addEventListener('click', async () => {
  if (!currentUser || !currentMovie) return;
  statusMsg.textContent = 'Salvando...';
  saveBtn.disabled = true;
  try {
    const payload = {
      OwnedDVD: !!chkDVD.checked,
      OwnedBluRay: !!chkBlu.checked,
      OwnedDigital: !!chkDigital.checked,
      OwnedVHS: !!chkVHS.checked,
      OwnedTelegram: !!chkTelegram.checked,
      Watched: !!chkWatched.checked,
      Favorite: !!chkFavorite.checked,
      Type: selType.value || 'Digital',
      Rating: inpRating.value ? Number(inpRating.value) : null,
      Tags: inpTags.value.split(',').map(t=>t.trim()).filter(Boolean)
    };
    await updateDoc(doc(db, 'movies', movieId), payload);
    statusMsg.textContent = 'Alterações salvas.';
  } catch (err) {
    console.error(err); statusMsg.textContent = 'Erro ao salvar.';
  } finally { saveBtn.disabled = false; setTimeout(()=>statusMsg.textContent='',2000); }
});

deleteBtn.addEventListener('click', async () => {
  if (!confirm('Excluir permanentemente este filme?')) return;
  try {
    await deleteDoc(doc(db, 'movies', movieId));
    alert('Filme excluído.');
    location.href = 'index.html';
  } catch (err) {
    console.error(err); alert('Erro ao excluir.');
  }
});