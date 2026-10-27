// ---------- Store In-Memory Sécurisé (Zéro Persistance Disque) ----------
// Spécifique Bouygues Telecom : les historiques ne résident que dans la RAM de la session courante

let inMemoryHistory = [];

function initDB() {
  return Promise.resolve(inMemoryHistory);
}
window.initDB = initDB;

async function dbSave(item) {
  const existingIdx = inMemoryHistory.findIndex(x => x.id === item.id);
  if (existingIdx >= 0) {
    inMemoryHistory[existingIdx] = item;
  } else {
    inMemoryHistory.unshift(item);
  }
  return Promise.resolve();
}
window.dbSave = dbSave;

async function dbLoadAll() {
  return Promise.resolve([...inMemoryHistory].sort((a, b) => b.id - a.id));
}
window.dbLoadAll = dbLoadAll;

async function dbDelete(id) {
  inMemoryHistory = inMemoryHistory.filter(x => x.id !== id);
  return Promise.resolve();
}
window.dbDelete = dbDelete;

async function dbClear() {
  inMemoryHistory = [];
  return Promise.resolve();
}
window.dbClear = dbClear;

// ---------- Primitives Globales de Sécurité (Bouygues Telecom - AuditFlow Pro) ----------

// 1. Filtrage et assainissement des logs de console en production / recette
(function () {
  try {
    const isLocal = typeof location !== 'undefined' && (
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1' ||
      location.protocol === 'file:'
    );
    const forceDebug = typeof location !== 'undefined' && (
      location.search.includes('debug=1') ||
      location.hash.includes('debug=1')
    );

    if (!isLocal && !forceDebug) {
      const noop = function () {};
      window._debugLog = console.log;
      console.log = noop;
      console.debug = noop;
      console.info = noop;
      // Note : console.warn et console.error restent actifs pour permettre le diagnostic des erreurs réelles
    }
  } catch (e) { }
})();

// 2. Échappement HTML & Protection contre les failles XSS (DOM Sanitization)
window.escapeHtml = function (str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
};
window.esc = window.escapeHtml;

// 3. Neutralisation de l'injection de formules CSV / Excel (CWE-1236)
window.sanitizeFormula = function (s) {
  if (s == null) return '';
  let str = String(s);
  if (/^[=+\-@\t\r;]/.test(str)) {
    return "'" + str;
  }
  return str;
};

window.sanitizeAoA = function (aoa) {
  if (!Array.isArray(aoa)) return [];
  return aoa.map(row => {
    if (!Array.isArray(row)) return row;
    return row.map(cell => typeof cell === 'string' ? window.sanitizeFormula(cell) : cell);
  });
};
window.lintSafeAoA = window.sanitizeAoA;




