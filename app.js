import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_BUCKET",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};
const TMDB_KEY = "SUA_TMDB_KEY";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
const manualAddBtn = document.getElementById('manual-add-btn');
const collectionEl = document.getElementById('collection');
const tabsEl = document.getElementById('tabs');

let currentUser = null;
let unsubscribe = null;
let localMovies = [];
let currentFilter = 'all';

function showMsg(text,type='success'){alert(text);}

// ===== LOGIN =====
btnLogin.onclick=async()=>{try{await signInWithEmailAndPassword(auth,emailInput.value.trim(),passwordInput.value);}catch(e){showMsg(e.message,'error');}};
btnSignup.onclick=async()=>{try{await createUserWithEmailAndPassword(auth,emailInput.value.trim(),passwordInput.value);}catch(e){showMsg(e.message,'error');}};
btnGoogle.onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){showMsg(e.message,'error');}};
btnLogout.onclick=async()=>{if(unsubscribe){unsubscribe();unsubscribe=null;}await signOut(auth);};

onAuthStateChanged(auth,user=>{
  currentUser=user;
  if(user){
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    userEmailSpan.textContent=user.email;
    startListeningMovies();
  } else {
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    if(unsubscribe){unsubscribe();unsubscribe=null;}
  }
});

// ===== FIRESTORE LISTEN =====
function startListeningMovies(){
  if(!currentUser) return;
  const q=query(collection(db,'movies'),where('userId','==',currentUser.uid));
  unsubscribe=onSnapshot(q,snap=>{
    localMovies=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderAll();
  });
}

// ===== SEARCH TMDB =====
searchBtn.onclick=async()=>{
  const q=searchTitle.value.trim(); if(!q) return;
  searchResults.innerHTML='Carregando...';
  try{
    const res=await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=pt-BR`);
    const data=await res.json();
    searchResults.innerHTML='';
    if(data.results && data.results.length){
      data.results.slice(0,7).forEach(f=>{
        const el=document.createElement('div');
        el.className='result-item';
        el.innerHTML=`<img src="${f.poster_path?'https://image.tmdb.org/t/p/w200'+f.poster_path:'https://placehold.co/80x120'}">
        <div style="flex:1"><div>${f.title}</div><div class="small">${f.release_date?.split('-')[0]}</div></div>
        <div><button class="btn">Selecionar</button></div>`;
        el.querySelector('button').onclick=()=>openAddDialog({
          Title:f.title,Year:f.release_date?.split('-')[0],Poster:f.poster_path?'https://image.tmdb.org/t/p/w200'+f.poster_path:'',Overview:f.overview
        });
        searchResults.appendChild(el);
      });
    } else {searchResults.innerHTML='Nenhum resultado.';}
  }catch(e){searchResults.innerHTML='Erro ao buscar.';}
};

// ===== MANUAL ADD =====
manualAddBtn.onclick=()=> {
  const title=manualTitle.value.trim();
  if(!title) return showMsg('Digite um título');
  const year=manualYear.value.trim();
  const checkboxes=document.querySelectorAll('#manual-add-btn ~ .form-checkboxes input:checked');
  const types=Array.from(checkboxes).map(c=>c.value);
  openAddDialog({Title:title,Year:year,Types:types,Poster:'',Overview:''});
};

// ===== ADD DIALOG =====
async function openAddDialog(movie){
  // Tradução da sinopse via TMDb já em português
  const docRef = await addDoc(collection(db,'movies'),{
    userId: currentUser.uid,
    title: movie.Title,
    year: movie.Year||'',
    poster: movie.Poster||'',
    overview: movie.Overview||'',
    types: movie.Types||[],
    favorite: false,
    watched: false,
    tags: generateTags(movie.Overview||''),
    timestamp: serverTimestamp()
  });
  showMsg('Filme adicionado!');
}

// ===== TAGS AUTOMÁTICAS =====
function generateTags(text){
  if(!text) return [];
  text=text.toLowerCase();
  const words=text.match(/\b\w{4,}\b/g)||[];
  const stopwords=['com','uma','sobre','este','essa','entre','anos','film','seu'];
  return [...new Set(words.filter(w=>!stopwords.includes(w)))];
}

// ===== RENDER COLLECTION =====
function renderAll(){
  const filtered=localMovies.filter(f=>{
    if(currentFilter==='all') return true;
    if(currentFilter==='watched') return f.watched;
    if(currentFilter==='favorite') return f.favorite;
    return f.types?.includes(currentFilter);
  });
  collectionEl.innerHTML='';
  filtered.forEach(f=>{
    const el=document.createElement('div');
    el.className='movie-card';
    el.innerHTML=`
      <img class="poster" src="${f.poster||'https://placehold.co/160x240'}" />
      <div class="card-body">
        <div><b>${f.title}</b> (${f.year||''})</div>
        <div class="small">${f.types?.join(', ')||''}</div>
        <div class="small">${f.tags?.slice(0,5).join(', ')||''}</div>
        <div class="icons">
          <div class="icon-btn edit"><i class="fa fa-pen"></i></div>
          <div class="icon-btn details"><i class="fa fa-info-circle"></i></div>
        </div>
      </div>`;
    // clique na capa abre detalhes
    el.querySelector('.poster').onclick=()=>openEdit(f);
    el.querySelector('.icon-btn.edit').onclick=()=>openEdit(f);
    el.querySelector('.icon-btn.details').onclick=()=>openEdit(f);
    collectionEl.appendChild(el);
  });
}

// ===== EDIT / DETALHES =====
function openEdit(movie){
  const newTitle=prompt('Título:',movie.title);
  if(newTitle===null) return;
  const newTypes=prompt('Tipos (separados por vírgula):',movie.types?.join(','));
  const newOverview=prompt('Sinopse:',movie.overview||'');
  updateDoc(doc(db,'movies',movie.id),{
    title:newTitle,
    types:newTypes?newTypes.split(',').map(t=>t.trim()):[],
    overview:newOverview,
    tags:generateTags(newOverview)
  });
}

// ===== TABS =====
tabsEl.querySelectorAll('.tab').forEach(tab=>{
  tab.onclick=()=>{
    tabsEl.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter=tab.dataset.filter;
    renderAll();
  };
});