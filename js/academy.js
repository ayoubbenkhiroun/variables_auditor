/**
 * PAPRIKA ACADEMY - Moteur d'Apprentissage & Base de Connaissances BPMN/Camunda
 */

(function () {
  'use strict';

  let currentSubTab = 'articles';
  let activeCategory = 'all';
  let activeSearch = '';
  let quizState = {
    currentIndex: 0,
    userAnswers: [],
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
  };

  // Rendu de la barre de sous-onglets
  function renderAcademySubTabs() {
    const navContainer = document.getElementById('academyNavSubtabs');
    if (!navContainer) return;

    navContainer.innerHTML = `
      <div class="academy-nav-list" style="display:flex; gap:10px; border-bottom:1px solid var(--border-color); padding-bottom:12px; margin-bottom:24px; flex-wrap:wrap;">
        <button class="academy-nav-item ${currentSubTab === 'articles' ? 'active' : ''}" data-subtab="articles" onclick="switchAcademySubTab('articles')">
          <span>📚 Articles &amp; Guides</span>
        </button>
        <button class="academy-nav-item ${currentSubTab === 'studio' ? 'active' : ''}" data-subtab="studio" onclick="switchAcademySubTab('studio')" style="position:relative;">
          <span>🎮 Atelier Modeler &amp; Exercices</span>
          <span style="position:absolute; top:-6px; right:-6px; font-size:9px; font-weight:800; background:#10B981; color:#fff; padding:1px 6px; border-radius:10px; box-shadow:0 2px 6px rgba(16,185,129,0.4);">LIVE</span>
        </button>
        <button class="academy-nav-item ${currentSubTab === 'dosdonts' ? 'active' : ''}" data-subtab="dosdonts" onclick="switchAcademySubTab('dosdonts')">
          <span>⚖️ Do's &amp; Don'ts (Anti-Patterns)</span>
        </button>
        <button class="academy-nav-item ${currentSubTab === 'tracks' ? 'active' : ''}" data-subtab="tracks" onclick="switchAcademySubTab('tracks')">
          <span>🎓 Parcours de Formation</span>
        </button>
        <button class="academy-nav-item ${currentSubTab === 'templates' ? 'active' : ''}" data-subtab="templates" onclick="switchAcademySubTab('templates')">
          <span>🛠️ Camunda Modeler &amp; Templates</span>
        </button>
        <button class="academy-nav-item ${currentSubTab === 'quiz' ? 'active' : ''}" data-subtab="quiz" onclick="switchAcademySubTab('quiz')">
          <span>🏆 Quiz &amp; Auto-Évaluation</span>
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

    if (currentSubTab === 'articles') {
      renderArticlesView(container);
    } else if (currentSubTab === 'studio') {
      if (typeof window.renderAcademyStudioView === 'function') {
        window.renderAcademyStudioView(container);
      } else {
        container.innerHTML = '<div class="alert alert-info">Chargement du studio de modélisation...</div>';
      }
    } else if (currentSubTab === 'dosdonts') {
      renderDosDontsView(container);
    } else if (currentSubTab === 'tracks') {
      renderTracksView(container);
    } else if (currentSubTab === 'templates') {
      renderTemplatesView(container);
    } else if (currentSubTab === 'quiz') {
      renderQuizView(container);
    }
  }

  // -------------------------------------------------------------
  // 1. VUE ARTICLES & GUIDES
  // -------------------------------------------------------------
  function renderArticlesView(container) {
    const categories = window.ACADEMY_DATA.categories;
    const articles = window.ACADEMY_DATA.articles.filter(art => {
      const matchCat = activeCategory === 'all' || art.category === activeCategory;
      const matchSearch = !activeSearch ||
        art.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
        art.summary.toLowerCase().includes(activeSearch.toLowerCase()) ||
        art.content.toLowerCase().includes(activeSearch.toLowerCase());
      return matchCat && matchSearch;
    });

    let catPillsHtml = categories.map(c => `
      <button class="filter-pill ${activeCategory === c.id ? 'active' : ''}" onclick="setAcademyCategory('${c.id}')" style="padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600; border:1px solid var(--border-color); background:${activeCategory === c.id ? 'var(--primary-color)' : 'var(--card-bg)'}; color:${activeCategory === c.id ? '#fff' : 'var(--text-color)'}; cursor:pointer; transition:all 0.2s;">
        ${c.icon} ${c.label}
      </button>
    `).join('');

    let articlesGridHtml = articles.map(art => {
      const levelObj = window.ACADEMY_DATA.levels.find(l => l.id === art.level) || { label: art.level, color: '#009CD7' };
      return `
        <div class="academy-card article-card" onclick="openAcademyArticle('${art.id}')" style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:22px; cursor:pointer; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span style="font-size:11px; font-weight:700; padding:4px 10px; border-radius:12px; background:${levelObj.color}18; color:${levelObj.color}; border:1px solid ${levelObj.color}40;">
                ${levelObj.label}
              </span>
              <span style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:4px;">
                ⏱️ ${art.readTime}
              </span>
            </div>
            <h3 style="font-size:16px; font-weight:700; color:var(--text-color); margin:0 0 10px 0; line-height:1.4;">
              ${art.title}
            </h3>
            <p style="font-size:13px; color:var(--text-muted); line-height:1.5; margin:0 0 16px 0;">
              ${art.summary}
            </p>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:12px; font-size:12px; color:var(--text-muted);">
            <span>✍️ ${art.author}</span>
            <span style="color:var(--primary-color); font-weight:700; display:flex; align-items:center; gap:4px;">Lire le guide →</span>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:18px;">
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--text-color); margin:0 0 4px 0;">Base Documentaire &amp; Guides Métier BPMN 2.0</h2>
            <p style="font-size:13px; color:var(--text-muted); margin:0;">Conventions de nommage, bonnes pratiques de modélisation Camunda Modeler et suivi dans Camunda Operate.</p>
          </div>
          <div style="min-width:280px;">
            <input type="text" id="academySearchInput" placeholder="🔍 Rechercher une règle, astuce, mot-clé..." value="${activeSearch}" oninput="handleAcademySearch(this.value)" style="width:100%; padding:10px 16px; border-radius:10px; border:1px solid var(--border-color); background:var(--input-bg, #0b1528); color:var(--text-color); font-size:13px;">
          </div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:22px;">
          ${catPillsHtml}
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px;">
        ${articles.length > 0 ? articlesGridHtml : '<div style="grid-column:1/-1; text-align:center; padding:50px 20px; color:var(--text-muted);">Aucun article trouvé pour cette recherche.</div>'}
      </div>
    `;
  }

  window.setAcademyCategory = function (catId) {
    activeCategory = catId;
    renderAcademyContent();
  };

  window.handleAcademySearch = function (val) {
    activeSearch = val;
    renderAcademyContent();
  };

  // Modal de lecture d'article
  window.openAcademyArticle = function (artId) {
    const art = window.ACADEMY_DATA.articles.find(a => a.id === artId);
    if (!art) return;

    let modal = document.getElementById('academyArticleModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'academyArticleModal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
      document.body.appendChild(modal);
    }

    const levelObj = window.ACADEMY_DATA.levels.find(l => l.id === art.level) || { label: art.level, color: '#009CD7' };

    // Format markdown riche et lisible
    let formattedContent = art.content
      .replace(/### (.*)/g, '<h3 style="font-size:17px; font-weight:800; color:#003882; margin:24px 0 10px 0; border-bottom:1.5px solid #e2e8f0; padding-bottom:6px;">$1</h3>')
      .replace(/#### (.*)/g, '<h4 style="font-size:14.5px; font-weight:700; color:#009CD7; margin:18px 0 8px 0;">$1</h4>')
      .replace(/```(java|json|xml|)([\s\S]*?)```/g, '<pre style="background:#0f172a; border:1px solid #1e293b; border-radius:10px; padding:16px; overflow-x:auto; font-family:JetBrains Mono, monospace; font-size:12.5px; color:#38bdf8; line-height:1.55; margin:14px 0;"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9; border:1px solid #cbd5e1; padding:2px 6px; border-radius:6px; font-size:12px; color:#003882; font-family:JetBrains Mono, monospace; font-weight:600;">$1</code>')
      .replace(/\n\n/g, '<p style="margin:0 0 14px 0; line-height:1.65; color:#334155; font-size:13.5px;"></p>');

    modal.innerHTML = `
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; max-width:880px; width:100%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 25px 60px -12px rgba(15,23,42,0.3); overflow:hidden; animation:modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="padding:18px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; font-weight:700; padding:4px 10px; border-radius:12px; background:${levelObj.color}15; color:${levelObj.color}; border:1px solid ${levelObj.color}35;">
              ${levelObj.label}
            </span>
            <span style="font-size:12px; color:#64748b; font-weight:600;">⏱️ ${art.readTime} de lecture • ✍️ ${art.author}</span>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <button onclick="window.print()" class="btn-ghost" style="padding:6px 14px; font-size:12px; font-weight:700; display:flex; align-items:center; gap:6px; border:1px solid #cbd5e1; background:#ffffff; color:#334155;">
              🖨️ Imprimer / PDF
            </button>
            <button onclick="closeAcademyArticleModal()" class="close-modal" style="background:#e2e8f0; color:#334155; width:32px; height:32px; border-radius:50%; border:none; cursor:pointer; font-size:15px; font-weight:700; display:flex; align-items:center; justify-content:center;">✕</button>
          </div>
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
        <div style="padding:16px 28px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; background:#f8fafc;">
          <button class="btn-primary" onclick="closeAcademyArticleModal()" style="padding:8px 24px; font-size:13px; font-weight:700; background:linear-gradient(135deg, #003882 0%, #009CD7 100%); color:#ffffff; border:none; border-radius:10px; cursor:pointer;">
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
  // 2. VUE DO'S & DON'TS (ANTI-PATTERNS VS BONNES PRATIQUES)
  // -------------------------------------------------------------
  function renderDosDontsView(container) {
    const items = window.ACADEMY_DATA.dosAndDonts;

    let cardsHtml = items.map(item => {
      const severityColor = item.severity === 'critical' ? '#EF4444' : (item.severity === 'high' ? '#EA5B0C' : '#F59E0B');
      return `
        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:16px; padding:24px; margin-bottom:22px; box-shadow:0 8px 24px rgba(0,0,0,0.2);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:18px; font-weight:800; color:var(--text-color);">${item.title}</span>
              <span style="font-size:11px; padding:3px 9px; border-radius:10px; background:var(--bg-secondary); border:1px solid var(--border-color); color:var(--text-muted); font-weight:600;">
                ${item.category}
              </span>
            </div>
            <span style="font-size:11px; font-weight:800; padding:4px 10px; border-radius:12px; background:${severityColor}18; color:${severityColor}; border:1px solid ${severityColor}40; text-transform:uppercase;">
              Impact ${item.severity}
            </span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <!-- Colonne Anti-Pattern -->
            <div style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.25); border-radius:12px; padding:18px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                <span style="font-size:18px;">❌</span>
                <strong style="color:#EF4444; font-size:14px; text-transform:uppercase; letter-spacing:0.5px;">À Éviter (Anti-Pattern)</strong>
              </div>
              <p style="font-size:13px; color:var(--text-color); margin:0 0 10px 0; line-height:1.5;">
                ${item.badDesc}
              </p>
              <div style="font-size:12px; color:#F87171; background:rgba(239,68,68,0.1); padding:8px 12px; border-radius:8px; border-left:3px solid #EF4444;">
                <strong>⚠️ Conséquence :</strong> ${item.badImpact}
              </div>
            </div>

            <!-- Colonne Bonne Pratique -->
            <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.25); border-radius:12px; padding:18px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                <span style="font-size:18px;">✅</span>
                <strong style="color:#10B981; font-size:14px; text-transform:uppercase; letter-spacing:0.5px;">Recommandation Bouygues Telecom</strong>
              </div>
              <p style="font-size:13px; color:var(--text-color); margin:0 0 10px 0; line-height:1.5;">
                ${item.goodDesc}
              </p>
              <div style="font-size:12px; color:#34D399; background:rgba(16,185,129,0.1); padding:8px 12px; border-radius:8px; border-left:3px solid #10B981;">
                <strong>🎯 Bénéfice :</strong> ${item.goodBenefit}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:20px; font-weight:800; color:var(--text-color); margin:0 0 6px 0;">⚖️ Galerie Comparative Do's &amp; Don'ts</h2>
        <p style="font-size:13px; color:var(--text-muted); margin:0;">Visualisez immédiatement les erreurs fréquentes de modélisation et leurs solutions standardisées.</p>
      </div>
      <div>
        ${cardsHtml}
      </div>
    `;
  }

  // -------------------------------------------------------------
  // 3. VUE PARCOURS DE FORMATION
  // -------------------------------------------------------------
  function renderTracksView(container) {
    const tracks = window.ACADEMY_DATA.learningTracks;
    const userProgress = JSON.parse(localStorage.getItem('paprika_academy_progress') || '{}');

    let tracksHtml = tracks.map(track => {
      // Calculer le taux de complétion
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
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; margin-bottom:6px; font-size:13px;">
              <span style="color:${isDone ? 'var(--text-muted)' : 'var(--text-color)'}; text-decoration:${isDone ? 'line-through' : 'none'}; display:flex; align-items:center; gap:8px;">
                ${isDone ? '🟢' : '⚪'} ${lesson}
              </span>
              <button onclick="toggleAcademyLesson('${key}')" class="btn-ghost" style="padding:4px 10px; font-size:11px; font-weight:700; color:${isDone ? '#10B981' : 'var(--primary-color)'};">
                ${isDone ? 'Terminé ✓' : 'Marquer comme fait'}
              </button>
            </div>
          `;
        }).join('');

        return `
          <div style="margin-bottom:16px;">
            <h4 style="font-size:14px; font-weight:700; color:var(--text-color); margin:0 0 8px 0;">
              📌 ${mod.title}
            </h4>
            <div style="padding-left:10px;">
              ${lessonsHtml}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:16px; padding:24px; margin-bottom:24px; box-shadow:0 8px 24px rgba(0,0,0,0.2);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:16px;">
            <div>
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                <span style="font-size:24px;">${track.icon}</span>
                <h3 style="font-size:18px; font-weight:800; color:var(--text-color); margin:0;">${track.title}</h3>
              </div>
              <p style="font-size:13px; color:var(--text-muted); margin:0 0 6px 0;">${track.description}</p>
              <div style="display:flex; gap:14px; font-size:12px; color:var(--text-muted);">
                <span>🎯 <strong>Public cible :</strong> ${track.targetAudience}</span>
                <span>⏱️ <strong>Durée estimée :</strong> ${track.duration}</span>
              </div>
            </div>
            <div style="min-width:180px; text-align:right;">
              <div style="font-size:12px; font-weight:700; color:var(--text-color); margin-bottom:6px;">
                Progression : ${percent}% (${completedLessons}/${totalLessons})
              </div>
              <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
                <div style="width:${percent}%; height:100%; background:${track.color}; transition:width 0.3s ease;"></div>
              </div>
            </div>
          </div>
          <div style="background:rgba(0,0,0,0.15); border-radius:12px; padding:18px;">
            ${modulesHtml}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:20px; font-weight:800; color:var(--text-color); margin:0 0 6px 0;">🎓 Cycles de Formation &amp; Montée en Compétences</h2>
        <p style="font-size:13px; color:var(--text-muted); margin:0;">Suivez nos parcours thématiques pour structurer votre expertise BPMN et Camunda pas à pas.</p>
      </div>
      <div>
        ${tracksHtml}
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
  // 4. VUE CAMUNDA MODELER & TEMPLATES
  // -------------------------------------------------------------
  function renderTemplatesView(container) {
    const templates = window.ACADEMY_DATA.templates;

    let templatesHtml = templates.map(tpl => `
      <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:14px; padding:22px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-size:11px; font-weight:700; padding:3px 10px; border-radius:10px; background:rgba(0,156,215,0.15); color:var(--primary-color); border:1px solid rgba(0,156,215,0.3);">
              ${tpl.category}
            </span>
            <span style="font-size:12px; font-family:monospace; color:var(--text-muted);">.bpmn XML</span>
          </div>
          <h3 style="font-size:16px; font-weight:800; color:var(--text-color); margin:0 0 8px 0;">${tpl.name}</h3>
          <p style="font-size:13px; color:var(--text-muted); margin:0 0 16px 0; line-height:1.5;">${tpl.description}</p>
        </div>
        <div style="display:flex; gap:10px; border-top:1px solid var(--border-color); padding-top:14px;">
          <button class="btn-primary" onclick="downloadAcademyTemplate('${tpl.id}')" style="flex:1; padding:8px 14px; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;">
            <span>📥 Télécharger .BPMN</span>
          </button>
          <button class="btn-ghost" onclick="copyAcademyTemplateXml('${tpl.id}')" title="Copier le XML" style="padding:8px 12px; font-size:12px;">
            📋 Copier XML
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <h2 style="font-size:20px; font-weight:800; color:var(--text-color); margin:0 0 6px 0;">🛠️ Intégration Camunda Modeler &amp; Bibliothèque de Templates</h2>
        <p style="font-size:13px; color:var(--text-muted); margin:0;">Téléchargez des fichiers BPMN types prêts à l'emploi et découvrez les plugins indispensables pour votre modélisateur local.</p>
      </div>

      <!-- Section Guide Modeler -->
      <div style="background:var(--card-bg); border:1px solid var(--border-color); border-radius:16px; padding:22px; margin-bottom:24px;">
        <h3 style="font-size:16px; font-weight:800; color:var(--text-color); margin:0 0 12px 0;">🔌 Configuration &amp; Plugins Recommandés pour Camunda Modeler</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; font-size:13px;">
          <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:10px; padding:14px;">
            <strong style="color:var(--primary-color);">1. Camunda Modeler Linter Plugin</strong>
            <p style="color:var(--text-muted); margin:6px 0 0 0;">Analyse les erreurs syntaxiques et les règles de nommage en temps réel dans l'éditeur desktop.</p>
          </div>
          <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:10px; padding:14px;">
            <strong style="color:var(--primary-color);">2. Token Simulation Plugin</strong>
            <p style="color:var(--text-muted); margin:6px 0 0 0;">Permet de simuler visuellement le passage des jetons (Tokens) et tester les passerelles avant déploiement.</p>
          </div>
          <div style="background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:10px; padding:14px;">
            <strong style="color:var(--primary-color);">3. Element Templates JSON</strong>
            <p style="color:var(--text-muted); margin:6px 0 0 0;">Standardise les formulaires de configuration des Service Tasks pour les équipes de développement.</p>
          </div>
        </div>
      </div>

      <!-- Section Templates -->
      <h3 style="font-size:16px; font-weight:800; color:var(--text-color); margin:0 0 16px 0;">📦 Templates BPMN 2.0 Types à Télécharger</h3>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:20px;">
        ${templatesHtml}
      </div>
    `;
  }

  window.downloadAcademyTemplate = function (tplId) {
    const tpl = window.ACADEMY_DATA.templates.find(t => t.id === tplId);
    if (!tpl) return;

    const blob = new Blob([tpl.xmlContent], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = tpl.xmlFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof showToast === 'function') showToast(`Template "${tpl.name}" téléchargé avec succès !`, 'success');
  };

  window.copyAcademyTemplateXml = function (tplId) {
    const tpl = window.ACADEMY_DATA.templates.find(t => t.id === tplId);
    if (!tpl) return;
    navigator.clipboard.writeText(tpl.xmlContent).then(() => {
      if (typeof showToast === 'function') showToast(`XML du template copié dans le presse-papiers !`, 'info');
    });
  };

  // -------------------------------------------------------------
  // 5. VUE QUIZ & AUTO-ÉVALUATION
  // -------------------------------------------------------------
  function renderQuizView(container) {
    const questions = window.ACADEMY_DATA.quizQuestions;

    if (quizState.completed) {
      const scorePercent = Math.round((quizState.score / questions.length) * 100);
      let badgeClass = scorePercent >= 80 ? 'success' : (scorePercent >= 50 ? 'warning' : 'danger');
      let badgeMsg = scorePercent >= 80 ? '🎉 Félicitations ! Vous maîtrisez les concepts Camunda & BPMN 2.0.' : (scorePercent >= 50 ? '👍 Bon score ! Révisez les guides pour consolider votre expertise.' : '⚠️ Prenez le temps de parcourir les articles de l\'Academy avant de réessayer.');

      container.innerHTML = `
        <div style="max-width:700px; margin:0 auto; background:var(--card-bg); border:1px solid var(--border-color); border-radius:18px; padding:36px; text-align:center; box-shadow:0 12px 36px rgba(0,0,0,0.3);">
          <div style="font-size:48px; margin-bottom:12px;">🏆</div>
          <h2 style="font-size:24px; font-weight:900; color:var(--text-color); margin:0 0 10px 0;">Résultat de votre Évaluation</h2>
          <div style="font-size:36px; font-weight:900; color:${scorePercent >= 80 ? '#10B981' : (scorePercent >= 50 ? '#009CD7' : '#EF4444')}; margin-bottom:14px;">
            ${quizState.score} / ${questions.length} (${scorePercent}%)
          </div>
          <p style="font-size:14px; color:var(--text-muted); margin:0 0 24px 0; line-height:1.6;">${badgeMsg}</p>
          <div style="display:flex; justify-content:center; gap:12px;">
            <button class="btn-primary" onclick="restartAcademyQuiz()" style="padding:10px 24px; font-size:13px; font-weight:700;">
              🔄 Recommencer le Quiz
            </button>
            <button class="btn-ghost" onclick="switchAcademySubTab('articles')" style="padding:10px 24px; font-size:13px; font-weight:700;">
              📚 Consulter les Guides
            </button>
          </div>
        </div>
      `;
      return;
    }

    const currentQ = questions[quizState.currentIndex];
    const isAnswered = quizState.userAnswers[quizState.currentIndex] !== undefined;
    const selectedIdx = quizState.userAnswers[quizState.currentIndex];

    let optionsHtml = currentQ.options.map((opt, idx) => {
      let optStyle = 'background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color);';
      if (isAnswered) {
        if (idx === currentQ.correct) {
          optStyle = 'background:rgba(16,185,129,0.15); border:1px solid #10B981; color:#34D399; font-weight:700;';
        } else if (idx === selectedIdx) {
          optStyle = 'background:rgba(239,68,68,0.15); border:1px solid #EF4444; color:#F87171; font-weight:700;';
        }
      }

      return `
        <button onclick="submitQuizAnswer(${idx})" ${isAnswered ? 'disabled' : ''} style="width:100%; text-align:left; padding:14px 18px; border-radius:12px; margin-bottom:10px; font-size:13px; cursor:${isAnswered ? 'default' : 'pointer'}; transition:all 0.2s; ${optStyle}">
          <span style="font-weight:700; margin-right:8px;">${String.fromCharCode(65 + idx)}.</span> ${opt}
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div style="max-width:750px; margin:0 auto; background:var(--card-bg); border:1px solid var(--border-color); border-radius:18px; padding:30px; box-shadow:0 10px 30px rgba(0,0,0,0.25);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
          <div>
            <span style="font-size:12px; font-weight:700; color:var(--primary-color);">QUESTION ${quizState.currentIndex + 1} SUR ${questions.length}</span>
          </div>
          <div style="font-size:12px; color:var(--text-muted);">
            Score actuel : <strong>${quizState.score}</strong>
          </div>
        </div>

        <h3 style="font-size:17px; font-weight:800; color:var(--text-color); margin:0 0 20px 0; line-height:1.5;">
          ${currentQ.question}
        </h3>

        <div style="margin-bottom:20px;">
          ${optionsHtml}
        </div>

        ${isAnswered ? `
          <div style="background:rgba(0,156,215,0.08); border-left:4px solid var(--primary-color); border-radius:8px; padding:14px 18px; margin-bottom:20px; font-size:13px; color:var(--text-color); line-height:1.5;">
            <strong>💡 Explication :</strong> ${currentQ.explanation}
          </div>
          <div style="display:flex; justify-content:flex-end;">
            <button class="btn-primary" onclick="nextQuizQuestion()" style="padding:10px 24px; font-size:13px; font-weight:700;">
              ${quizState.currentIndex + 1 < questions.length ? 'Question Suivante →' : 'Voir mon Résultat 🏆'}
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  window.submitQuizAnswer = function (idx) {
    const questions = window.ACADEMY_DATA.quizQuestions;
    const currentQ = questions[quizState.currentIndex];
    quizState.userAnswers[quizState.currentIndex] = idx;
    if (idx === currentQ.correct) {
      quizState.score++;
    }
    renderAcademyContent();
  };

  window.nextQuizQuestion = function () {
    const questions = window.ACADEMY_DATA.quizQuestions;
    if (quizState.currentIndex + 1 < questions.length) {
      quizState.currentIndex++;
    } else {
      quizState.completed = true;
    }
    renderAcademyContent();
  };

  window.restartAcademyQuiz = function () {
    quizState = {
      currentIndex: 0,
      userAnswers: [],
      completed: false,
      score: 0
    };
    renderAcademyContent();
  };

})();
