/**
 * Bouygues Telecom - AuditFlow Pro
 * Moteur de Détection Intelligente des Doublons & Cohérence des Variables BPMN
 * Module enrichi avec Diff Visuel, Matrice Synthétique & Graphe de Constellation Vis.js
 */

(function(window) {
  'use strict';

  // Dictionnaire d'abréviations et synonymes courants en BPMN/Camunda
  const COMMON_SYNONYMS = {
    'id': 'id',
    'identifiant': 'id',
    'identifier': 'id',
    'ref': 'reference',
    'reference': 'reference',
    'num': 'number',
    'nbr': 'number',
    'numero': 'number',
    'number': 'number',
    'mt': 'montant',
    'montant': 'montant',
    'amount': 'montant',
    'dt': 'date',
    'date': 'date',
    'statut': 'status',
    'status': 'status',
    'state': 'status',
    'etat': 'status',
    'nom': 'name',
    'name': 'name',
    'prenom': 'firstname',
    'firstname': 'firstname',
    'adr': 'address',
    'adresse': 'address',
    'address': 'address',
    'tel': 'phone',
    'telephone': 'phone',
    'phone': 'phone',
    'mail': 'email',
    'email': 'email',
    'courriel': 'email',
    'cmd': 'order',
    'commande': 'order',
    'order': 'order',
    'cli': 'client',
    'client': 'client',
    'customer': 'client',
    'usr': 'user',
    'user': 'user',
    'utilisateur': 'user',
    'msg': 'message',
    'message': 'message',
    'doc': 'document',
    'document': 'document',
    'desc': 'description',
    'description': 'description',
    'err': 'error',
    'error': 'error',
    'erreur': 'error'
  };

  // Options par défaut du moteur de détection
  const DEFAULT_DUPLICATES_OPTIONS = {
    similarityThreshold: 0.80,     // Seuil de similarité (80%)
    ignoreCaseAndSeparators: true,  // Xnodes == xnodes == x_nodes == X_NODES
    ignoreTokenOrder: true,         // clientId == idClient == client_id == id_client
    enableFuzzyMatch: true,         // Tolérance aux coquilles (Levenshtein / Jaro-Winkler)
    enableSingularPlural: true,     // node == nodes
    enableSynonyms: false,          // refClient == idClient (optionnel)
    scope: 'all',                   // 'all' (global), 'intra' (même processus), 'inter' (processus différents)
    search: '',                     // Filtre de recherche
    filterDiscrepancy: 'all'        // 'all', 'case_sep', 'permutation', 'fuzzy', 'plural', 'synonym'
  };

  /**
   * Suppression des accents
   */
  function stripAccents(str) {
    if (!str) return '';
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Échappement HTML sécurisé
   */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Découpe un identifiant de variable en tokens élémentaires
   * Gère camelCase, PascalCase, snake_case, kebab-case, points, etc.
   * Exemple: "customer_id", "customerId", "Customer-ID", "idClient"
   */
  function tokenizeVariableName(name) {
    if (!name) return [];
    let clean = stripAccents(String(name).trim());
    
    // Remplacer séparateurs par des espaces
    clean = clean.replace(/[_\-.\s/\\:]+/g, ' ');
    
    // Insérer un espace entre minuscule et majuscule (ex: "customerName" -> "customer Name")
    clean = clean.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    
    // Insérer un espace entre séquence de majuscules et minuscule suivante (ex: "XMLParser" -> "XML Parser")
    clean = clean.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    
    // Découper et nettoyer
    const tokens = clean.split(/\s+/).map(t => t.toLowerCase().trim()).filter(Boolean);
    return tokens;
  }

  /**
   * Normalisation singulier / pluriel simple (anglais / français)
   */
  function normalizePlural(token) {
    if (!token || token.length <= 3) return token;
    if (token.endsWith('ies') && token.length > 4) {
      return token.slice(0, -3) + 'y';
    }
    if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
      return token.slice(0, -1);
    }
    if (token.endsWith('x') && token.length > 4) {
      return token.slice(0, -1);
    }
    return token;
  }

  /**
   * Clé normalisée stricte (sans casse ni séparateurs)
   * Exemple: "x_nodes" -> "xnodes", "XNodes" -> "xnodes"
   */
  function getStrictNormalizedKey(name) {
    if (!name) return '';
    return stripAccents(String(name)).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Clé canonique des tokens (Bag of Words ordonné)
   * Exemple: "idClient" -> "client_id", "clientId" -> "client_id"
   */
  function getCanonicalTokenKey(name, useSingular = true, useSynonyms = false) {
    let tokens = tokenizeVariableName(name);
    if (!tokens.length) return '';
    
    if (useSynonyms) {
      tokens = tokens.map(t => COMMON_SYNONYMS[t] || t);
    }
    if (useSingular) {
      tokens = tokens.map(normalizePlural);
    }
    
    tokens.sort();
    return tokens.join('_');
  }

  /**
   * Distance de Levenshtein entre 2 chaînes
   */
  function levenshteinDistance(s1, s2) {
    const a = s1 || '';
    const b = s2 || '';
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const d = [];
    for (let i = 0; i <= m; i++) d[i] = [i];
    for (let j = 0; j <= n; j++) d[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,      // suppression
          d[i][j - 1] + 1,      // insertion
          d[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return d[m][n];
  }

  /**
   * Score de similarité Levenshtein normalisé [0..1]
   */
  function levenshteinSimilarity(s1, s2) {
    const maxLen = Math.max((s1 || '').length, (s2 || '').length);
    if (maxLen === 0) return 1.0;
    const dist = levenshteinDistance(s1, s2);
    return Math.max(0, 1 - (dist / maxLen));
  }

  /**
   * Similarité Jaro-Winkler (idéal pour les noms courts et préfixes identiques)
   */
  function jaroWinklerSimilarity(s1, s2) {
    const str1 = s1 || '';
    const str2 = s2 || '';
    if (str1 === str2) return 1.0;
    if (!str1.length || !str2.length) return 0.0;

    const matchWindow = Math.max(0, Math.floor(Math.max(str1.length, str2.length) / 2) - 1);
    const matches1 = new Array(str1.length).fill(false);
    const matches2 = new Array(str2.length).fill(false);

    let matchCount = 0;
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, str2.length);
      for (let j = start; j < end; j++) {
        if (!matches2[j] && str1[i] === str2[j]) {
          matches1[i] = true;
          matches2[j] = true;
          matchCount++;
          break;
        }
      }
    }

    if (matchCount === 0) return 0.0;

    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < str1.length; i++) {
      if (matches1[i]) {
        while (!matches2[k]) k++;
        if (str1[i] !== str2[k]) transpositions++;
        k++;
      }
    }

    const jaro = ((matchCount / str1.length) + (matchCount / str2.length) + ((matchCount - (transpositions / 2)) / matchCount)) / 3.0;

    // Winkler prefix scale (max 4 chars)
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(str1.length, str2.length)); i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }

    return jaro + (prefix * 0.1 * (1 - jaro));
  }

  /**
   * Similarité composite entre deux noms de variables
   * Retourne un objet { score: 0..1, matchType: string, reason: string }
   */
  function compareVariables(name1, name2, options = DEFAULT_DUPLICATES_OPTIONS) {
    const raw1 = String(name1 || '').trim();
    const raw2 = String(name2 || '').trim();

    if (raw1 === raw2) {
      return { score: 1.0, matchType: 'exact', reason: 'Nom strictement identique' };
    }

    const strict1 = getStrictNormalizedKey(raw1);
    const strict2 = getStrictNormalizedKey(raw2);

    // 1. Même nom en ignorant la casse et les séparateurs (ex: Xnodes, x_nodes, xnodes)
    if (options.ignoreCaseAndSeparators && strict1 && strict1 === strict2) {
      return {
        score: 0.98,
        matchType: 'case_sep',
        reason: 'Variante de casse ou de séparateur (_ / - / majuscules)'
      };
    }

    // 2. Permutation de mots / tokens (ex: idClient vs clientId vs client_id)
    if (options.ignoreTokenOrder) {
      const canon1 = getCanonicalTokenKey(raw1, options.enableSingularPlural, options.enableSynonyms);
      const canon2 = getCanonicalTokenKey(raw2, options.enableSingularPlural, options.enableSynonyms);
      if (canon1 && canon1 === canon2) {
        return {
          score: 0.95,
          matchType: 'permutation',
          reason: 'Inversion ou permutation de mots (ex: idClient / clientId)'
        };
      }
    }

    // 3. Variations singulier / pluriel directes (ex: node vs nodes)
    if (options.enableSingularPlural) {
      const sing1 = normalizePlural(strict1);
      const sing2 = normalizePlural(strict2);
      if (sing1 && sing1 === sing2) {
        return {
          score: 0.92,
          matchType: 'plural',
          reason: 'Variation singulier / pluriel'
        };
      }
    }

    // 4. Fuzzy Match (Levenshtein & Jaro-Winkler)
    if (options.enableFuzzyMatch) {
      const jaro = jaroWinklerSimilarity(strict1, strict2);
      const lev = levenshteinSimilarity(strict1, strict2);
      const fuzzyScore = Math.max(jaro, lev);

      if (fuzzyScore >= options.similarityThreshold) {
        return {
          score: Math.round(fuzzyScore * 100) / 100,
          matchType: 'fuzzy',
          reason: `Similarité lexicale élevée (${Math.round(fuzzyScore * 100)}%) - coquille ou variante proche`
        };
      }
    }

    return { score: 0, matchType: 'none', reason: '' };
  }

  /**
   * Convertit un nom de variable en camelCase propre
   */
  function toCamelCaseFormat(str) {
    if (!str) return '';
    const clean = stripAccents(String(str)).replace(/[^a-zA-Z0-9_\s\-]/g, ' ');
    const tokens = tokenizeVariableName(clean);
    if (!tokens.length) return '';
    return tokens.map((w, i) => {
      w = w.replace(/^[^a-zA-Z0-9]+/, '');
      if (!w) return '';
      return i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1);
    }).filter(Boolean).join('');
  }

  /**
   * Générateur de Diff Visuel Intelligent (Caractère & Token)
   * Génère un rendu HTML enrichi mettant en valeur les divergences
   * @param {string} variantName - Nom de la variante actuelle
   * @param {string} targetName - Nom de la cible recommandée
   * @returns {Object} { variantDiffHtml, targetDiffHtml, diffDescription, matchType }
   */
  function generateVisualDiff(variantName, targetName) {
    const v = String(variantName || '').trim();
    const t = String(targetName || '').trim();

    if (v === t) {
      return {
        variantDiffHtml: `<span class="diff-char-match">${escapeHtml(v)}</span>`,
        targetDiffHtml: `<span class="diff-char-match">${escapeHtml(t)}</span>`,
        diffDescription: 'Identique à la forme recommandée',
        matchType: 'exact'
      };
    }

    const tokensV = tokenizeVariableName(v);
    const tokensT = tokenizeVariableName(t);

    // 1. Cas d'inversion / permutation de tokens (ex: idClient vs clientId)
    const sortedV = [...tokensV].sort().join(' ');
    const sortedT = [...tokensT].sort().join(' ');
    if (sortedV === sortedT && tokensV.length > 1) {
      const vTokensHtml = tokensV.map(tok => `<span class="diff-token-badge perm">${escapeHtml(tok)}</span>`).join('<span class="diff-sep">⇄</span>');
      const tTokensHtml = tokensT.map(tok => `<span class="diff-token-badge target">${escapeHtml(tok)}</span>`).join('');
      return {
        variantDiffHtml: vTokensHtml,
        targetDiffHtml: tTokensHtml,
        diffDescription: 'Inversion de mots détectée',
        matchType: 'permutation'
      };
    }

    // 2. Diff caractère par caractère (Casse, Underscores, Coquilles)
    let vHtml = '';
    let tHtml = '';
    
    // Découpage et comparaison fine
    let i = 0, j = 0;
    while (i < v.length || j < t.length) {
      const charV = v[i];
      const charT = t[j];

      if (charV === charT) {
        vHtml += `<span class="diff-char-match">${escapeHtml(charV)}</span>`;
        tHtml += `<span class="diff-char-match">${escapeHtml(charT)}</span>`;
        i++;
        j++;
      } else if (charV && charT && charV.toLowerCase() === charT.toLowerCase()) {
        // Différence de casse uniquement
        vHtml += `<span class="diff-char-case" title="Casse: '${charV}' ➔ '${charT}'">${escapeHtml(charV)}</span>`;
        tHtml += `<span class="diff-char-case-target">${escapeHtml(charT)}</span>`;
        i++;
        j++;
      } else if (charV && (charV === '_' || charV === '-' || charV === '.')) {
        // Séparateur non présent dans le camelCase cible
        vHtml += `<span class="diff-char-del" title="Séparateur à supprimer">${escapeHtml(charV)}</span>`;
        i++;
      } else if (charT && (charT === '_' || charT === '-' || charT === '.')) {
        tHtml += `<span class="diff-char-add">${escapeHtml(charT)}</span>`;
        j++;
      } else {
        // Substitution / Coquille / Pluriel
        if (charV) {
          vHtml += `<span class="diff-char-diff" title="Caractère divergent: '${charV}'">${escapeHtml(charV)}</span>`;
          i++;
        }
        if (charT) {
          tHtml += `<span class="diff-char-target" title="Attendu: '${charT}'">${escapeHtml(charT)}</span>`;
          j++;
        }
      }
    }

    return {
      variantDiffHtml: vHtml,
      targetDiffHtml: tHtml,
      diffDescription: 'Variante de casse / séparateurs / orthographe',
      matchType: 'char_diff'
    };
  }

  /**
   * Algorithme principal : Détection et regroupement en clusters de doublons
   * @param {Array} rows - Tableau de variables issues de l'audit
   * @param {Object} customOptions - Options de configuration
   */
  function detectVariableDuplicates(rows, customOptions = {}) {
    const options = { ...DEFAULT_DUPLICATES_OPTIONS, ...customOptions };
    if (!Array.isArray(rows) || !rows.length) {
      return {
        clusters: [],
        totalDuplicatesCount: 0,
        totalClustersCount: 0,
        interProcessConflictsCount: 0,
        options
      };
    }

    // Agréger les occurrences par nom exact de variable
    const varOccurrencesMap = new Map();
    rows.forEach(r => {
      const name = String(r.name || '').trim();
      if (!name) return;

      if (!varOccurrencesMap.has(name)) {
        varOccurrencesMap.set(name, {
          name,
          occurrences: [],
          status: r.status,
          suggested: r.suggested || r.editedSuggestion || toCamelCaseFormat(name),
          editedSuggestion: r.editedSuggestion || r.suggested || toCamelCaseFormat(name),
          issues: r.issues || [],
          processes: new Set(),
          files: new Set(),
          roles: new Set(),
          activities: new Set(),
          elementTypes: new Set(),
          expressions: new Set()
        });
      }

      const entry = varOccurrencesMap.get(name);
      entry.occurrences.push(r);
      if (r.parentProcess) entry.processes.add(r.parentProcess);
      if (r.callingProcess) entry.processes.add(r.callingProcess);
      if (r.fileName) entry.files.add(r.fileName);
      if (r.role) entry.roles.add(r.role);
      if (r.elementName || r.elementId) entry.activities.add(r.elementName || r.elementId);
      if (r.elementType) entry.elementTypes.add(r.elementType);
      if (r.expr) entry.expressions.add(r.expr);
    });

    const uniqueVars = Array.from(varOccurrencesMap.values());
    const visited = new Set();
    const clusters = [];
    let clusterCounter = 1;

    for (let i = 0; i < uniqueVars.length; i++) {
      const v1 = uniqueVars[i];
      if (visited.has(v1.name)) continue;

      const currentClusterVars = [v1];
      const matchDetails = [];

      for (let j = i + 1; j < uniqueVars.length; j++) {
        const v2 = uniqueVars[j];
        if (visited.has(v2.name)) continue;

        const comparison = compareVariables(v1.name, v2.name, options);
        if (comparison.score >= options.similarityThreshold) {
          currentClusterVars.push(v2);
          matchDetails.push({
            pair: [v1.name, v2.name],
            score: comparison.score,
            matchType: comparison.matchType,
            reason: comparison.reason
          });
        }
      }

      // Si le cluster contient au moins 2 variantes distinctes
      if (currentClusterVars.length >= 2) {
        currentClusterVars.forEach(v => visited.add(v.name));

        // Déterminer la forme recommandée pour ce cluster
        // 1. Chercher une variante déjà valide ayant le plus d'occurrences
        const validVariants = currentClusterVars.filter(v => v.status === 'valid');
        let recommendedName = '';
        if (validVariants.length > 0) {
          validVariants.sort((a, b) => b.occurrences.length - a.occurrences.length);
          recommendedName = validVariants[0].name;
        } else {
          // 2. Prendre la variante avec le plus d'occurrences ou la meilleure suggestion camelCase
          currentClusterVars.sort((a, b) => b.occurrences.length - a.occurrences.length);
          const topVar = currentClusterVars[0];
          recommendedName = topVar.editedSuggestion || topVar.suggested || toCamelCaseFormat(topVar.name);
        }

        // Agréger tous les processus, fichiers et activités touchés
        const allProcesses = new Set();
        const allFiles = new Set();
        const allActivities = new Set();
        let totalOccurrencesCount = 0;

        currentClusterVars.forEach(v => {
          v.processes.forEach(p => allProcesses.add(p));
          v.files.forEach(f => allFiles.add(f));
          v.activities.forEach(a => allActivities.add(a));
          totalOccurrencesCount += v.occurrences.length;
        });

        // Type de divergence prédominant
        const discrepancyTypes = new Set(matchDetails.map(m => m.matchType));
        let primaryType = 'case_sep';
        let primaryLabel = 'Variantes de Casse & Underscore';
        let badgeClass = 'badge-case';

        if (discrepancyTypes.has('permutation')) {
          primaryType = 'permutation';
          primaryLabel = 'Permutation / Inversion de mots';
          badgeClass = 'badge-perm';
        } else if (discrepancyTypes.has('fuzzy')) {
          primaryType = 'fuzzy';
          primaryLabel = 'Similarité Lexicale / Coquille';
          badgeClass = 'badge-fuzzy';
        } else if (discrepancyTypes.has('plural')) {
          primaryType = 'plural';
          primaryLabel = 'Variante Singulier / Pluriel';
          badgeClass = 'badge-plural';
        }

        // Calcul du score de similarité moyen du cluster
        const avgScore = matchDetails.length
          ? Math.round((matchDetails.reduce((sum, m) => sum + m.score, 0) / matchDetails.length) * 100)
          : 95;

        // Est-ce un conflit inter-processus ?
        const isInterProcess = allProcesses.size > 1;

        // Filtrage selon le périmètre (scope)
        let includeCluster = true;
        if (options.scope === 'intra' && isInterProcess) includeCluster = false;
        if (options.scope === 'inter' && !isInterProcess) includeCluster = false;

        // Filtrage selon la recherche
        if (options.search) {
          const s = options.search.toLowerCase();
          const matchSearch = currentClusterVars.some(v => v.name.toLowerCase().includes(s)) ||
            recommendedName.toLowerCase().includes(s) ||
            Array.from(allProcesses).some(p => p.toLowerCase().includes(s));
          if (!matchSearch) includeCluster = false;
        }

        // Filtrage selon type d'incohérence
        if (options.filterDiscrepancy !== 'all' && primaryType !== options.filterDiscrepancy) {
          includeCluster = false;
        }

        if (includeCluster) {
          const variantsList = currentClusterVars.map(v => {
            const diffInfo = generateVisualDiff(v.name, recommendedName);
            return {
              name: v.name,
              status: v.status,
              occurrencesCount: v.occurrences.length,
              processes: Array.from(v.processes),
              files: Array.from(v.files),
              roles: Array.from(v.roles),
              activities: Array.from(v.activities),
              elementTypes: Array.from(v.elementTypes),
              expressions: Array.from(v.expressions),
              issues: v.issues.map(i => i.msg || i),
              suggested: v.suggested,
              editedSuggestion: v.editedSuggestion,
              diffInfo
            };
          });

          clusters.push({
            id: `cluster_${clusterCounter++}`,
            recommendedName,
            primaryType,
            primaryLabel,
            badgeClass,
            avgSimilarityPercent: avgScore,
            isInterProcess,
            variants: variantsList,
            processes: Array.from(allProcesses),
            files: Array.from(allFiles),
            activities: Array.from(allActivities),
            totalOccurrences: totalOccurrencesCount,
            matchDetails
          });
        }
      }
    }

    // Tri des clusters : Conflits inter-processus d'abord, puis par nombre de variantes décroissant
    clusters.sort((a, b) => {
      if (b.isInterProcess !== a.isInterProcess) return b.isInterProcess ? 1 : -1;
      return b.variants.length - a.variants.length;
    });

    const totalDuplicatesCount = clusters.reduce((sum, c) => sum + c.totalOccurrences, 0);
    const interProcessConflictsCount = clusters.filter(c => c.isInterProcess).length;

    return {
      clusters,
      totalDuplicatesCount,
      totalClustersCount: clusters.length,
      interProcessConflictsCount,
      options
    };
  }

  /**
   * Génération de données de Graphe Réseau (Vis.js Network)
   * Crée une constellation interactive reliant clusters et variantes
   */
  function generateCoherenceGraphData(clusters, selectedClusterId = null) {
    const nodes = [];
    const edges = [];
    const addedNodeIds = new Set();

    if (!Array.isArray(clusters) || !clusters.length) {
      return { nodes, edges };
    }

    const filteredClusters = selectedClusterId
      ? clusters.filter(c => c.id === selectedClusterId)
      : clusters;

    filteredClusters.forEach(c => {
      const clusterNodeId = `hub_${c.id}`;

      // Nœud Hub Central du Cluster (Forme Recommandée)
      nodes.push({
        id: clusterNodeId,
        label: `🎯 ${c.recommendedName}\n[${c.variants.length} var. • ${c.totalOccurrences} occ.]`,
        title: `<b>Cluster ${c.id.toUpperCase()}</b><br>Cible : <code>${c.recommendedName}</code><br>Similarité : ${c.avgSimilarityPercent}%<br>Type : ${c.primaryLabel}<br>Processus : ${c.processes.join(', ')}`,
        shape: 'box',
        color: {
          background: c.isInterProcess ? '#fee2e2' : '#e0f2fe',
          border: c.isInterProcess ? '#ef4444' : '#003882',
          highlight: { background: '#ffedd5', border: '#ea5b0c' }
        },
        font: { color: c.isInterProcess ? '#991b1b' : '#003882', face: 'Outfit, Plus Jakarta Sans, sans-serif', size: 13, bold: true },
        margin: 10,
        borderWidth: c.isInterProcess ? 2.5 : 2,
        shadow: true,
        clusterData: c
      });
      addedNodeIds.add(clusterNodeId);

      // Nœuds Satellites (Variantes de variables)
      c.variants.forEach((v, vIdx) => {
        const varNodeId = `var_${c.id}_${vIdx}`;
        const isTarget = v.name === c.recommendedName;

        let nodeColor = '#ffffff';
        let borderColor = '#94a3b8';
        if (isTarget) {
          nodeColor = '#dcfce7';
          borderColor = '#16a34a';
        } else if (v.status === 'invalid') {
          nodeColor = '#fee2e2';
          borderColor = '#dc2626';
        } else if (v.status === 'warn') {
          nodeColor = '#fef3c7';
          borderColor = '#d97706';
        }

        nodes.push({
          id: varNodeId,
          label: `${isTarget ? '⭐ ' : ''}${v.name}\n(${v.occurrencesCount} occ.)`,
          title: `<b>Variante :</b> <code>${v.name}</code><br>Statut : ${v.status}<br>Processus : ${v.processes.join(', ')}<br>Occurrences : ${v.occurrencesCount}`,
          shape: 'ellipse',
          color: {
            background: nodeColor,
            border: borderColor,
            highlight: { background: '#fff7ed', border: '#ea5b0c' }
          },
          font: { color: '#0f172a', face: 'Fira Code, monospace', size: 11, bold: isTarget },
          borderWidth: isTarget ? 2.5 : 1.5,
          shadow: false,
          variantData: v,
          clusterId: c.id
        });
        addedNodeIds.add(varNodeId);

        // Arête liant le hub à la variante
        edges.push({
          from: clusterNodeId,
          to: varNodeId,
          label: isTarget ? 'Cible (100%)' : `${c.avgSimilarityPercent}%`,
          font: { size: 10, color: '#64748b', align: 'middle', background: '#ffffff' },
          color: { color: isTarget ? '#16a34a' : '#cbd5e1', highlight: '#ea5b0c' },
          dashes: !isTarget,
          width: isTarget ? 2.5 : 1.5,
          smooth: { type: 'continuous' }
        });
      });
    });

    return { nodes, edges };
  }

  // ==========================================
  //   EXPORTS & RAPPORTS MULTI-FORMATS DÉTAILLÉS
  // ==========================================

  /**
   * Export Excel (.xlsx) Détaillé et Multi-Feuilles pour l'Audit des Doublons
   */
  function exportDuplicatesExcel(analysisResult, fileName = 'audit_doublons_coherence_variables.xlsx') {
    if (!window.XLSX) {
      alert("Bibliothèque SheetJS (XLSX) non disponible.");
      return;
    }

    const { clusters, totalDuplicatesCount, totalClustersCount, interProcessConflictsCount, options } = analysisResult;
    const wb = XLSX.utils.book_new();
    const nowStr = new Date().toLocaleString('fr-FR');

    // 1. Feuille Synthèse & KPIs
    const summaryData = [
      ['AUDITFLOW PRO - RAPPORT D\'AUDIT DES DOUBLONS & COHÉRENCE DES VARIABLES BPMN'],
      ['Date de génération', nowStr],
      ['Seuil de similarité appliqué', `${Math.round((options.similarityThreshold || 0.8) * 100)}%`],
      ['Périmètre d\'analyse', options.scope === 'all' ? 'Global (Tous Processus)' : options.scope === 'inter' ? 'Conflits Inter-Processus Uniquement' : 'Intra-Processus Uniquement'],
      [],
      ['MÉTRIQUES CLÉS DES DOUBLONS', 'VALEUR', 'INTERPRÉTATION GOUVERNANCE'],
      ['Nombre total de clusters de doublons', totalClustersCount, 'Groupes de variables représentant la même donnée métier'],
      ['Nombre d\'occurrences impactées', totalDuplicatesCount, 'Total des variables à harmoniser dans les modèles'],
      ['Conflits Inter-Processus', interProcessConflictsCount, 'Variables écrites différemment entre plusieurs processus'],
      ['Critère Casse & Séparateurs', options.ignoreCaseAndSeparators ? 'Activé' : 'Désactivé', 'Ex: x_nodes vs Xnodes'],
      ['Critère Permutations Tokens', options.ignoreTokenOrder ? 'Activé' : 'Désactivé', 'Ex: clientId vs idClient'],
      ['Critère Similarité Fuzzy (Levenshtein)', options.enableFuzzyMatch ? 'Activé' : 'Désactivé', 'Tolérance aux coquilles et fautes de frappe'],
      ['Critère Singulier / Pluriel', options.enableSingularPlural ? 'Activé' : 'Désactivé', 'Ex: node vs nodes']
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(summaryData) : summaryData);
    wsSummary['!cols'] = [{ wch: 42 }, { wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthèse & Indicateurs');

    // 2. Feuille Inventaire Détaillé des Clusters & Variantes
    const detailsHeader = [
      'ID Cluster',
      'Nom Recommandé (Cible)',
      'Type d\'Incohérence',
      'Taux de Similarité (%)',
      'Conflit Inter-Processus',
      'Variable Originale (Variante)',
      'Statut de Conformité',
      'Processus Associés',
      'Fichiers BPMN Sources',
      'Activités Impliquées',
      'Occurrences',
      'Problèmes Détectés'
    ];
    const detailsData = [detailsHeader];

    clusters.forEach(c => {
      c.variants.forEach(v => {
        detailsData.push([
          c.id,
          c.recommendedName,
          c.primaryLabel,
          `${c.avgSimilarityPercent}%`,
          c.isInterProcess ? 'OUI (Multi-Processus)' : 'NON (Intra-Processus)',
          v.name,
          v.status === 'valid' ? 'Conforme' : v.status === 'warn' ? 'Avertissement' : 'Non conforme',
          v.processes.join(', '),
          v.files.join(', '),
          (v.activities || []).join(', ') || 'N/A',
          v.occurrencesCount,
          v.issues.join('; ') || 'Aucun'
        ]);
      });
    });

    const wsDetails = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(detailsData) : detailsData);
    wsDetails['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 32 }, { wch: 16 }, { wch: 22 },
      { wch: 28 }, { wch: 18 }, { wch: 35 }, { wch: 30 }, { wch: 35 }, { wch: 12 }, { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Détail des Clusters');

    // 3. Feuille Matrice des Conflits Inter-Processus
    const interHeader = ['Nom Recommandé', 'Variantes en Conflit', 'Nombre de Variantes', 'Processus Impliqués', 'Impact'];
    const interData = [interHeader];

    clusters.filter(c => c.isInterProcess).forEach(c => {
      interData.push([
        c.recommendedName,
        c.variants.map(v => `${v.name} (${v.processes.join('/')})`).join('  |  '),
        c.variants.length,
        c.processes.join(', '),
        c.totalOccurrences > 5 ? 'ÉLEVÉ (Flux critiques)' : 'MOYEN'
      ]);
    });

    const wsInter = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(interData) : interData);
    wsInter['!cols'] = [{ wch: 25 }, { wch: 55 }, { wch: 18 }, { wch: 40 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsInter, 'Conflits Inter-Processus');

    // 4. Feuille Plan d'Harmonisation & Suggestions Auto-Fix
    const fixHeader = ['Variable Source Actuelle', 'Remplacement Cible Recommandé', 'Cluster ID', 'Processus', 'Action Recommandée'];
    const fixData = [fixHeader];

    clusters.forEach(c => {
      c.variants.forEach(v => {
        if (v.name !== c.recommendedName) {
          fixData.push([
            v.name,
            c.recommendedName,
            c.id,
            v.processes.join(', '),
            `Harmoniser vers "${c.recommendedName}" dans les modèles XML`
          ]);
        }
      });
    });

    const wsFix = XLSX.utils.aoa_to_sheet(window.sanitizeAoA ? window.sanitizeAoA(fixData) : fixData);
    wsFix['!cols'] = [{ wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 35 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsFix, 'Plan d\'Harmonisation');

    XLSX.writeFile(wb, fileName);
  }

  /**
   * Export CSV (.csv) Ligne par Ligne
   */
  function exportDuplicatesCSV(analysisResult, fileName = 'audit_doublons_variables.csv') {
    const { clusters } = analysisResult;
    const header = 'Cluster_ID,Nom_Recommande,Type_Incoherence,Similarite_Pct,Conflit_InterProcess,Variable_Variante,Statut,Processus,Fichiers,Occurrences,Problemes\n';
    
    const rows = [];
    clusters.forEach(c => {
      c.variants.forEach(v => {
        rows.push([
          window.qq ? window.qq(c.id) : `"${c.id}"`,
          window.qq ? window.qq(c.recommendedName) : `"${c.recommendedName}"`,
          window.qq ? window.qq(c.primaryLabel) : `"${c.primaryLabel}"`,
          window.qq ? window.qq(`${c.avgSimilarityPercent}%`) : `"${c.avgSimilarityPercent}%"`,
          window.qq ? window.qq(c.isInterProcess ? 'OUI' : 'NON') : `"${c.isInterProcess ? 'OUI' : 'NON'}"`,
          window.qq ? window.qq(v.name) : `"${v.name}"`,
          window.qq ? window.qq(v.status) : `"${v.status}"`,
          window.qq ? window.qq(v.processes.join('; ')) : `"${v.processes.join('; ')}"`,
          window.qq ? window.qq(v.files.join('; ')) : `"${v.files.join('; ')}"`,
          v.occurrencesCount,
          window.qq ? window.qq(v.issues.join('; ')) : `"${v.issues.join('; ')}"`
        ].join(','));
      });
    });

    const content = header + rows.join('\n');
    if (window.dl) {
      window.dl(content, fileName, 'text/csv;charset=utf-8;');
    }
  }

  /**
   * Export JSON (.json) Structuré pour automatisation CI/CD
   */
  function exportDuplicatesJSON(analysisResult, fileName = 'audit_doublons_variables.json') {
    const payload = {
      appName: "Bouygues Telecom - AuditFlow Pro",
      module: "Audit des Variables - Détection des Doublons & Cohérence",
      generatedAt: new Date().toISOString(),
      kpis: {
        totalClusters: analysisResult.totalClustersCount,
        totalDuplicates: analysisResult.totalDuplicatesCount,
        interProcessConflicts: analysisResult.interProcessConflictsCount
      },
      options: analysisResult.options,
      clusters: analysisResult.clusters
    };

    const content = JSON.stringify(payload, null, 2);
    if (window.dl) {
      window.dl(content, fileName, 'application/json;charset=utf-8;');
    }
  }

  /**
   * Impression / Export Rapport HTML / PDF
   */
  function printDuplicatesReport(analysisResult) {
    const { clusters, totalDuplicatesCount, totalClustersCount, interProcessConflictsCount, options } = analysisResult;
    const nowStr = new Date().toLocaleString('fr-FR');

    const printWin = window.open('', '_blank', 'width=1050,height=800');
    if (!printWin) {
      alert("Veuillez autoriser les fenêtres pop-up pour afficher le rapport imprimable.");
      return;
    }

    const clustersHtml = clusters.map(c => `
      <div style="border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin-bottom:18px; background:#fff; page-break-inside:avoid;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:12px;">
          <div>
            <span style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">${c.id}</span>
            <h3 style="margin:2px 0 0; font-size:16px; color:#003882;">
              Cible Recommandée : <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#16a34a;">${c.recommendedName}</code>
            </h3>
          </div>
          <div style="text-align:right;">
            <span style="display:inline-block; font-size:11px; font-weight:600; padding:3px 8px; border-radius:12px; background:${c.isInterProcess ? '#fee2e2; color:#991b1b;' : '#f1f5f9; color:#475569;'}">
              ${c.isInterProcess ? '⚠️ Conflit Inter-Processus' : 'Intra-Processus'}
            </span>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">Similarité : <strong>${c.avgSimilarityPercent}%</strong> (${c.primaryLabel})</div>
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1px solid #cbd5e1;">
              <th style="padding:6px 8px;">Variante de Nom</th>
              <th style="padding:6px 8px;">Statut</th>
              <th style="padding:6px 8px;">Processus Parent</th>
              <th style="padding:6px 8px;">Occurrences</th>
              <th style="padding:6px 8px;">Anomalies</th>
            </tr>
          </thead>
          <tbody>
            ${c.variants.map(v => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:6px 8px; font-family:monospace; font-weight:700; color:${v.name === c.recommendedName ? '#16a34a' : '#ea580c'};">${v.name}</td>
                <td style="padding:6px 8px;">${v.status === 'valid' ? '<span style="color:#16a34a; font-weight:600;">Conforme</span>' : '<span style="color:#dc2626; font-weight:600;">Non conforme</span>'}</td>
                <td style="padding:6px 8px; color:#334155;">${v.processes.join(', ') || 'N/A'}</td>
                <td style="padding:6px 8px; font-weight:600;">${v.occurrencesCount}</td>
                <td style="padding:6px 8px; color:#dc2626;">${v.issues.join(', ') || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>AuditFlow Pro - Rapport d'Audit des Doublons & Cohérence</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1e293b; background: #f8fafc; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #003882; padding-bottom: 12px; margin-bottom: 20px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .kpi-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; }
          .kpi-val { font-size: 22px; font-weight: 800; color: #003882; }
          .kpi-lbl { font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
          @media print {
            body { background: #fff; padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="margin:0; font-size:20px; color:#003882;">Bouygues Telecom - AuditFlow Pro</h1>
            <div style="font-size:13px; color:#64748b; margin-top:2px;">Rapport d'Audit des Doublons & de la Cohérence Sémantique des Variables BPMN</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px; color:#64748b;">Édité le : <strong>${nowStr}</strong></div>
            <button onclick="window.print()" style="margin-top:6px; background:#003882; color:#fff; border:none; padding:6px 14px; border-radius:4px; font-weight:600; cursor:pointer;">🖨️ Imprimer / Enregistrer en PDF</button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-val">${totalClustersCount}</div>
            <div class="kpi-lbl">Clusters de Doublons</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color:#ea580c;">${totalDuplicatesCount}</div>
            <div class="kpi-lbl">Variables à Harmoniser</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color:#dc2626;">${interProcessConflictsCount}</div>
            <div class="kpi-lbl">Conflits Inter-Processus</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-val" style="color:#16a34a;">${Math.round((options.similarityThreshold || 0.8) * 100)}%</div>
            <div class="kpi-lbl">Seuil de Similarité</div>
          </div>
        </div>

        <h2 style="font-size:15px; color:#1e293b; margin-bottom:12px;">Détail des Clusters et Suggestions d'Harmonisation</h2>
        ${clustersHtml}
      </body>
      </html>
    `);
    printWin.document.close();
  }

  // Exportation vers l'objet global window
  window.DuplicatesEngine = {
    DEFAULT_OPTIONS: DEFAULT_DUPLICATES_OPTIONS,
    tokenizeVariableName,
    getStrictNormalizedKey,
    getCanonicalTokenKey,
    levenshteinSimilarity,
    jaroWinklerSimilarity,
    compareVariables,
    detectVariableDuplicates,
    toCamelCaseFormat,
    generateVisualDiff,
    generateCoherenceGraphData,
    exportDuplicatesExcel,
    exportDuplicatesCSV,
    exportDuplicatesJSON,
    printDuplicatesReport
  };

})(window);
