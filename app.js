import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// CONFIG
const firebaseConfig = { /* suas credenciais */ };
const TMDB_API_KEY = "SUA_CHAVE_TMDB";

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
const manualType = document.getElementById('manual-type');
const manualAddBtn = document.getElementById('manual-add-btn');
const collectionEl = document.getElementById('collection');
const tabsEl = document.getElementById('tabs');

let currentUser=null, unsubscribe=null, localMovies=[], currentFilter='all';

// LOGIN
btnLogin.onclick = async()=>{ try { await signInWithEmailAndPassword(auth,emailInput.value,passwordInput.value); } catch(e){authMsg.textContent=e.message;} };
btnSignup.onclick = async()=>{ try { await createUserWithEmailAndPassword(auth,emailInput.value,passwordInput.value); } catch(e){authMsg.textContent=e.message;} };
btnGoogle.onclick = async()=>{ try { await signInWithPopup(auth,new GoogleAuthProvider()); } catch(e){authMsg.textContent=e.message;} };
btnLogout.onclick = async()=>{ if(unsubscribe){unsubscribe();unsubscribe=null;} await signOut(auth); };

onAuthStateChanged(auth,user=>{
  currentUser=user;
  if(user){ loginScreen.classList.add('hidden'); appScreen.classList.remove('hidden'); userEmailSpan.textContent=user.email; startListeningMovies(); }
  else { loginScreen.classList.remove('hidden'); appScreen.classList.add('hidden'); userEmailSpan.textContent=''; if(unsubscribe){unsubscribe();unsubscribe=null;} }
});

// FIRESTORE
function startListeningMovies(){
  if(!currentUser)return;
  const col=query(collection(db,'movies'),where('userId','==',currentUser.uid));
  unsubscribe=onSnapshot(col,snapshot=>{ localMovies=snapshot.docs.map(d=>({id:d.id,...d.data()})); renderAll(); });
}

// SEARCH TMDb
searchBtn.onclick=async()=>{
  const title=searchTitle.value.trim(); if(!title)return;
  searchResults.innerHTML='Buscando...';
  try{
    const res=await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(title)}`);
    const data=await res.json();
    if(data.results && data.results.length){
      searchResults.innerHTML='';
      data.results.slice(0,7).forEach(item=>{
        const el=document.createElement('div'); el.className='result-item';
        el.innerHTML=`<img src="https://image.tmdb.org/t/p/w200${item.poster_path||''}" />
        <div style="flex:1"><div style="font-weight:700">${item.title}</div><div class="small">${item.release_date||''}</div><div class="small">${item.overview||''}</div></div>
        <button class="btn" data-id="${item.id}">Adicionar</button>`;
        el.querySelector('button').onclick=()=>quickAddTMDb(item);
        searchResults.appendChild(el);
      });
    }else searchResults.innerHTML='Nenhum resultado.';
  }catch(e){searchResults.innerHTML='Erro ao buscar.';}
};

// QUICK ADD TMDb
async function quickAddTMDb(item){
  if(!currentUser)return alert('Faça login');
  if(localMovies.find(m=>m.Title===item.title))return alert('Filme já existe');
  try{
    await addDoc(collection(db,'movies'),{
      Title:item.title, Year:item.release_date||'', Poster:item.poster_path?`https://image.tmdb.org/t/p/w500${item.poster_path}`:'', Type:'Digital',
      Watched:false, Favorite:false, Tags:[], userId:currentUser.uid, createdAt:serverTimestamp()
    });
    alert('Filme adicionado!');
  }catch(e){console.error(e);}
}

// MANUAL ADD
manualAddBtn.onclick=async()=>{
  if(!currentUser)return alert('Faça login');
  const title=manualTitle.value.trim(); if(!title)return alert('Digite título');
  const Year=manualYear.value.trim(); const Type=manualType.value;
  if(localMovies.find(m=>m.Title.toLowerCase()===title.toLowerCase()&&m.Year===Year))return alert('Já existe');
  try{ await addDoc(collection(db,'movies'),{Title:title,Year,Type,Watched:false,Favorite:false,Tags:[],userId:currentUser.uid,createdAt:serverTimestamp()}); manualTitle.value=''; manualYear.value=''; alert('Adicionado!'); }catch(e){console.error(e);}
};

// RENDER
function renderAll(){
  let filtered=localMovies.slice();
  if(currentFilter==='watched')filtered=filtered.filter(m=>m.Watched);
  else if(currentFilter==='favorite')filtered=filtered.filter(m=>m.Favorite);
  else if(currentFilter!=='all')filtered=filtered.filter(m=>m.Type===currentFilter);

  collectionEl.innerHTML='';
  filtered.forEach(movie=>{
    const el=document.createElement('div');
    el.className='movie-card';
    el.innerHTML=`
      <img class="poster" src="${movie.Poster||'https://via.placeholder.com/200x300?text=Sem+Imagem'}" />
      <div class="card-body">
        <div style="font-weight:700">${movie.Title} ${movie.Year?`(${movie.Year})`:''}</div>
        <div class="small">${movie.Type}</div>
        <div class="flex" style="gap:6px;">
          <button class="btn" data-action="toggleWatched">${movie.Watched?'✅ Assistido':'📌 Marcar'}</button>
          <button class="btn" data-action="toggleFav">${movie.Favorite?'❤️':'🤍'}</button>
          <button class="btn" data-action="delete" style="background:var(--danger)">🗑</button>
        </div>
      </div>
    `;
    // Eventos
    el.querySelector('[data-action="toggleWatched"]').onclick=async()=>{
      await updateDoc(doc(db,'movies',movie.id),{Watched:!movie.Watched});
    };
    el.querySelector('[data-action="toggleFav"]').onclick=async()=>{
      await updateDoc(doc(db,'movies',movie.id),{Favorite:!movie.Favorite});
    };
    el.querySelector('[data-action="delete"]').onclick=async()=>{
      if(confirm('Tem certeza?')) await deleteDoc(doc(db,'movies',movie.id));
    };

    collectionEl.appendChild(el);
  });
}

// TABS
tabsEl.querySelectorAll('.tab').forEach(tab=>{
  tab.onclick=()=>{
    tabsEl.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter=tab.dataset.filter;
    renderAll();
  };
});