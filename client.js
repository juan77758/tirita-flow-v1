// =============================================
// TIRITA FLOW - Client Portal (Supabase + Drive BYOD)
// =============================================

// ── State ──
let projectData = null;
let projectId = null;
let checklistItems = [];
let feedbackNotes = [];
let feedbackMode = false;
let sidebarOpen = true;

// ── DOM ──
const toastContainer = document.getElementById('toast-container');
const loadingOverlay = document.getElementById('loading-overlay');
const errorState = document.getElementById('error-state');
const projectNameSidebar = document.getElementById('project-name-sidebar');
const checklistContent = document.getElementById('checklist-content');
const progressText = document.getElementById('sidebar-progress-text');
const progressBar = document.getElementById('sidebar-progress-bar');
const targetIframe = document.getElementById('target-iframe');
const clickOverlay = document.getElementById('click-overlay');
const pinsContainer = document.getElementById('pins-container');
const sidebar = document.getElementById('client-sidebar');
const feedbackModalContainer = document.getElementById('feedback-modal-container');

// ── Toast ──
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

// ── Load Project from Supabase ──
async function loadProject() {
  const params = new URLSearchParams(window.location.search);
  const hash = params.get('id');

  if (!hash) {
    showError();
    return;
  }

  try {
    // 1. Fetch Project
    const { data: project, error: pError } = await window.supabaseClient
      .from('projects')
      .select('*')
      .eq('magic_link_hash', hash)
      .single();

    if (pError || !project) {
      console.error('Project not found or error:', pError);
      showError();
      return;
    }

    projectData = project;
    projectId = project.id;

    // Parse target_url metadata workaround due to schema constraints
    try {
      const parsed = JSON.parse(projectData.target_url);
      projectData.target_url = parsed.url;
      projectData.gdrive_folder_id = parsed.folderId;
    } catch (e) {
      // It's a plain URL, so keep as is
    }

    // 2. Fetch Checklist
    const { data: checklist, error: cError } = await window.supabaseClient
      .from('checklist_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (cError) throw cError;
    checklistItems = checklist || [];

    // 3. Fetch Feedback Notes
    const { data: notes, error: nError } = await window.supabaseClient
      .from('feedback_notes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (nError) throw nError;
    feedbackNotes = notes || [];
    console.log(`📋 Feedback notes fetched: ${feedbackNotes.length}`, feedbackNotes);

    // Render UI
    projectNameSidebar.textContent = projectData.name;
    targetIframe.src = projectData.target_url;
    renderChecklist();
    renderPins();
    hideLoading();

    console.log(`✅ Proyecto cargado: ${projectData.name} (${projectId})`);
  } catch (err) {
    console.error('Error loading project:', err);
    showError();
  }
}

// ── Render Checklist ──
function renderChecklist() {
  const total = checklistItems.length;
  const completed = checklistItems.filter(i => i.status === 'completed').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  progressText.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  if (percent === 100) progressBar.style.background = 'var(--accent-green)';

  checklistContent.innerHTML = checklistItems.map(item => `
    <div class="checklist-card ${item.status === 'completed' ? 'completed' : ''}" data-item-id="${item.id}">
      <div class="checklist-card-header">
        <div class="checklist-card-status ${item.status === 'completed' ? 'status-done' : 'status-pending'}">
          ${item.status === 'completed' ? '✅' : '⏳'}
        </div>
        <span class="checklist-card-title">${escapeHtml(item.title)}</span>
      </div>
      ${item.status === 'completed' && item.file_url ? `
        <a href="${item.file_url}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:8px;font-size:11px;">
          📎 Ver archivo entregado
        </a>
      ` : item.status !== 'completed' ? `
        <div class="upload-zone" data-item-id="${item.id}">
          <input type="file" class="file-input" id="file-${item.id}" 
            accept="image/*,video/*,.pdf,.zip,.rar,.ai,.psd,.fig,.sketch"
            style="display:none;">
          <button class="btn btn-secondary btn-sm upload-btn" 
            onclick="document.getElementById('file-${item.id}').click()">
            📤 Subir archivo
          </button>
          <span class="upload-hint">Arrastra o selecciona tu archivo</span>
          <div class="upload-progress" id="progress-${item.id}" style="display:none;">
            <div class="progress-bar" style="height:4px;">
              <div class="progress-fill" id="progress-fill-${item.id}" style="width:0%;transition:width 0.3s;"></div>
            </div>
            <span class="upload-status" id="status-${item.id}">Subiendo...</span>
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');

  // Attach file input listeners
  checklistItems.forEach(item => {
    if (item.status !== 'completed') {
      const fileInput = document.getElementById(`file-${item.id}`);
      if (fileInput) {
        fileInput.addEventListener('change', (e) => handleFileUpload(e, item.id));
      }
    }
  });
}

// ── File Upload via Supabase Edge Function ──
async function handleFileUpload(event, itemId) {
  const file = event.target.files[0];
  if (!file) return;

  // Max 500 MB limit on client-side
  if (file.size > 500 * 1024 * 1024) {
    showToast('El archivo excede 500 MB. Por favor, comprime el archivo.', 'error');
    return;
  }

  const progressEl = document.getElementById(`progress-${itemId}`);
  const progressFill = document.getElementById(`progress-fill-${itemId}`);
  const statusEl = document.getElementById(`status-${itemId}`);

  progressEl.style.display = 'block';
  statusEl.textContent = 'Preparando subida...';
  progressFill.style.width = '10%';

  try {
    const folderId = projectData.gdrive_folder_id;
    if (!folderId) {
      throw new Error('Este proyecto no tiene carpeta de Drive configurada.');
    }

    // Usamos FormData para enviar multipart form-data a la Edge Function
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);
    formData.append('projectId', projectId);
    formData.append('itemId', itemId);

    statusEl.textContent = `Subiendo ${file.name}... (puede tardar)`;
    progressFill.style.width = '30%';

    // Llamada a la Edge Function (upload-to-drive)
    const response = await fetch(window.EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: formData,
    });

    progressFill.style.width = '80%';

    if (!response.ok) {
      let errMsg = `Error HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        errMsg = errBody.error || errMsg;
      } catch (_) { /* no JSON body */ }
      throw new Error(errMsg);
    }

    const result = await response.json();
    progressFill.style.width = '100%';
    statusEl.textContent = '✅ ¡Archivo entregado!';

    console.log(`✅ Archivo subido a Drive y status actualizado.`);
    showToast(`¡"${file.name}" entregado exitosamente!`, 'success');

    // La Edge Function debió haber actualizado la DB, 
    // recargamos el checklist localmente:
    const item = checklistItems.find(i => i.id === itemId);
    if (item) {
      item.status = 'completed';
      item.file_url = result.fileUrl || null;
    }

    setTimeout(() => renderChecklist(), 1500);
  } catch (err) {
    console.error('Upload error:', err);
    progressFill.style.width = '0%';
    statusEl.textContent = '❌ Error al subir';
    showToast(`Error: ${err.message}`, 'error');
  }
}

// ── Feedback System ──
function toggleFeedbackMode() {
  feedbackMode = !feedbackMode;
  const btn = document.getElementById('toggle-feedback-btn');
  if (feedbackMode) {
    clickOverlay.style.pointerEvents = 'auto';
    clickOverlay.style.cursor = 'crosshair';
    btn.classList.add('active');
    btn.innerHTML = '📌 Feedback <span style="font-size:10px;opacity:0.7">(activo)</span>';
    showToast('Modo feedback activado. Haz clic sobre la web para dejar un comentario.', 'info');
  } else {
    clickOverlay.style.pointerEvents = 'none';
    clickOverlay.style.cursor = 'default';
    btn.classList.remove('active');
    btn.innerHTML = '📌 Feedback';
  }
}

function handleOverlayClick(e) {
  if (!feedbackMode) return;

  const rect = clickOverlay.getBoundingClientRect();
  const xPercent = ((e.clientX - rect.left) / rect.width * 100).toFixed(2);
  const yPercent = ((e.clientY - rect.top) / rect.height * 100).toFixed(2);

  showFeedbackModal(xPercent, yPercent);
}

function showFeedbackModal(x, y) {
  feedbackModalContainer.style.display = 'block';
  feedbackModalContainer.innerHTML = `
    <div class="feedback-modal-backdrop" id="feedback-backdrop">
      <div class="feedback-modal">
        <h3 style="margin:0 0 12px 0;color:var(--text-primary);">📌 Nuevo Comentario</h3>
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 12px 0;">Posición: ${x}%, ${y}%</p>
        <textarea id="feedback-text" class="form-input" rows="3" 
          placeholder="Escribe tu comentario aquí..." 
          style="resize:vertical;min-height:80px;" autofocus></textarea>
        <div class="confirm-modal-actions" style="margin-top:12px;">
          <button class="btn btn-secondary btn-sm" id="cancel-feedback">Cancelar</button>
          <button class="btn btn-primary btn-sm" id="submit-feedback">Enviar</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('cancel-feedback').addEventListener('click', () => {
    feedbackModalContainer.style.display = 'none';
  });
  document.getElementById('feedback-backdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) feedbackModalContainer.style.display = 'none';
  });
  document.getElementById('submit-feedback').addEventListener('click', () => submitFeedback(x, y));
  document.getElementById('feedback-text').focus();
}

async function submitFeedback(x, y) {
  const text = document.getElementById('feedback-text').value.trim();
  if (!text) {
    showToast('Escribe un comentario.', 'info');
    return;
  }

  try {
    const { data: note, error } = await window.supabaseClient
      .from('feedback_notes')
      .insert({
        project_id: projectId,
        x_coordinate: parseFloat(x),
        y_coordinate: parseFloat(y),
        comment_text: text,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;

    feedbackNotes.push(note);
    renderPins();
    feedbackModalContainer.style.display = 'none';
    showToast('¡Comentario enviado!', 'success');
  } catch (err) {
    console.error('Feedback error:', err);
    showToast('Error al enviar el comentario.', 'error');
  }
}

// ── Render Pins ──
function renderPins() {
  console.log(`🔵 renderPins() called — Total notes: ${feedbackNotes.length}`);
  
  if (!pinsContainer) {
    console.error('❌ #pins-container not found in DOM!');
    return;
  }

  if (feedbackNotes.length === 0) {
    console.log('⚪ No feedback notes to render.');
    pinsContainer.innerHTML = '';
    return;
  }

  pinsContainer.innerHTML = feedbackNotes.map((note, i) => {
    console.log(`  📌 Pin ${i + 1}: x=${note.x_coordinate}%, y=${note.y_coordinate}%, status=${note.status}, text="${note.comment_text}"`);
    return `
      <div class="feedback-pin ${note.status === 'resolved' ? 'resolved' : 'open'}" 
        style="left:${note.x_coordinate}%;top:${note.y_coordinate}%;"
        data-index="${i}">
        <div class="pin-number">${i + 1}</div>
      </div>
    `;
  }).join('');

  console.log(`✅ renderPins() complete — ${pinsContainer.children.length} pins injected into DOM`);
}

pinsContainer.addEventListener('click', (e) => {
  const pin = e.target.closest('.feedback-pin');
  if (!pin) return;
  const index = pin.getAttribute('data-index');
  const note = feedbackNotes[index];
  showNoteModal(note, index);
});

function showNoteModal(note, index) {
  feedbackModalContainer.style.display = 'block';
  feedbackModalContainer.innerHTML = `
    <div class="feedback-modal-backdrop" id="feedback-backdrop">
      <div class="feedback-modal">
        <h3 style="margin:0 0 12px 0;color:var(--text-primary);">📌 Comentario #${parseInt(index) + 1}</h3>
        <p style="font-size:14px;color:var(--text-secondary);margin:0 0 16px 0;line-height:1.5;white-space:pre-wrap;">${escapeHtml(note.comment_text)}</p>
        
        <div style="display:flex; justify-content: space-between; align-items: center; margin-top:12px;">
          <span style="font-size:12px;color:var(--text-muted);">
            Estado: <strong style="color:${note.status === 'resolved' ? 'var(--accent-green)' : 'var(--accent-red)'}">${note.status === 'resolved' ? 'Resuelto' : 'Pendiente'}</strong>
          </span>
          <div class="confirm-modal-actions">
            <button class="btn btn-secondary btn-sm" id="close-note">Cerrar</button>
            ${note.status === 'open' ? `<button class="btn btn-primary btn-sm" id="resolve-note">Marcar Resuelto</button>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('close-note').addEventListener('click', () => {
    feedbackModalContainer.style.display = 'none';
  });
  document.getElementById('feedback-backdrop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) feedbackModalContainer.style.display = 'none';
  });
  
  const resolveBtn = document.getElementById('resolve-note');
  if (resolveBtn) {
    resolveBtn.addEventListener('click', () => markNoteResolved(note.id, index));
  }
}

async function markNoteResolved(noteId, index) {
  try {
    const { error } = await window.supabaseClient
      .from('feedback_notes')
      .update({ status: 'resolved' })
      .eq('id', noteId);

    if (error) throw error;

    feedbackNotes[index].status = 'resolved';
    renderPins();
    feedbackModalContainer.style.display = 'none';
    showToast('Comentario marcado como resuelto.', 'success');
  } catch (err) {
    console.error('Error updating note:', err);
    showToast('Error al actualizar el comentario.', 'error');
  }
}

// ── Sidebar Toggle ──
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  sidebar.style.transform = sidebarOpen ? 'translateX(0)' : 'translateX(-100%)';
}

// ── Helpers ──
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError() {
  loadingOverlay.style.display = 'none';
  errorState.style.display = 'block';
}

function hideLoading() {
  loadingOverlay.style.display = 'none';
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('toggle-sidebar-btn').addEventListener('click', toggleSidebar);
  document.getElementById('toggle-feedback-btn').addEventListener('click', toggleFeedbackMode);
  document.getElementById('close-sidebar').addEventListener('click', toggleSidebar);
  clickOverlay.addEventListener('click', handleOverlayClick);

  loadProject();
});
