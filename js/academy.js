/**
 * PAPRIKA ACADEMY - Moteur d'Apprentissage & Base de Connaissances BPMN/Camunda
 * Interface utilisateur moderne, interactive et certifiante.
 */

(function () {
  'use strict';

  let currentSubTab = 'dosdonts';
  let activeCategory = 'all';
  let activeSeverity = 'all';
  let activeSearch = '';
  let activeArticleId = null;

  let quizState = {
    currentIndex: 0,
    userAnswers: [],
    selectedOption: null,
    answered: false,
    completed: false,
    score: 0
  };

  // Initialisation au chargement
  window.initAcademyModule = function () {
    renderAcademySubTabs();
    renderAcademyContent();
  };

  // Bascule entre sous-onglets de l'Academy
  window.switchAcademySubTab = function (subTabId) {
    currentSubTab = subTabId;
    document.querySelectorAll('.academy-nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-subtab') === subTabId);
    });
    renderAcademyContent();

    const scrollTargets = [
      document.querySelector('.panels-container'),
      document.querySelector('.main-content'),
      document.querySelector('main'),
      document.documentElement,
      document.body
    ];
    scrollTargets.forEach(el => {
      if (el) el.scrollTop = 0;
    });
  };

  // Rendu de la barre de navigation moderne
  function renderAcademySubTabs() {
    const navContainer = document.getElementById('academyNavSubtabs');
    if (!navContainer) return;

    const totalRules = (window.ACADEMY_DATA?.dosAndDonts || []).length;

    navContainer.innerHTML = `
      <!-- Hero Banner Paprika Academy -->
      <div class="academy-hero-banner" style="background:linear-gradient(135deg, #001f4d 0%, #003882 50%, #009CD7 100%); border-radius:16px; padding:26px 30px; margin-bottom:24px; color:#ffffff; box-shadow:0 12px 30px rgba(0,56,130,0.25); position:relative; overflow:hidden;">
        <div style="position:absolute; right:-20px; top:-30px; font-size:160px; opacity:0.07; user-select:none; pointer-events:none;">🎓</div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; position:relative; z-index:1;">
          <div style="max-width:650px;">
            <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.15); backdrop-filter:blur(6px); padding:4px 12px; border-radius:20px; font-size:11.5px; font-weight:700; margin-bottom:10px; letter-spacing:0.5px;">
              <span>🌟 CENTRE D'EXCELLENCE BPMN 2.0 &amp; CAMUNDA 8</span>
            </div>
            <h1 style="font-size:26px; font-weight:900; margin:0 0 8px 0; line-height:1.25; color:#ffffff;">
              Paprika Academy · Référentiel des Bonnes Pratiques
            </h1>
            <p style="font-size:13.5px; opacity:0.9; margin:0; line-height:1.5;">
              Maîtrisez les standards OMG, concevez des processus résilients pour Zeebe, évitez les pièges de modélisation et certifiez vos compétences.
            </p>
          </div>

          <!-- Mini KPIs Academy -->
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <div style="background:rgba(255,255,255,0.12); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:12px 18px; text-align:center; min-width:110px;">
              <div style="font-size:22px; font-weight:900; color:#38bdf8;">${totalRules || '50+'}</div>
              <div style="font-size:10.5px; opacity:0.85; text-transform:uppercase; font-weight:700; margin-top:2px;">Bonnes Pratiques</div>
            </div>
            <div style="background:rgba(255,255,255,0.12); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:12px 18px; text-align:center; min-width:110px;">
              <div style="font-size:22px; font-weight:900; color:#4ade80;">5</div>
              <div style="font-size:10.5px; opacity:0.85; text-transform:uppercase; font-weight:700; margin-top:2px;">Ateliers Live</div>
            </div>
            <div style="background:rgba(255,255,255,0.12); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.2); border-radius:12px; padding:12px 18px; text-align:center; min-width:110px;">
              <div style="font-size:22px; font-weight:900; color:#fbbf24;">100%</div>
              <div style="font-size:10.5px; opacity:0.85; text-transform:uppercase; font-weight:700; margin-top:2px;">Conforme OMG</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="academy-nav-list" style="display:flex; gap:10px; border-bottom:2px solid var(--border-color, #e2e8f0); padding-bottom:12px; margin-bottom:24px; flex-wrap:wrap;">
        <button class="academy-nav-item ${currentSubTab === 'dosdonts' ? 'active' : ''}" data-subtab="dosdonts" onclick="switchAcademySubTab('dosdonts')" style="display:flex; align-items:center; gap:8px;">
          <span>⚖️ Bonnes Pratiques &amp; Do's/Don'ts</span>
          <span style="font-size:10px; font-weight:800; background:rgba(0,156,215,0.15); color:var(--brand-primary, #003882); padding:2px 8px; border-radius:10px;">${totalRules}</span>
        </button>
        <button class="academy-nav-item ${currentSubTab === 'studio' ? 'active' : ''}" data-subtab="studio" onclick="switchAcademySubTab('studio')" style="position:relative; display:flex; align-items:center; gap:8px;">
          <span>🎮 Atelier Modeler &amp; Exercices</span>
          <span style="font-size:9px; font-weight:800; background:#10B981; color:#fff; padding:1px 6px; border-radius:10px; box-shadow:0 2px 6px rgba(16,185,129,0.4);">LIVE</span>
        </button>
        <button class="academy-nav-item ${currentSubTab === 'articles' ? 'active' : ''}" data-subtab="articles" onclick="switchAcademySubTab('articles')">
          <span>📚 Guides de Référence</span>
        </button>
        <button class="academy-nav-item ${currentSubTab === 'tracks' ? 'active' : ''}" data-subtab="tracks" onclick="switchAcademySubTab('tracks')">
          <span>🎓 Parcours de Formation</span>
        </button>
        <button class="academy-nav-item ${currentSubTab === 'templates' ? 'active' : ''}" data-subtab="templates" onclick="switchAcademySubTab('templates')">
          <span>🛠️ Templates BPMN</span>
        </button>
        <button class="academy-nav-item ${currentSubTab === 'quiz' ? 'active' : ''}" data-subtab="quiz" onclick="switchAcademySubTab('quiz')">
          <span>🏆 Quiz &amp; Certification</span>
        </button>
      </div>
    `;
  }

  // Rendu du contenu principal selon le sous-onglet sélectionné
  function renderAcademyContent() {
    const container = document.getElementById('academyMainView');
    if (!container) return;

    if (!window.ACADEMY_DATA) {
      container.innerHTML = '<div class="alert alert-warning">Données de l\'Academy non chargées.</div>';
      return;
    }

    if (currentSubTab === 'dosdonts') {
      renderDosDontsView(container);
    } else if (currentSubTab === 'studio') {
      if (typeof window.renderAcademyStudioView === 'function') {
        window.renderAcademyStudioView(container);
      } else {
        container.innerHTML = '<div class="alert alert-info">Chargement du studio de modélisation...</div>';
      }
    } else if (currentSubTab === 'articles') {
      renderArticlesView(container);
    } else if (currentSubTab === 'tracks') {
      renderTracksView(container);
    } else if (currentSubTab === 'templates') {
      renderTemplatesView(container);
    } else if (currentSubTab === 'quiz') {
      renderQuizView(container);
    }
  }

  // -------------------------------------------------------------
  // 1. VUE DO'S & DON'TS / RÉFÉRENTIEL DES 50+ BONNES PRATIQUES
  // -------------------------------------------------------------
  function renderDosDontsView(container) {
    const items = window.ACADEMY_DATA.dosAndDonts || [];
    
    // Filtrage dynamique
    const filteredItems = items.filter(item => {
      const matchCat = activeCategory === 'all' || item.category.toLowerCase().includes(activeCategory.toLowerCase()) || (activeCategory === 'structure' && item.category.includes('Structure')) || (activeCategory === 'gateways' && item.category.includes('Passerelles')) || (activeCategory === 'architecture' && item.category.includes('Architecture')) || (activeCategory === 'bpmn_naming' && item.category.includes('Nommage')) || (activeCategory === 'deployment' && item.category.includes('Déploiement')) || (activeCategory === 'governance' && item.category.includes('Gouvernance'));
      const matchSev = activeSeverity === 'all' || item.severity === activeSeverity;
      const q = activeSearch.toLowerCase().trim();
      const matchSearch = !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.badDesc && item.badDesc.toLowerCase().includes(q)) ||
        (item.goodDesc && item.goodDesc.toLowerCase().includes(q)) ||
        (item.ruleId && item.ruleId.toLowerCase().includes(q)) ||
        (item.standard && item.standard.toLowerCase().includes(q));
      return matchCat && matchSev && matchSearch;
    });

    const categoryCounts = {
      all: items.length,
      structure: items.filter(i => i.category.includes('Structure')).length,
      architecture: items.filter(i => i.category.includes('Architecture')).length,
      gateways: items.filter(i => i.category.includes('Passerelles')).length,
      bpmn_naming: items.filter(i => i.category.includes('Nommage')).length,
      deployment: items.filter(i => i.category.includes('Déploiement')).length,
      governance: items.filter(i => i.category.includes('Gouvernance')).length
    };

    let catPillsHtml = [
      { id: 'all', label: 'Toutes les règles', icon: '🌟' },
      { id: 'structure', label: 'Structure OMG', icon: '🏛️' },
      { id: 'architecture', label: 'Call Activities & Dépendances', icon: '🧱' },
      { id: 'gateways', label: 'Passerelles & Décisions', icon: '🔀' },
      { id: 'bpmn_naming', label: 'Nommage & Sémantique', icon: '✍️' },
      { id: 'deployment', label: 'Déploiement Zeebe / Camunda 8', icon: '⚙️' },
      { id: 'governance', label: 'Gouvernance & Sécurité', icon: '🛡️' }
    ].map(c => `
      <button class="filter-pill ${activeCategory === c.id ? 'active' : ''}" onclick="setAcademyDosDontsCategory('${c.id}')" style="padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; border:1px solid var(--border-color, #cbd5e1); background:${activeCategory === c.id ? 'linear-gradient(135deg, #003882, #009CD7)' : 'var(--bg-secondary, #f8fafc)'}; color:${activeCategory === c.id ? '#ffffff' : 'var(--text-primary, #0f172a)'}; cursor:pointer; transition:all 0.2s; display:inline-flex; align-items:center; gap:6px;">
        <span>${c.icon} ${c.label}</span>
        <span style="font-size:10px; opacity:0.85; padding:1px 6px; border-radius:8px; background:${activeCategory === c.id ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)'};">${categoryCounts[c.id] || 0}</span>
      </button>
    `).join('');

    let cardsHtml = filteredItems.map(item => {
      const sevColor = item.severity === 'blocker' || item.severity === 'critical' ? '#dc2626' : (item.severity === 'error' ? '#ea580c' : (item.severity === 'warning' ? '#d97706' : '#0284c7'));
      const sevBg = item.severity === 'blocker' || item.severity === 'critical' ? '#fee2e2' : (item.severity === 'error' ? '#ffedd5' : (item.severity === 'warning' ? '#fef3c7' : '#e0f2fe'));

      return `
        <div class="academy-practice-card" style="background:var(--bg-primary, #ffffff); border:1px solid var(--border-color, #e2e8f0); border-radius:14px; padding:22px; margin-bottom:20px; box-shadow:0 4px 14px rgba(0,0,0,0.04); transition:all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
          
          <!-- Card Header -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:4px;">
                <span style="font-size:16px; font-weight:800; color:var(--text-primary, #0f172a);">${item.title}</span>
                <span style="font-size:11px; padding:2px 8px; border-radius:6px; background:var(--bg-secondary, #f1f5f9); color:var(--text-secondary, #64748b); font-weight:700;">
                  🏷️ ${item.category}
                </span>
                ${item.autoFixable ? '<span style="font-size:11px; padding:2px 8px; border-radius:6px; background:#dcfce7; color:#15803d; font-weight:800; display:inline-flex; align-items:center; gap:4px;">⚡ Auto-Fixable</span>' : ''}
              </div>
              <div style="font-size:12px; color:var(--text-tertiary, #64748b);">
                Norme / Standard : <strong>${item.standard || 'OMG BPMN 2.0'}</strong> · Rôle suggéré : <strong>${item.raci || 'Modélisateur'}</strong> · Règle : <code>${item.ruleId || item.id}</code>
              </div>
            </div>
            
            <div style="display:flex; gap:8px; align-items:center;">
              <span style="font-size:11px; font-weight:900; padding:4px 10px; border-radius:8px; background:${sevBg}; color:${sevColor}; border:1px solid ${sevColor}40; text-transform:uppercase;">
                ${item.severity}
              </span>
              <button class="btn-ghost" onclick="copyAcademySnippet('${item.id}')" title="Copier la bonne pratique et le snippet XML" style="font-size:12px; padding:4px 10px; font-weight:700; color:var(--brand-primary, #003882); border:1px solid var(--border-color, #cbd5e1); border-radius:6px;">
                📋 Copier
              </button>
            </div>
          </div>

          <!-- Comparison Grid -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            
            <!-- Bad Practice (Anti-Pattern) -->
            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:16px; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                  <span style="font-size:16px;">❌</span>
                  <strong style="color:#991b1b; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">À Proscrire (Anti-Pattern)</strong>
                </div>
                <p style="font-size:13px; color:#1e293b; margin:0 0 10px 0; line-height:1.5;">
                  ${item.badDesc}
                </p>
                ${item.badSnippet ? `
                <pre style="background:#0f172a; color:#f87171; border-radius:8px; padding:10px 12px; font-size:11.5px; overflow-x:auto; margin:8px 0; font-family:monospace; line-height:1.4;"><code>${escapeHtml(item.badSnippet)}</code></pre>
                ` : ''}
              </div>
              <div style="font-size:12px; color:#b91c1c; background:rgba(239,68,68,0.12); padding:8px 12px; border-radius:6px; border-left:3px solid #dc2626; margin-top:8px;">
                <strong>⚠️ Impact :</strong> ${item.badImpact}
              </div>
            </div>

            <!-- Good Practice (Recommended) -->
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:16px; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                  <span style="font-size:16px;">✅</span>
                  <strong style="color:#166534; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Bonne Pratique Recommandée</strong>
                </div>
                <p style="font-size:13px; color:#1e293b; margin:0 0 10px 0; line-height:1.5;">
                  ${item.goodDesc}
                </p>
                ${item.goodSnippet ? `
                <pre style="background:#0f172a; color:#4ade80; border-radius:8px; padding:10px 12px; font-size:11.5px; overflow-x:auto; margin:8px 0; font-family:monospace; line-height:1.4;"><code>${escapeHtml(item.goodSnippet)}</code></pre>
                ` : ''}
              </div>
              <div style="font-size:12px; color:#15803d; background:rgba(22,163,74,0.12); padding:8px 12px; border-radius:6px; border-left:3px solid #16a34a; margin-top:8px;">
                <strong>🎯 Bénéfice :</strong> ${item.goodBenefit}
              </div>
            </div>

          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-primary, #0f172a); margin:0 0 4px 0;">
              ⚖️ Référentiel des Bonnes Pratiques &amp; Règles de Modélisation
            </h2>
            <p style="font-size:13px; color:var(--text-secondary, #64748b); margin:0;">
              Consultez l'ensemble des règles de qualité vérifiées par le Linter Paprika, avec des exemples comparatifs visuels avant/après.
            </p>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <div style="position:relative; min-width:280px;">
              <input type="text" id="academyDosDontsSearch" placeholder="🔍 Rechercher une règle, un mot-clé, XML..." value="${activeSearch}" oninput="handleAcademyDosDontsSearch(this.value)" style="width:100%; padding:8px 14px; border-radius:8px; border:1px solid var(--border-color, #cbd5e1); font-size:13px; background:#fff;">
            </div>
            <select onchange="setAcademyDosDontsSeverity(this.value)" style="padding:8px 12px; border-radius:8px; border:1px solid var(--border-color, #cbd5e1); font-size:12px; background:#fff; font-weight:700;">
              <option value="all" ${activeSeverity === 'all' ? 'selected' : ''}>Toutes les sévérités</option>
              <option value="blocker" ${activeSeverity === 'blocker' ? 'selected' : ''}>🔴 Bloquants uniquement</option>
              <option value="error" ${activeSeverity === 'error' ? 'selected' : ''}>🟠 Erreurs uniquement</option>
              <option value="warning" ${activeSeverity === 'warning' ? 'selected' : ''}>🟡 Avertissements uniquement</option>
            </select>
          </div>
        </div>

        <!-- Filtres catégories -->
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
          ${catPillsHtml}
        </div>
      </div>

      <!-- Liste des cartes -->
      <div>
        ${filteredItems.length > 0 ? cardsHtml : `
          <div style="text-align:center; padding:60px 20px; background:var(--bg-secondary, #f8fafc); border-radius:12px; border:1px dashed var(--border-color, #cbd5e1);">
            <div style="font-size:36px; margin-bottom:10px;">🔍</div>
            <h3 style="font-size:16px; font-weight:800; color:var(--text-primary, #0f172a); margin:0 0 6px 0;">Aucune bonne pratique ne correspond à votre recherche</h3>
            <p style="font-size:13px; color:var(--text-secondary, #64748b); margin:0 0 16px 0;">Essayez d'ajuster les filtres ou le mot-clé de recherche.</p>
            <button class="btn-outline" onclick="resetAcademyFilters()" style="padding:6px 16px; font-size:12px; font-weight:700;">Réinitialiser les filtres</button>
          </div>
        `}
      </div>
    `;
  }

  window.setAcademyDosDontsCategory = function(cat) {
    activeCategory = cat;
    renderAcademyContent();
  };

  window.setAcademyDosDontsSeverity = function(sev) {
    activeSeverity = sev;
    renderAcademyContent();
  };

  window.handleAcademyDosDontsSearch = function(val) {
    activeSearch = val;
    renderAcademyContent();
  };

  window.resetAcademyFilters = function() {
    activeCategory = 'all';
    activeSeverity = 'all';
    activeSearch = '';
    renderAcademyContent();
  };

  window.copyAcademySnippet = function(id) {
    const item = (window.ACADEMY_DATA?.dosAndDonts || []).find(i => i.id === id);
    if (!item) return;

    const textToCopy = `TITRE : ${item.title}\nCATÉGORIE : ${item.category}\nSÉVÉRITÉ : ${item.severity.toUpperCase()}\n\n❌ À PROSCRIRE :\n${item.badDesc}\nImpact : ${item.badImpact}\n\n✅ BONNE PRATIQUE RECOMMANDÉE :\n${item.goodDesc}\nBénéfice : ${item.goodBenefit}\n\nSNIPPET XML :\n${item.goodSnippet || ''}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert('📋 Règle et snippet copiés dans le presse-papiers !');
      });
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // -------------------------------------------------------------
  // 2. VUE ARTICLES & GUIDES DE RÉFÉRENCE
  // -------------------------------------------------------------
  function renderArticlesView(container) {
    const articles = window.ACADEMY_DATA.articles || [];

    let articlesGridHtml = articles.map(art => {
      const levelObj = window.ACADEMY_DATA.levels.find(l => l.id === art.level) || { label: art.level, color: '#009CD7' };
      return `
        <div class="academy-card article-card" onclick="openAcademyArticle('${art.id}')" style="background:var(--bg-primary, #ffffff); border:1px solid var(--border-color, #e2e8f0); border-radius:14px; padding:22px; cursor:pointer; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1); box-shadow:0 4px 12px rgba(0,0,0,0.03);">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span style="font-size:11px; font-weight:700; padding:4px 10px; border-radius:12px; background:${levelObj.color}18; color:${levelObj.color}; border:1px solid ${levelObj.color}40;">
                ${levelObj.label}
              </span>
              <span style="font-size:12px; color:var(--text-secondary, #64748b); display:flex; align-items:center; gap:4px;">
                ⏱️ ${art.readTime}
              </span>
            </div>
            <h3 style="font-size:16px; font-weight:800; color:var(--text-primary, #0f172a); margin:0 0 10px 0; line-height:1.4;">
              ${art.title}
            </h3>
            <p style="font-size:13px; color:var(--text-secondary, #64748b); line-height:1.5; margin:0 0 16px 0;">
              ${art.summary}
            </p>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color, #e2e8f0); padding-top:12px; font-size:12px; color:var(--text-secondary, #64748b);">
            <span>✍️ ${art.author}</span>
            <span style="color:var(--brand-primary, #003882); font-weight:800; display:flex; align-items:center; gap:4px;">Lire le guide →</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:20px; font-weight:800; color:var(--text-primary, #0f172a); margin:0 0 4px 0;">Base Documentaire &amp; Guides Métier BPMN 2.0</h2>
        <p style="font-size:13px; color:var(--text-secondary, #64748b); margin:0 0 20px 0;">Conventions de nommage, architecture d'orchestration Camunda 8 et fiches techniques de référence.</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px;">
          ${articlesGridHtml}
        </div>
      </div>
    `;
  }

  window.openAcademyArticle = function (artId) {
    const art = (window.ACADEMY_DATA.articles || []).find(a => a.id === artId);
    if (!art) return;

    let modal = document.getElementById('academyArticleModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'academyArticleModal';
      modal.className = 'modal-backdrop';
      modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(6px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
      document.body.appendChild(modal);
    }

    const levelObj = window.ACADEMY_DATA.levels.find(l => l.id === art.level) || { label: art.level, color: '#009CD7' };

    let formattedContent = art.content
      .replace(/### (.*)/g, '<h3 style="font-size:17px; font-weight:800; color:#003882; margin:24px 0 10px 0; border-bottom:1.5px solid #e2e8f0; padding-bottom:6px;">$1</h3>')
      .replace(/#### (.*)/g, '<h4 style="font-size:14.5px; font-weight:700; color:#009CD7; margin:18px 0 8px 0;">$1</h4>')
      .replace(/```(java|json|xml|)([\s\S]*?)```/g, '<pre style="background:#0f172a; border:1px solid #1e293b; border-radius:10px; padding:16px; overflow-x:auto; font-family:Consolas, monospace; font-size:12.5px; color:#38bdf8; line-height:1.55; margin:14px 0;"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9; border:1px solid #cbd5e1; padding:2px 6px; border-radius:6px; font-size:12px; color:#003882; font-family:Consolas, monospace; font-weight:600;">$1</code>')
      .replace(/\n\n/g, '<p style="margin:0 0 14px 0; line-height:1.65; color:#334155; font-size:13.5px;"></p>');

    modal.innerHTML = `
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; max-width:860px; width:100%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 25px 60px -12px rgba(15,23,42,0.3); overflow:hidden;">
        <div style="padding:18px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; font-weight:700; padding:4px 10px; border-radius:12px; background:${levelObj.color}15; color:${levelObj.color}; border:1px solid ${levelObj.color}35;">
              ${levelObj.label}
            </span>
            <span style="font-size:12px; color:#64748b; font-weight:600;">⏱️ ${art.readTime} de lecture · ✍️ ${art.author}</span>
          </div>
          <button onclick="closeAcademyArticleModal()" class="btn-ghost" style="font-size:18px; line-height:1; padding:4px 8px; cursor:pointer;">&times;</button>
        </div>
        <div style="padding:28px 32px; overflow-y:auto; flex:1; line-height:1.7; background:#ffffff;">
          <h1 style="font-size:22px; font-weight:900; color:#003882; margin:0 0 14px 0; line-height:1.35;">
            ${art.title}
          </h1>
          <div style="background:#f0f9ff; border-left:4px solid #009CD7; border-radius:8px; padding:14px 18px; margin-bottom:24px; font-size:13.5px; color:#0369a1; font-weight:500; line-height:1.55;">
            💡 <strong>Synthèse :</strong> ${art.summary}
          </div>
          <div class="article-body" style="font-size:13.5px; color:#334155;">
            ${formattedContent}
          </div>
        </div>
        <div style="padding:14px 28px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; background:#f8fafc;">
          <button class="btn-primary" onclick="closeAcademyArticleModal()" style="padding:8px 22px; font-size:13px; font-weight:700; background:linear-gradient(135deg, #003882 0%, #009CD7 100%); color:#ffffff; border:none; border-radius:8px; cursor:pointer;">
            Fermer le guide
          </button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  };

  window.closeAcademyArticleModal = function () {
    const modal = document.getElementById('academyArticleModal');
    if (modal) modal.style.display = 'none';
  };

  // -------------------------------------------------------------
  // 3. VUE PARCOURS DE FORMATION
  // -------------------------------------------------------------
  function renderTracksView(container) {
    const tracks = window.ACADEMY_DATA.learningTracks || [];
    const userProgress = JSON.parse(localStorage.getItem('paprika_academy_progress') || '{}');

    let tracksHtml = tracks.map(track => {
      let totalLessons = 0;
      let completedLessons = 0;
      track.modules.forEach(mod => {
        mod.lessons.forEach((l, idx) => {
          totalLessons++;
          const key = `${track.id}_${mod.id}_${idx}`;
          if (userProgress[key]) completedLessons++;
        });
      });
      const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      let modulesHtml = track.modules.map(mod => {
        let lessonsHtml = mod.lessons.map((lesson, idx) => {
          const key = `${track.id}_${mod.id}_${idx}`;
          const isDone = !!userProgress[key];
          return `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--bg-secondary, #f8fafc); border:1px solid var(--border-color, #e2e8f0); border-radius:8px; margin-bottom:6px; font-size:13px;">
              <span style="color:${isDone ? 'var(--text-tertiary, #94a3b8)' : 'var(--text-primary, #0f172a)'}; text-decoration:${isDone ? 'line-through' : 'none'}; display:flex; align-items:center; gap:8px;">
                ${isDone ? '🟢' : '⚪'} ${lesson}
              </span>
              <button onclick="toggleAcademyLesson('${key}')" class="btn-ghost" style="padding:3px 8px; font-size:11px; font-weight:700; color:${isDone ? '#10B981' : 'var(--brand-primary, #003882)'};">
                ${isDone ? 'Terminé ✓' : 'Marquer comme fait'}
              </button>
            </div>
          `;
        }).join('');

        return `
          <div style="margin-bottom:16px;">
            <h4 style="font-size:13.5px; font-weight:800; color:var(--text-primary, #0f172a); margin:0 0 8px 0;">
              📌 ${mod.title}
            </h4>
            <div>
              ${lessonsHtml}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="background:var(--bg-primary, #ffffff); border:1px solid var(--border-color, #e2e8f0); border-radius:14px; padding:24px; margin-bottom:24px; box-shadow:0 4px 14px rgba(0,0,0,0.03);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
            <div>
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
                <span style="font-size:24px;">${track.icon}</span>
                <h3 style="font-size:17px; font-weight:800; color:var(--text-primary, #0f172a); margin:0;">${track.title}</h3>
              </div>
              <p style="font-size:13px; color:var(--text-secondary, #64748b); margin:0;">${track.description}</p>
            </div>
            <div style="text-align:right;">
              <span style="font-size:12px; font-weight:700; color:var(--brand-primary, #003882);">⏱️ ${track.duration}</span>
              <div style="font-size:11px; color:var(--text-secondary, #64748b); margin-top:2px;">Public : ${track.targetAudience}</div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div style="margin-bottom:20px; background:var(--bg-secondary, #f1f5f9); border-radius:10px; height:8px; overflow:hidden;">
            <div style="width:${percent}%; height:100%; background:linear-gradient(90deg, #009CD7, #10B981); transition:width 0.3s ease;"></div>
          </div>

          <div>
            ${modulesHtml}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:20px; font-weight:800; color:var(--text-primary, #0f172a); margin:0 0 4px 0;">🎓 Parcours de Formation &amp; Montée en Compétences</h2>
        <p style="font-size:13px; color:var(--text-secondary, #64748b); margin:0 0 20px 0;">Suivez votre progression étape par étape de débutant à architecte de processus certifié.</p>
        <div>
          ${tracksHtml}
        </div>
      </div>
    `;
  }

  window.toggleAcademyLesson = function (key) {
    const userProgress = JSON.parse(localStorage.getItem('paprika_academy_progress') || '{}');
    if (userProgress[key]) {
      delete userProgress[key];
    } else {
      userProgress[key] = true;
    }
    localStorage.setItem('paprika_academy_progress', JSON.stringify(userProgress));
    renderAcademyContent();
  };

  // -------------------------------------------------------------
  // 4. VUE TEMPLATES & MODÈLES BPMN
  // -------------------------------------------------------------
  function renderTemplatesView(container) {
    const templates = window.ACADEMY_DATA.templates || [];

    let cardsHtml = templates.map(tpl => `
      <div style="background:var(--bg-primary, #ffffff); border:1px solid var(--border-color, #e2e8f0); border-radius:14px; padding:22px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-size:11px; font-weight:700; padding:3px 8px; border-radius:8px; background:rgba(0,156,215,0.12); color:#009CD7;">
              ${tpl.category}
            </span>
            <span style="font-size:12px; color:var(--text-secondary, #64748b);">📄 .bpmn</span>
          </div>
          <h3 style="font-size:16px; font-weight:800; color:var(--text-primary, #0f172a); margin:0 0 8px 0;">
            ${tpl.name}
          </h3>
          <p style="font-size:13px; color:var(--text-secondary, #64748b); line-height:1.5; margin:0 0 16px 0;">
            ${tpl.description}
          </p>
        </div>
        <div style="display:flex; gap:10px; border-top:1px solid var(--border-color, #e2e8f0); padding-top:14px;">
          <button class="btn-primary" onclick="downloadAcademyTemplate('${tpl.id}')" style="flex:1; padding:8px 14px; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;">
            💾 Télécharger (.bpmn)
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:20px; font-weight:800; color:var(--text-primary, #0f172a); margin:0 0 4px 0;">🛠️ Modèles &amp; Templates BPMN Certifiés Prêts à l'Emploi</h2>
        <p style="font-size:13px; color:var(--text-secondary, #64748b); margin:0 0 20px 0;">Téléchargez des diagrammes de référence pré-configurés pour démarrer rapidement vos projets.</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px;">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  window.downloadAcademyTemplate = function(tplId) {
    const tpl = (window.ACADEMY_DATA.templates || []).find(t => t.id === tplId);
    if (!tpl) return;
    if (typeof dl === 'function') {
      dl(tpl.xmlContent, tpl.xmlFilename || `${tplId}.bpmn`, 'application/xml;charset=utf-8;');
    }
  };

  // -------------------------------------------------------------
  // 5. VUE QUIZ DE CERTIFICATION PRO (INTERACTIF)
  // -------------------------------------------------------------
  function renderQuizView(container) {
    const questions = window.ACADEMY_DATA.quizQuestions || [];
    const total = questions.length;

    if (quizState.completed) {
      const percentage = Math.round((quizState.score / total) * 100);
      const isPassed = percentage >= 80;

      container.innerHTML = `
        <div style="background:var(--bg-primary, #ffffff); border:1px solid var(--border-color, #e2e8f0); border-radius:16px; padding:36px; max-width:680px; margin:0 auto; text-align:center; box-shadow:0 12px 36px rgba(0,0,0,0.06);">
          <div style="font-size:56px; margin-bottom:12px;">${isPassed ? '🏆' : '📚'}</div>
          <h2 style="font-size:24px; font-weight:900; color:var(--text-primary, #0f172a); margin:0 0 8px 0;">
            ${isPassed ? 'Félicitations ! Certification BPMN Réussie' : 'Résultat du Quiz d\'Auto-Évaluation'}
          </h2>
          <p style="font-size:14px; color:var(--text-secondary, #64748b); margin:0 0 24px 0;">
            ${isPassed ? 'Vous maîtrisez parfaitement les règles OMG, les passerelles et la gouvernance Bouygues Telecom.' : 'Révisez les bonnes pratiques et retentez le test pour valider votre certification.'}
          </p>

          <div style="display:flex; justify-content:center; gap:20px; margin-bottom:28px;">
            <div style="background:var(--bg-secondary, #f8fafc); border:1px solid var(--border-color, #e2e8f0); border-radius:12px; padding:16px 24px; min-width:140px;">
              <div style="font-size:28px; font-weight:900; color:${isPassed ? '#10B981' : '#EA5B0C'};">${quizState.score} / ${total}</div>
              <div style="font-size:11px; color:var(--text-secondary, #64748b); font-weight:700; text-transform:uppercase; margin-top:4px;">Bonnes Réponses</div>
            </div>
            <div style="background:var(--bg-secondary, #f8fafc); border:1px solid var(--border-color, #e2e8f0); border-radius:12px; padding:16px 24px; min-width:140px;">
              <div style="font-size:28px; font-weight:900; color:${isPassed ? '#10B981' : '#EA5B0C'};">${percentage}%</div>
              <div style="font-size:11px; color:var(--text-secondary, #64748b); font-weight:700; text-transform:uppercase; margin-top:4px;">Score Final</div>
            </div>
          </div>

          <div style="display:flex; justify-content:center; gap:12px;">
            <button class="btn-outline" onclick="resetAcademyQuiz()" style="padding:10px 20px; font-weight:700; font-size:13px;">
              🔄 Retenter le Quiz
            </button>
            ${isPassed ? `
              <button class="btn-primary" onclick="alert('🏅 Certificat d\\'Excellence BPMN 2.0 Paprika validé avec succès !')" style="padding:10px 24px; font-weight:800; font-size:13px; background:linear-gradient(135deg, #003882, #009CD7);">
                📜 Afficher mon Certificat
              </button>
            ` : ''}
          </div>
        </div>
      `;
      return;
    }

    const currentQ = questions[quizState.currentIndex];
    const progressPercent = Math.round(((quizState.currentIndex) / total) * 100);

    let optionsHtml = currentQ.options.map((opt, idx) => {
      let optStyle = 'border:1px solid var(--border-color, #cbd5e1); background:var(--bg-primary, #ffffff);';
      if (quizState.answered) {
        if (idx === currentQ.correct) {
          optStyle = 'border:2px solid #10B981; background:#f0fdf4; color:#166534; font-weight:700;';
        } else if (idx === quizState.selectedOption) {
          optStyle = 'border:2px solid #EF4444; background:#fef2f2; color:#991b1b;';
        }
      } else if (quizState.selectedOption === idx) {
        optStyle = 'border:2px solid var(--brand-primary, #003882); background:rgba(0,56,130,0.06); font-weight:700;';
      }

      return `
        <div onclick="${!quizState.answered ? `selectQuizOption(${idx})` : ''}" style="padding:14px 18px; border-radius:10px; margin-bottom:10px; cursor:${quizState.answered ? 'default' : 'pointer'}; transition:all 0.15s; font-size:13.5px; ${optStyle}">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="width:24px; height:24px; border-radius:50%; border:1px solid currentColor; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; flex-shrink:0;">
              ${String.fromCharCode(65 + idx)}
            </span>
            <span>${opt}</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="background:var(--bg-primary, #ffffff); border:1px solid var(--border-color, #e2e8f0); border-radius:16px; padding:30px; max-width:760px; margin:0 auto; box-shadow:0 8px 24px rgba(0,0,0,0.04);">
        
        <!-- Header Quiz -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span style="font-size:12px; font-weight:800; color:var(--brand-primary, #003882); text-transform:uppercase; letter-spacing:0.5px;">
            Question ${quizState.currentIndex + 1} sur ${total}
          </span>
          <span style="font-size:12px; font-weight:700; color:var(--text-secondary, #64748b);">
            Score actuel : ${quizState.score}
          </span>
        </div>

        <!-- Progress Bar -->
        <div style="background:var(--bg-secondary, #f1f5f9); height:6px; border-radius:6px; overflow:hidden; margin-bottom:24px;">
          <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, #003882, #009CD7); transition:width 0.25s ease;"></div>
        </div>

        <!-- Question -->
        <h3 style="font-size:17px; font-weight:800; color:var(--text-primary, #0f172a); margin:0 0 20px 0; line-height:1.4;">
          ${currentQ.question}
        </h3>

        <!-- Options -->
        <div style="margin-bottom:20px;">
          ${optionsHtml}
        </div>

        <!-- Explanation box if answered -->
        ${quizState.answered ? `
          <div style="background:#f0f9ff; border-left:4px solid #009CD7; border-radius:8px; padding:12px 16px; margin-bottom:20px; font-size:13px; color:#0369a1; line-height:1.5;">
            💡 <strong>Explication :</strong> ${currentQ.explanation}
          </div>
        ` : ''}

        <!-- Footer Buttons -->
        <div style="display:flex; justify-content:flex-end;">
          ${!quizState.answered ? `
            <button class="btn-primary" onclick="submitQuizAnswer()" ${quizState.selectedOption === null ? 'disabled' : ''} style="padding:8px 22px; font-size:13px; font-weight:800; background:linear-gradient(135deg, #003882, #009CD7); opacity:${quizState.selectedOption === null ? 0.5 : 1}; cursor:${quizState.selectedOption === null ? 'not-allowed' : 'pointer'};">
              Valider la réponse
            </button>
          ` : `
            <button class="btn-primary" onclick="nextQuizQuestion()" style="padding:8px 24px; font-size:13px; font-weight:800; background:linear-gradient(135deg, #003882, #009CD7);">
              ${quizState.currentIndex + 1 < total ? 'Question suivante →' : 'Voir mon résultat final 🏆'}
            </button>
          `}
        </div>

      </div>
    `;
  }

  window.selectQuizOption = function (idx) {
    if (quizState.answered) return;
    quizState.selectedOption = idx;
    renderAcademyContent();
  };

  window.submitQuizAnswer = function () {
    if (quizState.selectedOption === null || quizState.answered) return;
    const questions = window.ACADEMY_DATA.quizQuestions || [];
    const currentQ = questions[quizState.currentIndex];

    quizState.answered = true;
    if (quizState.selectedOption === currentQ.correct) {
      quizState.score++;
    }
    renderAcademyContent();
  };

  window.nextQuizQuestion = function () {
    const questions = window.ACADEMY_DATA.quizQuestions || [];
    if (quizState.currentIndex + 1 < questions.length) {
      quizState.currentIndex++;
      quizState.selectedOption = null;
      quizState.answered = false;
    } else {
      quizState.completed = true;
    }
    renderAcademyContent();
  };

  window.resetAcademyQuiz = function () {
    quizState = {
      currentIndex: 0,
      userAnswers: [],
      selectedOption: null,
      answered: false,
      completed: false,
      score: 0
    };
    renderAcademyContent();
  };

})();
