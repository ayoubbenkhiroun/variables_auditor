// ---------- Store In-Memory Sécurisé (Zéro Persistance Disque) ----------
// Spécifique Bouygues Telecom : les historiques ne résident que dans la RAM de la session courante

let inMemoryHistory = [];

function initDB() {
  return Promise.resolve(inMemoryHistory);
}

async function dbSave(item) {
  const existingIdx = inMemoryHistory.findIndex(x => x.id === item.id);
  if (existingIdx >= 0) {
    inMemoryHistory[existingIdx] = item;
  } else {
    inMemoryHistory.unshift(item);
  }
  return Promise.resolve();
}

async function dbLoadAll() {
  return Promise.resolve([...inMemoryHistory].sort((a, b) => b.id - a.id));
}

async function dbDelete(id) {
  inMemoryHistory = inMemoryHistory.filter(x => x.id !== id);
  return Promise.resolve();
}

async function dbClear() {
  inMemoryHistory = [];
  return Promise.resolve();
}

