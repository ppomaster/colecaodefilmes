// firebase.js (module) - inicializa Firebase e exporta auth + db helpers
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// substitua se quiser outro projeto; por padrão usei o config que você forneceu
const firebaseConfig = {
  apiKey: "AIzaSyBu6FyItXddK1pghqaEURKaMiQTMQZlJks",
  authDomain: "colecaodefilmes-dfa7a.firebaseapp.com",
  projectId: "colecaodefilmes-dfa7a",
  storageBucket: "colecaodefilmes-dfa7a.appspot.com",
  messagingSenderId: "495818238503",
  appId: "1:495818238503:web:814178c233d5fb304a7c02"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// tentativa de persistência local (IndexedDB) — boa para offline
enableIndexedDbPersistence(db).catch(err => {
  console.warn('IndexedDB persistence não disponível:', err && err.message ? err.message : err);
});

export { app, auth, provider, db, serverTimestamp };