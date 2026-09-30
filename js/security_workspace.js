/**
 * PAPRIKA AUDITFLOW PRO - MODULE DE SÉCURITÉ & GESTIONNAIRE D'ESPACE DE TRAVAIL
 * Spécifiquement conçu pour Bouygues Telecom :
 * 1. Architecture 100% In-Memory (Zéro persistance non sollicitée sur disque / IndexedDB).
 * 2. Sauvegarde & Reprise d'espace de travail par Fichiers Snapshot Sécurisés (.paprika).
 * 3. Chiffrement optionnel AES-GCM (Web Crypto API) avec mot de passe corporate.
 * 4. Purge sécurisée totale de la mémoire vive (RAM) et des caches de session.
 */

(function () {
  'use strict';

  // -------------------------------------------------------------
  // 1. PURGE AUTOMATIQUE DES TRACES AU CHARGEMENT (Zéro persistance disque)
  // -------------------------------------------------------------
  window.sanitizeBrowserStorage = function () {
    try {
      // Nettoyer d'anciens caches d'audit ou variables stockées en clair
      const keysToClean = [
        'pda_camunda_pmg_state',
        'pda_camunda_bpmn_rules',
        'pda_camunda_bpmn_lint_rules',
        'pda_camunda_logged_in',
        'pda_session_time'
      ];
      keysToClean.forEach(k => localStorage.removeItem(k));

      // Supprimer les clés dynamiques pda_camunda_pmg_data_*
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('pda_camunda_pmg_data_')) {
          localStorage.removeItem(k);
        }
      });

      // Purger IndexedDB si présente
      if (window.indexedDB) {
        try {
          const req = indexedDB.deleteDatabase("CamundaAuditorDB");
          req.onsuccess = () => console.log("🔒 [Bouygues Telecom SSI] IndexedDB éphémère réinitialisée.");
        } catch (e) { }
      }
    } catch (err) {
      console.warn("Avertissement de nettoyage du stockage :", err);
    }
  };

  // Exécution immédiate au chargement du script
  window.sanitizeBrowserStorage();

  // -------------------------------------------------------------
  // 2. EXPORT DE L'ESPACE DE TRAVAIL (.paprika)
  // -------------------------------------------------------------
  window.exportSecureWorkspace = async function (password = null) {
    try {
      const exportTimestamp = new Date().toISOString();
      const filenameDate = exportTimestamp.replace(/[:.]/g, '-').slice(0, 19);

      // Collecte exhaustive de l'état In-Memory de tous les modules
      const workspacePayload = {
        meta: {
          app: "Paprika AuditFlow Pro",
          client: "Bouygues Telecom",
          version: "2.4.0",
          exportDate: exportTimestamp,
          classification: "Confidentiel Entreprise / Diffusion Restreinte",
          activeModule: window.currentModule || 'variables'
        },
        data: {
          // Module Variables & Audit
          variables: {
            allRows: window.allRows || [],
            isBPMNMode: window.isBPMNMode || false,
            bpmnFileName: window.bpmnFileName || null,
            bpmnBatch: window.bpmnBatch ? window.bpmnBatch.map(b => ({ fileName: b.fileName, rawXml: b.rawXml })) : [],
            bpmnXmlMap: window.bpmnXmlMap || {},
            analysisHistory: window.analysisHistory || [],
            activeHistoryId: window.activeHistoryId || null,
            customRules: window.rules || []
          },
          // Module Sous-processus
          subprocesses: {
            allSubprocessRows: window.allSubprocessRows || [],
            rawSubprocessFileData: window.rawSubprocessFileData || [],
            subprocessFileHeaders: window.subprocessFileHeaders || []
          },
          // Module Nommage BPMN
          bpmnNaming: {
            elements: window.bpmnNamingElements || [],
            rules: window.bpmnRules || []
          },
          // Module Audit Santé (Lint)
          bpmnLint: {
            results: window.bpmnLintResults || [],
            rules: window.bpmnLintRules || []
          },
          // Module PMG
          pmg: {
            activities: window.pmgActivities || [],
            processDetails: window.pmgProcessDetails || {},
            tempSubprocesses: window.pmgTempSubprocesses || [],
            realizationModes: window.pmgRealizationModes || []
          },
          // Modules Avancés
          lineage: {
            data: window.lineageDataset || null
          },
          tests: {
            scenarios: window.testScenariosDataset || null
          },
          architecture: {
            score: window.archScoreDataset || null
          },
          // Dictionnaire d'Entreprise & Catalogue de Données
          dataCatalog: window.enterpriseDataCatalog || [],
          // Matrice RACI & Rôles
          raci: window.raciState || null
        }
      };

      const rawJson = JSON.stringify(workspacePayload, null, 2);
      let fileBlob;
      let finalFilename = `audit_bouygues_telecom_${filenameDate}.paprika`;

      if (password && password.trim().length > 0) {
        // Chiffrement AES-GCM 256 bits avec Web Crypto API
        const encryptedData = await encryptPayload(rawJson, password.trim());
        const encryptedEnvelope = {
          encrypted: true,
          algorithm: "AES-GCM-256",
          salt: encryptedData.salt,
          iv: encryptedData.iv,
          cipherText: encryptedData.cipherText,
          meta: workspacePayload.meta
        };
        fileBlob = new Blob([JSON.stringify(encryptedEnvelope, null, 2)], { type: 'application/json' });
        finalFilename = `audit_bouygues_telecom_${filenameDate}.encrypted.paprika`;
      } else {
        fileBlob = new Blob([rawJson], { type: 'application/json' });
      }

      // Téléchargement sécurisé
      const link = document.createElement('a');
      link.href = URL.createObjectURL(fileBlob);
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (typeof showToast === 'function') {
        showToast(password ? "Espace de travail chiffré et exporté avec succès !" : "Espace de travail exporté avec succès !", "success");
      }
      closeSecureWorkspaceModal();
    } catch (err) {
      console.error("Erreur lors de l'export de l'espace de travail :", err);
      alert("Erreur lors de l'export sécurisé : " + err.message);
    }
  };

  // -------------------------------------------------------------
  // 3. IMPORT & RESTAURATION DE L'ESPACE DE TRAVAIL (.paprika)
  // -------------------------------------------------------------
  window.importSecureWorkspace = async function (file, password = null) {
    if (!file) return;

    try {
      const fileText = await file.text();
      let parsed = JSON.parse(fileText);

      // Si le fichier est chiffré, le déchiffrer avec le mot de passe
      if (parsed.encrypted && parsed.cipherText) {
        if (!password) {
          showPasswordPromptForDecryption(file, parsed);
          return;
        }
        const decryptedJson = await decryptPayload(parsed, password);
        parsed = JSON.parse(decryptedJson);
      }

      if (!parsed.data || !parsed.meta) {
        throw new Error("Format de fichier .paprika invalide ou corrompu.");
      }

      // 1. Restaurer Module Variables & Audit
      if (parsed.data.variables) {
        const v = parsed.data.variables;
        window.allRows = v.allRows || [];
        window.isBPMNMode = v.isBPMNMode || false;
        window.bpmnFileName = v.bpmnFileName || null;
        window.bpmnBatch = v.bpmnBatch || [];
        window.bpmnXmlMap = v.bpmnXmlMap || {};
        window.analysisHistory = v.analysisHistory || [];
        window.activeHistoryId = v.activeHistoryId || null;
        if (v.customRules && v.customRules.length > 0) window.rules = v.customRules;

        if (window.allRows.length > 0) {
          const resTab = document.getElementById('resultsTab');
          const dashTab = document.getElementById('dashTab');
          const graphTab = document.getElementById('graphTab');
          const rankTab = document.getElementById('rankTab');
          const dupTab = document.getElementById('duplicatesTab');
          if (resTab) resTab.style.display = '';
          if (dashTab) dashTab.style.display = '';
          if (graphTab) graphTab.style.display = '';
          if (rankTab) rankTab.style.display = '';
          if (dupTab) dupTab.style.display = '';
        }
      }

      // 2. Restaurer Module Sous-processus
      if (parsed.data.subprocesses) {
        const s = parsed.data.subprocesses;
        window.allSubprocessRows = s.allSubprocessRows || [];
        window.rawSubprocessFileData = s.rawSubprocessFileData || [];
        window.subprocessFileHeaders = s.subprocessFileHeaders || [];
        if (window.allSubprocessRows.length > 0) {
          const subAnalysisTab = document.getElementById('subAnalysisTab');
          const subMapTab = document.getElementById('subMapTab');
          if (subAnalysisTab) subAnalysisTab.style.display = '';
          if (subMapTab) subMapTab.style.display = '';
        }
      }

      // 3. Restaurer Module Nommage BPMN
      if (parsed.data.bpmnNaming) {
        const n = parsed.data.bpmnNaming;
        window.bpmnNamingElements = n.elements || [];
        if (n.rules && n.rules.length > 0) window.bpmnRules = n.rules;
        if (window.bpmnNamingElements.length > 0) {
          const bpmnNamingResultsTab = document.getElementById('bpmnNamingResultsTab');
          if (bpmnNamingResultsTab) bpmnNamingResultsTab.style.display = '';
        }
      }

      // 4. Restaurer Module Audit Santé (Lint)
      if (parsed.data.bpmnLint) {
        const l = parsed.data.bpmnLint;
        window.bpmnLintResults = l.results || [];
        if (l.rules && l.rules.length > 0) window.bpmnLintRules = l.rules;
        if (window.bpmnLintResults.length > 0) {
          const bpmnLintResultsTab = document.getElementById('bpmnLintResultsTab');
          if (bpmnLintResultsTab) bpmnLintResultsTab.style.display = '';
        }
      }

      // 5. Restaurer Module PMG
      if (parsed.data.pmg) {
        const p = parsed.data.pmg;
        window.pmgActivities = p.activities || [];
        window.pmgProcessDetails = p.processDetails || {};
        window.pmgTempSubprocesses = p.tempSubprocesses || [];
        window.pmgRealizationModes = p.realizationModes || [];
        if (window.pmgActivities.length > 0) {
          const pmgMatrixTab = document.getElementById('pmgMatrixTab');
          if (pmgMatrixTab) pmgMatrixTab.style.display = '';
        }
      }

      // 6. Restaurer Modules Avancés
      if (parsed.data.lineage && parsed.data.lineage.data) {
        window.lineageDataset = parsed.data.lineage.data;
      }
      if (parsed.data.tests && parsed.data.tests.scenarios) {
        window.testScenariosDataset = parsed.data.tests.scenarios;
      }
      if (parsed.data.architecture && parsed.data.architecture.score) {
        window.archScoreDataset = parsed.data.architecture.score;
      }
      if (parsed.data.dataCatalog && Array.isArray(parsed.data.dataCatalog)) {
        window.enterpriseDataCatalog = parsed.data.dataCatalog;
      }
      if (parsed.data.raci) {
        window.raciState = parsed.data.raci;
      }

      // 7. Basculer vers le module actif sauvegardé
      const targetModule = parsed.meta.activeModule || 'variables';
      if (typeof window.switchModule === 'function') {
        window.switchModule(targetModule);
      }

      if (typeof showToast === 'function') {
        showToast(`✅ Espace de travail restauré avec succès (${parsed.meta.exportDate ? new Date(parsed.meta.exportDate).toLocaleString() : 'session'}) !`, "success");
      }
      closeSecureWorkspaceModal();
    } catch (err) {
      console.error("Erreur lors de la restauration de l'espace de travail :", err);
      alert("Échec de la restauration : " + err.message);
    }
  };

  // -------------------------------------------------------------
  // 4. FONCTIONS DE SÉCURITÉ CRYPTOGRAPHIQUE (Web Crypto API)
  // -------------------------------------------------------------
  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptPayload(plainText, password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(plainText)
    );

    return {
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      cipherText: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
    };
  }

  async function decryptPayload(envelope, password) {
    const salt = new Uint8Array(envelope.salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(envelope.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const key = await deriveKey(password, salt);

    const binaryString = atob(envelope.cipherText);
    const cipherBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      cipherBytes[i] = binaryString.charCodeAt(i);
    }

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        cipherBytes
      );
      const dec = new TextDecoder();
      return dec.decode(decryptedBuffer);
    } catch (e) {
      throw new Error("Mot de passe incorrect ou fichier altéré.");
    }
  }

  // -------------------------------------------------------------
  // 5. PURGE TOTALE SÉCURISÉE (Wipe RAM & Quitter)
  // -------------------------------------------------------------
  window.purgeSessionAndRAM = function () {
    if (!confirm("⚠️ Confirmation de Sécurité Bouygues Telecom :\n\nVoulez-vous purger IMMÉDIATEMENT toute la mémoire vive (RAM) et détruire toutes les données d'audit chargées ?\n\n(Pensez à exporter votre fichier .paprika si vous souhaitez conserver votre travail).")) {
      return;
    }

    // 1. Écraser les variables mémoires globales
    window.allRows = [];
    window.bpmnBatch = [];
    window.bpmnXmlMap = {};
    window.analysisHistory = [];
    window.allSubprocessRows = [];
    window.rawSubprocessFileData = [];
    window.bpmnNamingElements = [];
    window.bpmnLintResults = [];
    window.pmgActivities = [];
    window.pmgTempSubprocesses = [];
    window.pmgProcessDetails = {};
    window.lineageDataset = null;
    window.testScenariosDataset = null;
    window.archScoreDataset = null;

    // 2. Nettoyer les traces de stockage
    window.sanitizeBrowserStorage();
    sessionStorage.clear();

    // 3. Réinitialiser l'affichage et renvoyer au login
    if (typeof handleLogout === 'function') {
      handleLogout();
    } else {
      location.reload();
    }
  };

  // -------------------------------------------------------------
  // 6. MODALS UI : GESTIONNAIRE D'ESPACE & CHARTE DE SÉCURITÉ
  // -------------------------------------------------------------
  window.openSecureWorkspaceModal = function (defaultTab = 'export') {
    let modal = document.getElementById('secureWorkspaceModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'secureWorkspaceModal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,10,25,0.85); backdrop-filter:blur(6px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
      document.body.appendChild(modal);
    }

    renderWorkspaceModalContent(modal, defaultTab);
    modal.style.display = 'flex';
  };

  window.closeSecureWorkspaceModal = function () {
    const modal = document.getElementById('secureWorkspaceModal');
    if (modal) modal.style.display = 'none';
  };

  function renderWorkspaceModalContent(modal, activeTab) {
    modal.innerHTML = `
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; max-width:680px; width:100%; box-shadow:0 25px 60px -12px rgba(15,23,42,0.3); overflow:hidden; animation:modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="padding:20px 26px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:36px; height:36px; border-radius:10px; background:rgba(0,156,215,0.12); border:1px solid #009CD7; display:flex; align-items:center; justify-content:center; font-size:18px;">
              🛡️
            </div>
            <div>
              <h3 style="margin:0; font-size:16px; font-weight:800; color:#003882;">Gestionnaire d'Espace Sécurisé Bouygues Telecom</h3>
              <p style="margin:2px 0 0 0; font-size:12px; color:#64748b; font-weight:600;">Zéro stockage persistant • Sauvegarde 100% autonome par fichier .paprika</p>
            </div>
          </div>
          <button onclick="closeSecureWorkspaceModal()" class="close-modal" style="background:#e2e8f0; color:#334155; width:32px; height:32px; border-radius:50%; border:none; cursor:pointer; font-size:15px; font-weight:700; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>

        <div style="display:flex; border-bottom:1px solid #e2e8f0; background:#f1f5f9;">
          <button class="tab ${activeTab === 'export' ? 'active' : ''}" onclick="openSecureWorkspaceModal('export')" style="flex:1; padding:14px; border:none; border-bottom:${activeTab === 'export' ? '3px solid #009CD7' : 'none'}; background:${activeTab === 'export' ? '#ffffff' : 'transparent'}; color:${activeTab === 'export' ? '#003882' : '#64748b'}; font-weight:800; font-size:13px; cursor:pointer; transition:all 0.2s;">
            💾 Sauvegarder la Session (.paprika)
          </button>
          <button class="tab ${activeTab === 'import' ? 'active' : ''}" onclick="openSecureWorkspaceModal('import')" style="flex:1; padding:14px; border:none; border-bottom:${activeTab === 'import' ? '3px solid #009CD7' : 'none'}; background:${activeTab === 'import' ? '#ffffff' : 'transparent'}; color:${activeTab === 'import' ? '#003882' : '#64748b'}; font-weight:800; font-size:13px; cursor:pointer; transition:all 0.2s;">
            📂 Reprendre une Session (.paprika)
          </button>
        </div>

        <div style="padding:26px; background:#ffffff;">
          ${activeTab === 'export' ? `
            <div>
              <div style="background:#f0f9ff; border-left:4px solid #009CD7; border-radius:8px; padding:14px 18px; margin-bottom:22px; font-size:13.5px; color:#0369a1; line-height:1.55;">
                <strong>💡 Principe de Sécurité Bouygues Telecom :</strong> Vos données ne restent jamais stockées dans le navigateur. L'export génère un instantané complet chiffrable de tous vos modules (variables, BPMN, règles, tests) que vous pouvez ranger sur votre disque sécurisé ou OneDrive d'entreprise.
              </div>

              <div style="margin-bottom:20px;">
                <label style="display:block; font-size:13px; font-weight:700; color:#0f172a; margin-bottom:6px;">
                  🔒 Mot de passe de chiffrement (Optionnel / Recommandé)
                </label>
                <input type="password" id="workspaceExportPassword" placeholder="Laissez vide pour un fichier standard ou entrez un mot de passe..." style="width:100%; padding:11px 14px; border-radius:10px; border:1.5px solid #cbd5e1; background:#f8fafc; color:#0f172a; font-size:13.5px; font-weight:600; outline:none;">
                <span style="font-size:12px; color:#64748b; display:block; margin-top:6px;">
                  Si renseigné, l'instantané sera chiffré en <strong>AES-GCM 256 bits</strong> et nécessitera ce mot de passe pour être réouvert.
                </span>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:26px; border-top:1px solid #e2e8f0; padding-top:18px;">
                <button class="btn-ghost" onclick="closeSecureWorkspaceModal()" style="padding:8px 20px; font-size:13px; font-weight:700; background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; border-radius:10px;">Annuler</button>
                <button class="btn-primary" onclick="triggerWorkspaceExportAction()" style="padding:9px 24px; font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px; background:linear-gradient(135deg, #003882 0%, #009CD7 100%); color:#ffffff; border:none; border-radius:10px; cursor:pointer;">
                  <span>📥 Télécharger mon Fichier .paprika</span>
                </button>
              </div>
            </div>
          ` : `
            <div>
              <div style="border:2px dashed #009CD7; border-radius:14px; padding:36px 20px; text-align:center; background:#f8fafc; cursor:pointer; margin-bottom:20px; transition:all 0.2s;" onclick="document.getElementById('workspaceImportFileInput').click()" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='#f8fafc'">
                <span style="font-size:42px; display:block; margin-bottom:12px;">📂</span>
                <strong style="font-size:15px; color:#003882; display:block; margin-bottom:4px;">Cliquez pour choisir votre fichier .paprika</strong>
                <span style="font-size:12.5px; color:#64748b;">ou glissez-déposez le fichier snapshot ici</span>
                <input type="file" id="workspaceImportFileInput" accept=".paprika,.json" style="display:none;" onchange="handleWorkspaceFileSelected(this.files[0])">
              </div>

              <div id="importPasswordContainer" style="display:none; margin-bottom:20px; background:#fffbeb; border:1px solid #fde68a; padding:14px; border-radius:10px;">
                <label style="display:block; font-size:13px; font-weight:700; color:#b45309; margin-bottom:6px;">
                  🔑 Ce fichier est chiffré — Entrez le mot de passe :
                </label>
                <input type="password" id="workspaceImportPassword" placeholder="Mot de passe de déchiffrement..." style="width:100%; padding:10px 14px; border-radius:8px; border:1.5px solid #f59e0b; background:#ffffff; color:#0f172a; font-size:13.5px; font-weight:600; outline:none;">
              </div>

              <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px; border-top:1px solid #e2e8f0; padding-top:18px;">
                <button class="btn-ghost" onclick="closeSecureWorkspaceModal()" style="padding:8px 20px; font-size:13px; font-weight:700; background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; border-radius:10px;">Annuler</button>
                <button class="btn-primary" id="btnExecuteWorkspaceImport" onclick="triggerWorkspaceImportAction()" disabled style="padding:9px 24px; font-size:13px; font-weight:700; background:linear-gradient(135deg, #003882 0%, #009CD7 100%); color:#ffffff; border:none; border-radius:10px; cursor:pointer;">
                  Restaurer la Session
                </button>
              </div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  let selectedImportFile = null;

  window.handleWorkspaceFileSelected = function (file) {
    if (!file) return;
    selectedImportFile = file;
    const btn = document.getElementById('btnExecuteWorkspaceImport');
    if (btn) {
      btn.disabled = false;
      btn.textContent = `Restaurer "${file.name}"`;
    }
  };

  window.triggerWorkspaceExportAction = function () {
    const pass = document.getElementById('workspaceExportPassword')?.value;
    window.exportSecureWorkspace(pass);
  };

  window.triggerWorkspaceImportAction = function () {
    if (!selectedImportFile) return;
    const pass = document.getElementById('workspaceImportPassword')?.value;
    window.importSecureWorkspace(selectedImportFile, pass);
  };

  function showPasswordPromptForDecryption(file, envelope) {
    const pwdContainer = document.getElementById('importPasswordContainer');
    if (pwdContainer) {
      pwdContainer.style.display = 'block';
      const pwdInput = document.getElementById('workspaceImportPassword');
      if (pwdInput) pwdInput.focus();
    } else {
      const pass = prompt("Ce fichier est protégé par chiffrement AES-GCM Bouygues Telecom. Entrez le mot de passe :");
      if (pass) {
        window.importSecureWorkspace(file, pass);
      }
    }
  }

  // -------------------------------------------------------------
  // 7. MODAL DE CONFORMITÉ & SÉCURITÉ BOUYGUES TELECOM
  // -------------------------------------------------------------
  window.openSecurityPolicyModal = function () {
    let modal = document.getElementById('securityPolicyModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'securityPolicyModal';
      modal.className = 'modal-overlay';
      modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.65); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; max-width:760px; width:100%; box-shadow:0 25px 60px -12px rgba(15,23,42,0.3); overflow:hidden; animation:modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
        <div style="padding:22px 28px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:40px; height:40px; border-radius:12px; background:rgba(16,185,129,0.12); border:1.5px solid #10B981; display:flex; align-items:center; justify-content:center; font-size:20px;">
              🛡️
            </div>
            <div>
              <h3 style="margin:0; font-size:17px; font-weight:800; color:#003882;">Charte de Sécurité &amp; Confidentialité Bouygues Telecom</h3>
              <span style="font-size:12px; color:#10B981; font-weight:700;">Conforme aux directives SSI &amp; RGPD</span>
            </div>
          </div>
          <button onclick="document.getElementById('securityPolicyModal').style.display='none'" class="close-modal" style="background:#e2e8f0; color:#334155; width:32px; height:32px; border-radius:50%; border:none; cursor:pointer; font-size:15px; font-weight:700; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>

        <div style="padding:28px; max-height:75vh; overflow-y:auto; font-size:13.5px; line-height:1.6; color:#334155; background:#ffffff;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:22px;">
            <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:14px; padding:18px;">
              <strong style="color:#003882; display:block; margin-bottom:6px; font-size:14px;">🔒 Exécution 100% Côté Client (In-Memory)</strong>
              <span style="color:#475569; font-size:13px; line-height:1.5;">Tous les parsers XML, algorithmes de détection et calculs d'impact s'exécutent exclusivement dans la mémoire vive de votre navigateur. Aucun flux métier ne transite vers un serveur distant.</span>
            </div>
            <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:14px; padding:18px;">
              <strong style="color:#10B981; display:block; margin-bottom:6px; font-size:14px;">🚫 Zéro Persistance sur Disque (Zero Data-at-Rest)</strong>
              <span style="color:#475569; font-size:13px; line-height:1.5;">L'application ne stocke silencieusement aucun fichier BPMN ni variable dans IndexedDB ou le localStorage. À la fermeture de l'onglet, la mémoire est libérée.</span>
            </div>
            <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:14px; padding:18px;">
              <strong style="color:#EA5B0C; display:block; margin-bottom:6px; font-size:14px;">📁 Fichiers Snapshot (.paprika)</strong>
              <span style="color:#475569; font-size:13px; line-height:1.5;">La sauvegarde de votre travail se fait uniquement par export explicite d'un fichier .paprika (avec chiffrement optionnel AES-GCM 256 bits).</span>
            </div>
            <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:14px; padding:18px;">
              <strong style="color:#8B5CF6; display:block; margin-bottom:6px; font-size:14px;">🧹 Bouton Purge d'Urgence (Panic Wipe)</strong>
              <span style="color:#475569; font-size:13px; line-height:1.5;">En un clic, vous pouvez détruire instantanément toutes les variables en mémoire vive et réinitialiser complètement l'environnement d'audit.</span>
            </div>
          </div>
        </div>

        <div style="padding:18px 28px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
          <button class="btn-ghost" onclick="purgeSessionAndRAM()" style="background:#fef2f2; border:1px solid #fecaca; color:#dc2626; font-weight:700; font-size:12.5px; padding:8px 16px; border-radius:8px; display:flex; align-items:center; gap:6px; cursor:pointer;">
            ⚠️ Purger la Session &amp; Vider la RAM
          </button>
          <button class="btn-primary" onclick="document.getElementById('securityPolicyModal').style.display='none'" style="padding:9px 24px; font-size:13px; font-weight:700; background:linear-gradient(135deg, #003882 0%, #009CD7 100%); color:#ffffff; border:none; border-radius:10px; cursor:pointer;">
            Compris &amp; Fermer
          </button>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  };

})();
