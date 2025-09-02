// app.js (módulo principal) — importe este arquivo em index.html
import { auth, provider, db, serverTimestamp } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const OMDB_API_KEY = "6cbfb854"; // sua chave OMDb

// DOM elementos
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const btnGoogle = document.getElementById('btn-google');
const btnLogout = document.getElementById('btn-logout');
const userEmailSpan = document.getElementById('user-email');
const authMsg = document.getElementById('auth-msg');

const searchTitle = document.getElementById('search-title');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');

const manualTitle = document.getElementById('manual-title');
const manualYear = document.getElementById('manual-year');
const manualType = document.getElementById('manual-type');
const manualAddBtn = document.getElementById('manual-add-btn');

const collectionEl = document.getElementById('collection');
const tabsEl = document.getElementById('tabs');

const counters = {
  all: document.getElementById('count-all'),
  dvd: document.getElementById('count-dvd'),
  digital: document.getElementById('count-digital'),
  vhs: document.getElementById('count-vhs')
};

let currentUser = null;
let unsubscribe = null;
let localMovies = [];
let currentFilter = 'all';

// --- AUTH HANDLERS ---
btnLogin.addEventListener('click', async () => {
  authMsg.textContent = ''; btnLogin.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
  } catch (err) {
    authMsg.textContent = (err.code || err.message).toString();
    console.error(err);
  } finally { btnLogin.disabled = false; }
});

btnSignup.addEventListener('click', async () => {
  authMsg.textContent = ''; btnSignup.disabled = true;
  try {
    await createUserWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
    authMsg.style.color = '#8be28b'; authMsg.textContent = 'Conta criada — você está logado.';
  } catch (err) {
    authMsg.style.color = '#ffb4b4'; authMsg.textContent = (err.code || err.message).toString();
    console.error(err);
  } finally { btnSignup.disabled = false; }
});

btnGoogle.addEventListener('click', async () => {
  btnGoogle.disabled = true;
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    authMsg.textContent = err.message;
    console.error(err);
  } finally { btnGoogle.disabled = false; }
});

btnLogout.addEventListener('click', async () => {
  if (unsubscribe) { try { unsubscribe(); } catch(e){} unsubscribe = null; }
  await signOut(auth);
});

// observe auth state
onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    userEmailSpan.textContent = user.displayName || user.email || user.uid;
    startListeningMovies();
  } else {
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    userEmailSpan.textContent = '';
    authMsg.textContent = '';
    if (unsubscribe) { try { unsubscribe(); } catch(e){} unsubscribe = null; }
  }
});

// --- Firestore realtime listen ---
function startListeningMovies() {
  if (!currentUser) return;
  if (unsubscribe) { try { unsubscribe(); } catch(e){} unsubscribe = null; }
  const col = collection(db, 'movies');
  const q = query(col, where('userId', '==', currentUser.uid));
  unsubscribe = onSnapshot(q, snapshot => {
    localMovies = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    localMovies.forEach(m => { if (!m.Type) m.Type = m.type || 'Digital'; });
    renderAll();
  }, err => {
    console.error('Erro snapshot:', err);
    showMsg('Falha ao sincronizar com Firestore.', 'error');
  });
}

// --- OMDb Search ---
searchBtn.addEventListener('click', async () => {
  const title = searchTitle.value.trim();
  if (!title) return;
  searchBtn.disabled = true; searchBtn.innerHTML = '<span class="loading"></span>';
  searchResults.innerHTML = '';
  try {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(title)}`);
    const data = await res.json();
    if (data.Response === 'True' && data.Search && data.Search.length) {
      data.Search.slice(0,7).forEach(item => {
        const el = document.createElement('div'); el.className='result-item';
        el.innerHTML = `
          <img src="${item.Poster!=='N/A'?item.Poster:'https://placehold.co/80x120?text=No+Image'}" alt="">
          <div style="flex:1">
            <div style="font-weight:700">${item.Title}</div>
            <div class="small">${item.Year} • ${item.Type}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn" data-imdb="${item.imdbID}">Selecionar</button>
            <button class="btn ghost" data-imdb-add="${item.imdbID}">Adicionar rápido</button>
          </div>`;
        el.querySelector('[data-imdb]').onclick = () => selectFromSearch(item.imdbID);
        el.querySelector('[data-imdb-add]').onclick = async () => quickAddFromImdb(item.imdbID);
        searchResults.appendChild(el);
      });
    } else {
      searchResults.innerHTML = `<div class="small" style="padding:8px">Nenhum resultado.</div>`;
    }
  } catch (err) {
    console.error('OMDb fetch error', err);
    searchResults.innerHTML = `<div class="small" style="padding:8px">Erro ao conectar OMDb.</div>`;
  } finally {
    searchBtn.disabled = false; searchBtn.innerHTML = 'Buscar';
  }
});

async function selectFromSearch(imdbID) {
  try {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${encodeURIComponent(imdbID)}&plot=short`);
    const d = await res.json();
    if (d.Response !== 'True') { showMsg('Detalhes não encontrados.', 'error'); return; }
    openAddDialog({
      Title: d.Title || '', Year: d.Year || '', Poster: d.Poster !== 'N/A' ? d.Poster : '',
      imdbID: d.imdbID || '', Genre: d.Genre || '', Director: d.Director || '', Plot: d.Plot || ''
    });
  } catch (err) { console.error(err); showMsg('Erro ao buscar detalhes.', 'error'); }
}

async function quickAddFromImdb(imdbID) {
  if (!currentUser) { showMsg('Faça login para adicionar.', 'error'); return; }
  try {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${encodeURIComponent(imdbID)}`);
    const d = await res.json();
    if (d.Response !== 'True') { showMsg('Não encontrado', 'error'); return; }
    if (localMovies.find(m => m.imdbID === d.imdbID)) { showMsg('Filme já cadastrado.', 'error'); return; }
    const movie = {
      Title: d.Title || '', Year: d.Year || '', Poster: d.Poster !== 'N/A'?d.Poster:'', imdbID: d.imdbID||null,
      Genre: d.Genre||null, Director: d.Director||null, Type:'Digital', Watched:false, Favorite:false,
      Rating:null, Tags:[], userId: currentUser.uid, createdAt: serverTimestamp()
    };
    await addDoc(collection(db, 'movies'), movie);
    showMsg(`"${movie.Title}" adicionado`, 'success');
    searchResults.innerHTML = ''; searchTitle.value = '';
  } catch (err) { console.error(err); showMsg('Erro ao adicionar.', 'error'); }
}

function openAddDialog(prefill = {}) {
  searchResults.innerHTML = '';
  const form = document.createElement('div'); form.className='container-card';
  form.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <img src="${prefill.Poster || 'https://placehold.co/80x120'}" style="width:80px;height:120px;object-fit:cover;border-radius:6px">
      <div style="flex:1">
        <div style="font-weight:700">${prefill.Title || ''} <span class="small">(${prefill.Year||''})</span></div>
        <div class="small" style="margin-top:6px">${prefill.Plot || ''}</div>
        <div style="margin-top:8px" class="form-row">
          <select id="add-type" class="input" style="min-width:140px">
            <option value="Digital">Digital</option><option value="DVD">DVD</option><option value="Blu-ray">Blu-ray</option>
            <option value="VHS">VHS</option><option value="Telegram">Telegram</option><option value="Arquivo">Arquivo</option><option value="Outro">Outro</option>
          </select>
          <input id="add-rating" class="input" placeholder="Nota (1-10)" style="width:100px" />
          <input id="add-tags" class="input" placeholder="Tags (vírgula)" style="min-width:160px" />
          <label style="display:flex;align-items:center;gap:8px"><input id="add-watched" type="checkbox"> Assistido</label>
          <label style="display:flex;align-items:center;gap:8px"><input id="add-favorite" type="checkbox"> Favorito</label>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">
      <button id="cancel-add" class="btn ghost">Cancelar</button>
      <button id="confirm-add" class="btn">Adicionar</button>
    </div>
  `;
  searchResults.appendChild(form);
  document.getElementById('cancel-add').onclick = () => { searchResults.innerHTML = ''; };
  document.getElementById('confirm-add').onclick = async () => {
    if (!currentUser) { showMsg('Faça login para salvar.', 'error'); return; }
    const Type = document.getElementById('add-type').value;
    const Rating = Number(document.getElementById('add-rating').value) || null;
    const Tags = document.getElementById('add-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
    const Watched = document.getElementById('add-watched').checked;
    const Favorite = document.getElementById('add-favorite').checked;

    const already = prefill.imdbID ? localMovies.find(m => m.imdbID === prefill.imdbID) :
      localMovies.find(m => m.Title.toLowerCase() === (prefill.Title||'').toLowerCase() && (m.Year||'') === (prefill.Year||''));
    if (already) { showMsg('Filme já existe na coleção.', 'error'); return; }

    const movie = {
      Title: prefill.Title || '', Year: prefill.Year || '', Poster: prefill.Poster || '', imdbID: prefill.imdbID||null,
      Genre: prefill.Genre||null, Director: prefill.Director||null, Type, Rating, Tags, Watched, Favorite,
      userId: currentUser.uid, createdAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, 'movies'), movie);
      showMsg(`"${movie.Title}" salvo.`, 'success');
      searchResults.innerHTML = ''; searchTitle.value = '';
    } catch (err) {
      console.error(err); showMsg('Erro ao salvar.', 'error');
    }
  };
}

// manual add
manualAddBtn.addEventListener('click', async () => {
  if (!currentUser) { showMsg('Faça login para adicionar.', 'error'); return; }
  const title = manualTitle.value.trim();
  if (!title) { showMsg('Digite título.', 'error'); return; }
  const Year = manualYear.value.trim() || '';
  const Type = manualType.value;
  if (localMovies.find(m => (m.Title||'').toLowerCase() === title.toLowerCase() && (m.Year||'') === Year)) { showMsg('Filme já existe.', 'error'); return; }
  try {
    const movie = { Title: title, Year, Poster:'', imdbID: null, Type, Watched:false, Favorite:false, Rating:null, Tags:[], userId: currentUser.uid, createdAt: serverTimestamp() };
    await addDoc(collection(db, 'movies'), movie);
    manualTitle.value = ''; manualYear.value = '';
    showMsg('Adicionado manualmente.', 'success');
  } catch (err) {
    console.error(err); showMsg('Erro ao adicionar.', 'error');
  }
});

// --- render logic ---
function renderAll() {
  counters.all.textContent = localMovies.length;
  counters.dvd.textContent = localMovies.filter(m=>m.Type==='DVD').length;
  counters.digital.textContent = localMovies.filter(m=>m.Type==='Digital').length;
  counters.vhs.textContent = localMovies.filter(m=>m.Type==='VHS').length;

  let filtered = localMovies.slice();
  if (currentFilter === 'watched') filtered = filtered.filter(m=>m.Watched);
  else if (currentFilter === 'favorite') filtered = filtered.filter(m=>m.Favorite);
  else if (currentFilter !== 'all') filtered = filtered.filter(m=>m.Type === currentFilter);

  collectionEl.innerHTML = '';
  if (filtered.length === 0) {
    collectionEl.innerHTML = `<div class="container-card" style="padding:30px;text-align:center;color:var(--muted)">Nenhum filme nessa categoria.</div>`;
    return;
  }

  filtered.forEach(m => {
    const card = document.createElement('div'); card.className = 'movie-card';
    card.innerHTML = `
      <div style="position:relative">
        <a href="detalhes.html?id=${m.id}">
          <img class="poster" src="${m.Poster || 'https://placehold.co/400x600?text='+encodeURIComponent(m.Title)}" alt="">
        </a>
        <div class="icons">
          <div class="icon-btn ${m.Favorite ? 'active':''}" title="Favorito" data-action="favorite" data-id="${m.id}"><i class="fas fa-heart"></i></div>
          <div class="icon-btn ${m.Watched ? 'active':''}" title="Assistido" data-action="watched" data-id="${m.id}"><i class="fas fa-eye"></i></div>
        </div>
      </div>
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700">${m.Title}</div>
            <div class="small">${m.Year || ''} • ${m.Type || '—'}</div>
          </div>
          <div class="small">${m.Rating ? '⭐ '+m.Rating : ''}</div>
        </div>
        <div class="small">${m.Director ? 'Dir: '+m.Director : ''}</div>
        <div style="margin-top:auto;display:flex;gap:8px">
          <button class="btn ghost" data-action="edit" data-id="${m.id}">Editar</button>
          <button class="btn" data-action="delete" data-id="${m.id}" style="background:var(--danger)">Remover</button>
        </div>
      </div>
    `;
    collectionEl.appendChild(card);
  });
}

// event delegation for collection
collectionEl.addEventListener('click', async (ev) => {
  const target = ev.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (action === 'delete') {
    if (!confirm('Remover esse filme?')) return;
    try { await deleteDoc(doc(db, 'movies', id)); showMsg('Removido', 'success'); } catch(err){console.error(err); showMsg('Erro ao remover','error')}
  } else if (action === 'watched' || action === 'favorite') {
    const movie = localMovies.find(x=>x.id===id);
    if (!movie) return;
    const ref = doc(db, 'movies', id);
    try { await updateDoc(ref, { [action === 'watched' ? 'Watched' : 'Favorite']: !movie[action === 'watched' ? 'Watched' : 'Favorite'] } ); } catch(err){console.error(err); showMsg('Erro ao atualizar','error')}
  } else if (action === 'edit') {
    const movie = localMovies.find(x=>x.id===id);
    if (!movie) return;
    // open detalhes.html for full edition
    window.location.href = `detalhes.html?id=${id}`;
  }
});

// tabs
tabsEl.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    tabsEl.querySelector('.active').classList.remove('active');
    t.classList.add('active');
    currentFilter = t.dataset.filter;
    renderAll();
  });
});

// quick toast
function showMsg(text, type='success') {
  console.log('MSG:', text);
  const previous = document.querySelector('.__quick_msg');
  if (previous) previous.remove();
  const el = document.createElement('div');
  el.className = '__quick_msg container-card';
  el.style.position = 'fixed'; el.style.right='12px'; el.style.bottom='12px'; el.style.zIndex = 9999;
  el.style.padding = '10px 14px';
  el.style.background = type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
  el.style.color = type === 'success' ? '#8ef3c0' : '#ffc7c7';
  el.innerText = text;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 3500);
}