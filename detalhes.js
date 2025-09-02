// detalhes.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { firebaseConfig } from './config.js'; 

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const container = document.getElementById('movie-details-container');
const pageTitle = document.getElementById('page-title');

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');

if (!movieId) {
  container.innerHTML = 'ID do filme não encontrado.';
} else {
  loadMovieDetails(movieId);
}

async function loadMovieDetails(id) {
  const docRef = doc(db, 'movies', id);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const movie = { id: docSnap.id, ...docSnap.data() };
      renderDetailsForm(movie);
    } else {
      container.innerHTML = 'Filme não encontrado.';
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = 'Erro ao carregar os detalhes.';
  }
}

function renderDetailsForm(movie) {
  pageTitle.textContent = movie.Title || 'Detalhes do Filme';
  container.innerHTML = `
    <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">
      <img src="${movie.Poster || 'https://placehold.co/180x270?text='+encodeURIComponent(movie.Title)}" style="width:180px;height:270px;object-fit:cover;border-radius:8px">
      <div style="flex:1">
        <div style="font-weight:700;font-size:24px">${movie.Title} <span class="small">(${movie.Year||''})</span></div>
        <div class="small" style="margin-top:6px">Diretor: ${movie.Director || 'N/A'} | Gênero: ${movie.Genre || 'N/A'}</div>
        <div class="small" style="margin-top:8px">${movie.Plot || 'Sinopse não disponível.'}</div>
        
        <div style="margin-top:16px" class="form-row">
          <select id="edit-type" class="input" style="min-width:140px">
            <option value="Digital" ${movie.Type === 'Digital' ? 'selected' : ''}>Digital</option>
            <option value="DVD" ${movie.Type === 'DVD' ? 'selected' : ''}>DVD</option>
            <option value="Blu-ray" ${movie.Type === 'Blu-ray' ? 'selected' : ''}>Blu-ray</option>
            <option value="VHS" ${movie.Type === 'VHS' ? 'selected' : ''}>VHS</option>
            <option value="Telegram" ${movie.Type === 'Telegram' ? 'selected' : ''}>Telegram</option>
            <option value="Arquivo" ${movie.Type === 'Arquivo' ? 'selected' : ''}>Arquivo</option>
            <option value="Outro" ${movie.Type === 'Outro' ? 'selected' : ''}>Outro</option>
          </select>
          <input id="edit-rating" class="input" type="number" step="0.5" min="1" max="10" placeholder="Nota (1-10)" value="${movie.Rating || ''}" />
          <input id="edit-tags" class="input" placeholder="Tags (vírgula)" value="${(movie.Tags||[]).join(', ')}" />
        </div>
        <div style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:8px"><input id="edit-watched" type="checkbox" ${movie.Watched ? 'checked' : ''}> Assistido</label>
          <label style="display:flex;align-items:center;gap:8px"><input id="edit-favorite" type="checkbox" ${movie.Favorite ? 'checked' : ''}> Favorito</label>
        </div>
        
        <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
          <button id="cancel-edit" class="btn ghost">Cancelar</button>
          <button id="save-edit" class="btn">Salvar Alterações</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('cancel-edit').onclick = () => window.history.back();
  document.getElementById('save-edit').onclick = async () => {
    const updatedMovie = {
      Type: document.getElementById('edit-type').value,
      Rating: Number(document.getElementById('edit-rating').value) || null,
      Tags: document.getElementById('edit-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
      Watched: document.getElementById('edit-watched').checked,
      Favorite: document.getElementById('edit-favorite').checked
    };
    try {
      await updateDoc(doc(db, 'movies', movie.id), updatedMovie);
      alert('Filme atualizado com sucesso!');
      window.history.back();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar as alterações.');
    }
  };
}
