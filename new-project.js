// =============================================
// TIRITA FLOW - New Project (Supabase + Drive)
// =============================================

const projectForm = document.getElementById('project-form');
const addChecklistItemBtn = document.getElementById('add-item-btn');
const checklistContainer = document.getElementById('checklist-builder');
const submitBtn = document.getElementById('submit-btn');
const urlInput = document.getElementById('target-url');
const urlPreview = document.getElementById('url-preview');
const toastContainer = document.getElementById('toast-container');

// Session config
let currentUser = null;
let providerToken = localStorage.getItem('tf_provider_token');
let providerRefreshToken = localStorage.getItem('tf_provider_refresh_token');

// Check auth on load
async function initSession() {
  const { data: { session }, error } = await window.supabaseClient.auth.getSession();
  if (error || !session) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = session.user;
  
  // Update tokens if changed
  if (session.provider_token) {
    providerToken = session.provider_token;
    localStorage.setItem('tf_provider_token', providerToken);
  }
  if (session.provider_refresh_token) {
    providerRefreshToken = session.provider_refresh_token;
    localStorage.setItem('tf_provider_refresh_token', providerRefreshToken);
  }
}
initSession();

// ── Toast System ──
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-message">${message}</span>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 300ms forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── URL Live Preview ──
if (urlInput) {
  urlInput.addEventListener('input', (e) => {
    if (!urlPreview) return;
    const url = e.target.value.trim();
    try {
      if (url && new URL(url)) {
        urlPreview.innerHTML = `
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">Vista Previa (Frame):</div>
          <iframe src="${url}" sandbox="allow-same-origin allow-scripts" 
            onload="this.style.opacity=1"></iframe>
        `;
      }
    } catch {
      urlPreview.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100px;color:var(--text-muted);font-size:12px;">
          Ingresa una URL válida (ej. https://apple.com)
        </div>
      `;
    }
  });
}

// ── Dynamic Checklist ──
let itemCount = 1;

function updateItemNumbers() {
  const rows = checklistContainer.querySelectorAll('.checklist-item-row');
  rows.forEach((row, index) => {
    const numberSpan = row.querySelector('.checklist-item-number');
    if (numberSpan) numberSpan.textContent = index + 1;
    row.dataset.index = index;
    const removeBtn = row.querySelector('.btn-remove-item');
    if (removeBtn) {
      removeBtn.style.display = rows.length > 1 ? 'inline-block' : 'none';
    }
  });
}

const placeholders = [
  "Ej: Logo en alta resolución (PNG, AI, SVG)",
  "Ej: Video crudo para Reels (MP4, MOV)",
  "Ej: Textos de 'Quiénes Somos' (PDF, Word)",
  "Ej: Identidad visual / Brandbook"
];
let phIndex = 0;

addChecklistItemBtn.addEventListener('click', () => {
  itemCount++;
  const itemDiv = document.createElement('div');
  itemDiv.className = 'checklist-item-row';
  itemDiv.dataset.index = checklistContainer.children.length;
  
  const currentPlaceholder = placeholders[phIndex % placeholders.length];
  phIndex++;

  itemDiv.innerHTML = `
    <span class="checklist-item-number">${itemCount}</span>
    <input type="text" class="form-input checklist-input" placeholder="${currentPlaceholder}" required>
    <button type="button" class="btn-icon btn-remove-item" title="Eliminar">✕</button>
  `;
  checklistContainer.appendChild(itemDiv);

  itemDiv.querySelector('.btn-remove-item').addEventListener('click', () => {
    if (checklistContainer.children.length > 1) {
      itemDiv.remove();
      updateItemNumbers();
    } else {
      showToast('Debes pedir al menos 1 archivo', 'warning');
    }
  });
  
  updateItemNumbers();
});

// Delete btn init para el primero
const firstRemoveBtn = document.querySelector('.btn-remove-item');
if (firstRemoveBtn) {
  firstRemoveBtn.addEventListener('click', function() {
    if (checklistContainer.children.length > 1) {
      this.closest('.checklist-item-row').remove();
      updateItemNumbers();
    } else {
      showToast('Debes pedir al menos 1 archivo', 'warning');
    }
  });
}

// Ensure the first row has the correct display state initially
updateItemNumbers();

// ── Create Folder in Google Drive (BYOD) ──
async function getValidDriveToken() {
  // 1. Try refreshing the Supabase session to get a fresh provider token
  const { data: { session }, error } = await window.supabaseClient.auth.refreshSession();
  if (!error && session?.provider_token) {
    providerToken = session.provider_token;
    localStorage.setItem('tf_provider_token', providerToken);
    if (session.provider_refresh_token) {
      providerRefreshToken = session.provider_refresh_token;
      localStorage.setItem('tf_provider_refresh_token', providerRefreshToken);
    }
    return providerToken;
  }

  // 2. Fall back to stored token (might still be valid)
  if (providerToken) return providerToken;

  // 3. No token at all
  return null;
}

async function createClientDriveFolder(projectName) {
  let token = await getValidDriveToken();

  if (!token) {
    throw new Error('Tu sesión de Google Drive expiró. Por favor cierra sesión y vuelve a iniciar para reconectar Drive.');
  }

  const folderName = `TiritaFlow Client: ${projectName} - ${new Date().toISOString().split('T')[0]}`;
  
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  let response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  // If 401, the token expired — try re-auth
  if (response.status === 401) {
    console.warn('Drive token expired, forcing re-authentication...');
    // Force a fresh Google sign-in to get new Drive scopes
    const { error: oauthErr } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: window.GOOGLE_DRIVE_SCOPES,
        redirectTo: window.location.href, // come back to this page
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    if (oauthErr) throw new Error('No se pudo reconectar Google Drive. Cierra sesión y vuelve a entrar.');
    // The page will redirect, so we won't reach here
    return;
  }

  if (!response.ok) {
    const err = await response.json();
    console.error('Drive API Error:', err);
    throw new Error('No se pudo crear la carpeta en Google Drive.');
  }

  const result = await response.json();
  
  return result.id;
}


// ── Form Submit (Save to Drive & Supabase) ──
projectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;"></div> Creando Misión...';

  try {
    if (!currentUser) throw new Error("No autenticado");

    const projectName = document.getElementById('client-name').value.trim();
    const targetUrl = urlInput.value.trim();
    const checklistInputs = Array.from(document.querySelectorAll('.checklist-input'));
    const checklistTitles = checklistInputs.map(input => input.value.trim()).filter(Boolean);

    if (checklistTitles.length === 0) throw new Error("Añade al menos un elemento a la checklist.");

    // 1. Crear carpeta en Google Drive
    showToast('📁 Creando repositorio en Google Drive...', 'info');
    const folderId = await createClientDriveFolder(projectName);

    // 2. Crear proyecto en Supabase
    showToast('💾 Guardando configuración central...', 'info');
    
    // Hash magic pseudoaleatorio corto
    const magicHash = Math.random().toString(36).substring(2, 15);

    const { data: project, error: pError } = await window.supabaseClient
      .from('projects')
      .insert({
        name: projectName,
        target_url: JSON.stringify({ 
          url: targetUrl, 
          folderId: folderId, 
          owner_uid: currentUser.id,
          google_refresh_token: providerRefreshToken || null
        }),
        magic_link_hash: magicHash,
      })
      .select()
      .single();

    if (pError) throw pError;

    // 3. Crear checklist items en Supabase
    const checklistData = checklistTitles.map((title, index) => ({
      project_id: project.id,
      title: title,
      status: 'pending',
      file_url: null
    }));

    const { error: cError } = await window.supabaseClient
      .from('checklist_items')
      .insert(checklistData);

    if (cError) throw cError;

    showToast('✨ ¡Enlace mágico creado!', 'success');
    
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);

  } catch (err) {
    console.error('Project creation failed:', err);
    showToast(`Error: ${err.message}`, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '✨ Crear Centro de Comando y Enlace Mágico';
  }
});
