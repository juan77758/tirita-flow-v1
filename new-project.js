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

// Check auth on load
async function initSession() {
  const { data: { session }, error } = await window.supabaseClient.auth.getSession();
  if (error || !session) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = session.user;
  
  // Update token if changed
  if (session.provider_token) {
    providerToken = session.provider_token;
    localStorage.setItem('tf_provider_token', providerToken);
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

addChecklistItemBtn.addEventListener('click', () => {
  itemCount++;
  const itemDiv = document.createElement('div');
  itemDiv.className = 'checklist-item-row';
  itemDiv.dataset.index = checklistContainer.children.length;
  itemDiv.innerHTML = `
    <span class="checklist-item-number">${itemCount}</span>
    <input type="text" class="form-input checklist-input" placeholder="Ej: Logo en alta resolución" required>
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
async function createClientDriveFolder(projectName) {
  if (!providerToken) {
    throw new Error('No Google Drive OAuth token found. Por favor re-inicia sesión.');
  }

  const folderName = `TiritaFlow Client: ${projectName} - ${new Date().toISOString().split('T')[0]}`;
  
  const metadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${providerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('Drive API Error:', err);
    throw new Error('No se pudo crear la carpeta en Google Drive.');
  }

  const result = await response.json();
  
  // Optionally: Mover permissions (compartir folder con la Service Account de la Edge Function)
  // De lo contrario la Edge Function no podrá subir audios/videos a esta carpeta!
  try {
    await grantServiceAccountAccess(result.id);
  } catch (e) {
    console.warn("Could not auto-grant access to Service Account", e);
  }

  return result.id;
}

// Para que la Cloud Function (Service Account) pueda subir archivos a la carpeta
// de la agencia (que creó esta carpeta original), debemos darle acceso de Editor 'writer' al folder.
async function grantServiceAccountAccess(folderId) {
  const SERVICE_ACCOUNT_EMAIL = 'proyecto-tirita@appspot.gserviceaccount.com';
  
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${providerToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'writer',
      type: 'user',
      emailAddress: SERVICE_ACCOUNT_EMAIL
    })
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('Error compartiendo carpeta con la Service Account:', err);
    throw new Error('No se pudo compartir la carpeta.');
  }

  console.log("✅ Permisos de escritura otorgados al robot (Service Account):", SERVICE_ACCOUNT_EMAIL);
  return true; 
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
          owner_uid: currentUser.id 
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
