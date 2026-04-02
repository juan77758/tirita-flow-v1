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
let virtualScrollTop = 0;

// ── Thread State ──
let activeThreadItemId = null;
let threadMessages = [];
let threadFileVersions = [];

// ── User Role Detection ──
// Reads from URL: ?role=agency  |  Default: 'client'
// Future: replace with Supabase Auth session role lookup
const currentUserRole = (() => {
  const params = new URLSearchParams(window.location.search);
  const role = (params.get('role') || '').toLowerCase().trim();
  return role === 'agency' ? 'agency' : 'client';
})();
const currentUserLabel = currentUserRole === 'agency' ? 'Agencia' : 'Cliente';
console.log(`[Auth] Portal role: ${currentUserRole} (label: ${currentUserLabel})`);

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
const sidebar = document.getElementById('master-panel');
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

    // Render UI
    projectNameSidebar.textContent = projectData.name;
    
    // Welcome greeting
    const greetingEl = document.getElementById('sidebar-greeting');
    const greetingTextEl = document.getElementById('greeting-text');
    if (greetingEl && greetingTextEl) {
      greetingTextEl.textContent = `Hola, ${projectData.name}`;
      greetingEl.style.display = '';
    }

    targetIframe.src = projectData.target_url;
    renderChecklist();
    renderPins();
    hideLoading();

    // Agency mode indicator
    if (currentUserRole === 'agency') {
      const badge = document.createElement('div');
      badge.className = 'agency-mode-badge';
      badge.innerHTML = '🩹 Modo Agencia';
      badge.style.cssText = 'background:rgba(43,62,107,0.85);color:#fff;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-align:center;margin:8px 16px;border:1px solid rgba(43,62,107,0.9);';
      const masterPanel = document.getElementById('master-panel');
      if (masterPanel) masterPanel.insertBefore(badge, masterPanel.children[1]);
    }
    // Update comment input placeholder based on role
    const commentInput = document.getElementById('thread-comment-input');
    if (commentInput) {
      commentInput.placeholder = currentUserRole === 'agency'
        ? 'Responder como Agencia...'
        : 'Añadir comentario...';
    }

    console.log(`✅ Proyecto cargado: ${projectData.name} (${projectId})`);
  } catch (err) {
    console.error('Error loading project:', err);
    showError();
  }
}

// ── Render Checklist (Master View) ──
function renderChecklist() {
  const total = checklistItems.length;
  const completed = checklistItems.filter(i => i.status === 'completed' || i.review_status === 'approved').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  progressText.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
  if (percent === 100) progressBar.style.background = 'var(--accent-green)';

  checklistContent.innerHTML = checklistItems.map(item => {
    const rs = item.review_status || 'pending';
    const ver = item.current_version || 0;
    const comments = item.comment_count || 0;

    const pillMap = {
      'pending':            { cls: 'pill-pending',           icon: '⚪', label: 'Pendiente' },
      'in_review':          { cls: 'pill-in-review',         icon: '🟡', label: `V${ver} - En Revisión` },
      'changes_requested':  { cls: 'pill-changes-requested', icon: '🔴', label: `V${ver} - Cambios` },
      'approved':           { cls: 'pill-approved',          icon: '🟢', label: `V${ver} - Aprobado` },
    };
    const pill = pillMap[rs] || pillMap['pending'];

    return `
    <div class="checklist-card ${activeThreadItemId === item.id ? 'card-active' : ''}" data-item-id="${item.id}" onclick="openThreadDetail('${item.id}')">
      <div class="checklist-card-header">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
          <div class="checklist-card-status ${rs === 'approved' ? 'status-done' : 'status-pending'}">
            ${rs === 'approved' ? '✅' : '⏳'}
          </div>
          <span class="checklist-card-title">${escapeHtml(item.title)}</span>
        </div>
        <span class="checklist-card-arrow">›</span>
      </div>
      <div class="checklist-card-meta">
        <span class="review-pill ${pill.cls}">${pill.icon} ${pill.label}</span>
        ${comments > 0 ? `<span class="comment-count-badge">💬 ${comments}</span>` : ''}
      </div>
    </div>`;
  }).join('');
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

// ══════════════════════════════════════════════
// ── Delivery Thread System (Master-Detail) ──
// ══════════════════════════════════════════════

async function openThreadDetail(itemId) {
  activeThreadItemId = itemId;
  const item = checklistItems.find(i => i.id === itemId);
  if (!item) return;

  // Show detail panel as a separate column (master stays visible)
  const detailPanel = document.getElementById('detail-panel');
  detailPanel.classList.add('active');
  // Re-trigger animation
  detailPanel.style.animation = 'none';
  detailPanel.offsetHeight; // reflow
  detailPanel.style.animation = '';

  // Set header
  document.getElementById('thread-detail-title').textContent = `Detalle: ${item.title}`;

  // Highlight active card in master list
  renderChecklist();

  // Fetch thread data
  await fetchThreadData(itemId);
}

function closeThreadDetail() {
  activeThreadItemId = null;
  threadMessages = [];
  threadFileVersions = [];

  // Hide detail panel
  document.getElementById('detail-panel').classList.remove('active');

  // Refresh master view to remove active highlight
  renderChecklist();
}

async function fetchThreadData(itemId) {
  try {
    // Fetch file versions
    const { data: versions, error: vErr } = await window.supabaseClient
      .from('file_versions')
      .select('*')
      .eq('item_id', itemId)
      .order('version_number', { ascending: true });

    if (vErr) throw vErr;
    threadFileVersions = versions || [];

    // Fetch thread messages
    const { data: messages, error: mErr } = await window.supabaseClient
      .from('thread_messages')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true });

    if (mErr) throw mErr;
    threadMessages = messages || [];

    renderThread();
  } catch (err) {
    console.error('Error fetching thread:', err);
    showToast('Error al cargar el hilo.', 'error');
  }
}

function renderThread() {
  const item = checklistItems.find(i => i.id === activeThreadItemId);
  if (!item) return;

  // ── File Block ──
  const latestVersion = threadFileVersions.length > 0
    ? threadFileVersions[threadFileVersions.length - 1]
    : null;

  const fileName = document.getElementById('thread-file-name');
  const fileVersion = document.getElementById('thread-file-version');
  const fileDownload = document.getElementById('thread-file-download');

  if (latestVersion) {
    fileName.textContent = latestVersion.file_name;
    fileVersion.textContent = `Versión ${latestVersion.version_number}`;
    fileDownload.href = latestVersion.file_url;
    fileDownload.style.display = '';
  } else if (item.file_url) {
    fileName.textContent = 'Archivo entregado';
    fileVersion.textContent = 'V1';
    fileDownload.href = item.file_url;
    fileDownload.style.display = '';
  } else {
    fileName.textContent = 'Sin archivo aún';
    fileVersion.textContent = 'Esperando primera entrega';
    fileDownload.style.display = 'none';
  }

  // ── Action buttons state ──
  const approveBtn = document.getElementById('thread-btn-approve');
  const rejectBtn = document.getElementById('thread-btn-reject');
  const rs = item.review_status || 'pending';

  if (rs === 'approved') {
    approveBtn.disabled = true;
    approveBtn.textContent = '✅ Aprobado';
    rejectBtn.disabled = true;
  } else if (rs === 'pending' && !latestVersion && !item.file_url) {
    // No files yet — disable actions
    approveBtn.disabled = true;
    rejectBtn.disabled = true;
  } else {
    approveBtn.disabled = false;
    approveBtn.textContent = '✅ Aprobar Esta Versión';
    rejectBtn.disabled = false;
  }

  // ── Timeline ──
  const timeline = document.getElementById('thread-timeline');

  if (threadMessages.length === 0 && threadFileVersions.length === 0) {
    // We will let the simulation handle the empty state, so no early return here anymore.
  }

  // Build a unified chronological timeline
  const events = [];

  // Add file version events that don't have a corresponding message
  threadFileVersions.forEach(v => {
    const hasMsg = threadMessages.some(m => m.file_version_id === v.id);
    if (!hasMsg) {
      events.push({
        type: 'system_upload',
        sender_type: v.uploaded_by || 'client',
        sender_name: v.uploaded_by === 'agency' ? 'Agencia' : 'Cliente',
        message_text: `Subió ${v.file_name} (V${v.version_number})`,
        file_url: v.file_url,
        created_at: v.created_at
      });
    }
  });

  // Add messages
  threadMessages.forEach(m => {
    events.push(m);
  });

  // Sort chronologically
  events.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // --- SIMULATION MODE (when no real data exists) ---
  if (events.length === 0) {
    events.push({
      message_type: 'comment', sender_type: 'client', sender_name: 'Cliente', 
      message_text: 'Hola, adjunto la estructura solicitada para el logo.', 
      created_at: new Date(Date.now() - 3600000).toISOString()
    });
    events.push({
      message_type: 'comment', sender_type: 'agency', sender_name: 'Agencia', 
      message_text: '¡Recibido! Lo revisamos y te damos feedback pronto. 👍', 
      created_at: new Date(Date.now() - 2700000).toISOString()
    });
    events.push({
      message_type: 'comment', sender_type: 'client', sender_name: 'Cliente', 
      message_text: 'Perfecto, quedo atento.', 
      created_at: new Date(Date.now() - 1800000).toISOString()
    });
    events.push({
      message_type: 'comment', sender_type: 'agency', sender_name: 'Agencia', 
      message_text: 'Ojo con el color del fondo, necesitamos que sea más oscuro para contraste.', 
      created_at: new Date(Date.now() - 900000).toISOString()
    });
    events.push({
      message_type: 'comment', sender_type: 'client', sender_name: 'Cliente', 
      message_text: 'creo que ya, lo ajusté. ¿Puedes revisar?', 
      created_at: new Date(Date.now() - 300000).toISOString()
    });
  }
  // -------------------------

  const commentCountEl = document.getElementById('thread-comment-count-display');
  if (commentCountEl) {
    const msgCount = events.filter(e => e.message_type === 'comment' || (!e.type && !e.message_type?.startsWith('system'))).length;
    commentCountEl.textContent = `Comentarios (${msgCount})`;
  }

  timeline.innerHTML = events.map(ev => {
    const isSystem = ev.message_type?.startsWith('system') || ev.type === 'system_upload';
    // Strict sender_type check — NEVER default to anything without checking
    const senderType = (ev.sender_type || '').toLowerCase().trim();
    const isAgency = senderType === 'agency';
    const isClient = senderType === 'client' || (!isSystem && !isAgency);
    const msgClass = isSystem ? 'msg-system' : (isAgency ? 'msg-agency' : 'msg-client');

    console.log(`[Chat] sender_type="${ev.sender_type}" → class="${msgClass}" | text="${(ev.message_text || '').substring(0, 40)}"`);

    const avatarClass = isAgency ? 'avatar-agency'
                      : isSystem ? 'avatar-system'
                      : 'avatar-client';
    const avatarIcon = isAgency ? '🩹'
                     : isSystem ? '⚙️'
                     : '👤';
    const senderLabel = isAgency ? 'Agencia' : (isSystem ? 'Sistema' : 'Cliente');
    const time = formatTimeAgo(ev.created_at);
    const fileLink = ev.file_url
      ? `<a href="${ev.file_url}" target="_blank" class="thread-msg-file-link">📎 Ver archivo</a>`
      : '';

    return `
    <div class="thread-msg ${msgClass}">
      <div class="thread-msg-avatar ${avatarClass}">${avatarIcon}</div>
      <div class="thread-msg-body">
        <div class="thread-msg-header">
          <span class="thread-msg-sender">${escapeHtml(senderLabel)}</span>
          <span class="thread-msg-time">${time}</span>
        </div>
        <div class="thread-msg-text">${escapeHtml(ev.message_text)}</div>
        ${fileLink}
      </div>
    </div>`;
  }).join('');

  // Auto-scroll to bottom
  setTimeout(() => { timeline.scrollTop = timeline.scrollHeight; }, 50);
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

async function sendThreadComment() {
  const input = document.getElementById('thread-comment-input');
  const text = input.value.trim();
  if (!text || !activeThreadItemId) return;

  console.log(`[Chat] Sending as: ${currentUserRole} ("${currentUserLabel}")`);

  try {
    const { data: msg, error } = await window.supabaseClient
      .from('thread_messages')
      .insert({
        item_id: activeThreadItemId,
        project_id: projectId,
        message_type: 'comment',
        sender_type: currentUserRole,
        sender_name: currentUserLabel,
        message_text: text
      })
      .select()
      .single();

    if (error) throw error;

    threadMessages.push(msg);
    input.value = '';

    // Update comment count locally
    const item = checklistItems.find(i => i.id === activeThreadItemId);
    if (item) item.comment_count = (item.comment_count || 0) + 1;

    renderThread();
  } catch (err) {
    console.error('Error sending comment:', err);
    showToast('Error al enviar comentario.', 'error');
  }
}

async function uploadThreadVersion(event) {
  const file = event.target.files[0];
  if (!file || !activeThreadItemId) return;

  if (file.size > 500 * 1024 * 1024) {
    showToast('El archivo excede 500 MB.', 'error');
    return;
  }

  const progressEl = document.getElementById('thread-upload-progress');
  const progressFill = document.getElementById('thread-progress-fill');
  const statusEl = document.getElementById('thread-upload-status');

  progressEl.style.display = 'block';
  statusEl.textContent = 'Preparando subida...';
  progressFill.style.width = '10%';

  try {
    const folderId = projectData.gdrive_folder_id;
    if (!folderId) throw new Error('Proyecto sin carpeta de Drive.');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', folderId);
    formData.append('projectId', projectId);
    formData.append('itemId', activeThreadItemId);

    statusEl.textContent = `Subiendo ${file.name}...`;
    progressFill.style.width = '30%';

    const response = await fetch(window.EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: formData,
    });

    progressFill.style.width = '70%';

    if (!response.ok) {
      let errMsg = `Error HTTP ${response.status}`;
      try { const b = await response.json(); errMsg = b.error || errMsg; } catch (_) {}
      throw new Error(errMsg);
    }

    const result = await response.json();
    progressFill.style.width = '90%';

    // Determine next version number
    const nextVer = threadFileVersions.length > 0
      ? Math.max(...threadFileVersions.map(v => v.version_number)) + 1
      : 1;

    // Insert file version record
    const { data: version, error: vErr } = await window.supabaseClient
      .from('file_versions')
      .insert({
        item_id: activeThreadItemId,
        project_id: projectId,
        version_number: nextVer,
        file_name: file.name,
        file_url: result.fileUrl || result.url || '#',
        file_size: file.size,
        uploaded_by: 'client'
      })
      .select()
      .single();

    if (vErr) throw vErr;

    // Insert system message
    const { data: sysMsg, error: mErr } = await window.supabaseClient
      .from('thread_messages')
      .insert({
        item_id: activeThreadItemId,
        project_id: projectId,
        message_type: 'system_upload',
        sender_type: 'client',
        sender_name: 'Cliente',
        message_text: `Subió ${file.name} (V${nextVer})`,
        file_version_id: version.id
      })
      .select()
      .single();

    if (mErr) throw mErr;

    // Update checklist item status
    await window.supabaseClient
      .from('checklist_items')
      .update({
        review_status: 'in_review',
        current_version: nextVer,
        status: 'completed',
        file_url: result.fileUrl || result.url || '#'
      })
      .eq('id', activeThreadItemId);

    // Update local state
    const item = checklistItems.find(i => i.id === activeThreadItemId);
    if (item) {
      item.review_status = 'in_review';
      item.current_version = nextVer;
      item.status = 'completed';
      item.file_url = result.fileUrl || result.url || '#';
    }

    threadFileVersions.push(version);
    threadMessages.push(sysMsg);

    progressFill.style.width = '100%';
    statusEl.textContent = '✅ ¡Versión subida!';
    showToast(`V${nextVer} de "${file.name}" subida exitosamente.`, 'success');

    setTimeout(() => { progressEl.style.display = 'none'; }, 2000);
    renderThread();
  } catch (err) {
    console.error('Upload error:', err);
    progressFill.style.width = '0%';
    statusEl.textContent = '❌ Error al subir';
    showToast(`Error: ${err.message}`, 'error');
  }

  // Reset input
  event.target.value = '';
}

async function updateDeliverableStatus(status) {
  if (!activeThreadItemId) return;
  const item = checklistItems.find(i => i.id === activeThreadItemId);
  if (!item) return;

  const statusLabel = status === 'approved' ? 'Aprobado' : 'Cambios Solicitados';

  try {
    // Update DB
    const { error } = await window.supabaseClient
      .from('checklist_items')
      .update({ review_status: status })
      .eq('id', activeThreadItemId);

    if (error) throw error;

    // Insert system message
    const msgType = status === 'approved' ? 'system_approved' : 'system_changes_requested';
    const msgText = status === 'approved'
      ? `✅ Cliente aprobó la V${item.current_version || 1}.`
      : `🔴 Cliente solicitó cambios en V${item.current_version || 1}.`;

    const { data: sysMsg, error: mErr } = await window.supabaseClient
      .from('thread_messages')
      .insert({
        item_id: activeThreadItemId,
        project_id: projectId,
        message_type: msgType,
        sender_type: 'system',
        sender_name: 'Sistema',
        message_text: msgText
      })
      .select()
      .single();

    if (mErr) throw mErr;

    // Update local
    item.review_status = status;
    if (status === 'approved') item.status = 'completed';
    threadMessages.push(sysMsg);

    showToast(`Estado actualizado: ${statusLabel}`, 'success');
    renderThread();
  } catch (err) {
    console.error('Error updating status:', err);
    showToast('Error al actualizar el estado.', 'error');
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
  // Anchor pin to document position: viewport click + scroll offset
  const viewportYPx = e.clientY - rect.top;
  const absoluteYPx = viewportYPx + virtualScrollTop;
  const yPercent = (absoluteYPx / rect.height * 100).toFixed(2);

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
  if (!pinsContainer) return;

  if (feedbackNotes.length === 0) {
    pinsContainer.innerHTML = '';
    return;
  }

  pinsContainer.innerHTML = feedbackNotes.map((note, i) => `
    <div class="feedback-pin ${note.status === 'resolved' ? 'resolved' : 'open'}" 
      style="left:${note.x_coordinate}%;top:${note.y_coordinate}%;"
      data-index="${i}">
      <div class="pin-number">${i + 1}</div>
    </div>
  `).join('');

  // Re-apply current scroll transform
  syncPinsTransform();
}

// ── Scroll-Anchored Pins (Native via postMessage) ──
// For cross-origin iframes, native wheel interception locks the browser's scroll target.
// The robust solution is for the child site to report its scroll position via postMessage.
// Users must inject the provided script snippet into their client sites.
function initScrollTracking() {
  window.addEventListener('message', (e) => {
    if (e.data && (e.data.type === 'TIRITA_SCROLL' || e.data.type === 'tiritaScroll')) {
      virtualScrollTop = e.data.scrollTop || 0;
      syncPinsTransform();
    }
  });
}

function syncPinsTransform() {
  if (!pinsContainer) return;
  pinsContainer.style.transform = `translateY(-${virtualScrollTop}px)`;
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
  const masterPanel = document.getElementById('master-panel');
  masterPanel.style.transform = sidebarOpen ? 'translateX(0)' : 'translateX(-100%)';
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

// ── Mobile Tab System ──
const mobileQuery = window.matchMedia('(max-width: 768px)');
let currentMobileTab = 'entregables'; // Default tab on mobile

function isMobile() {
  return mobileQuery.matches;
}

function switchMobileTab(tab) {
  if (!isMobile()) return;

  const iframeArea = document.getElementById('iframe-area');
  const sidebarBtn = document.getElementById('toggle-sidebar-btn');
  const feedbackBtn = document.getElementById('toggle-feedback-btn');

  currentMobileTab = tab;

  if (tab === 'entregables') {
    // Show sidebar, hide iframe
    sidebar.classList.remove('mobile-hidden');
    iframeArea.classList.add('mobile-hidden');
    sidebarBtn.classList.add('active');
    feedbackBtn.classList.remove('active');

    // Deactivate feedback mode when switching away
    if (feedbackMode) {
      feedbackMode = false;
      clickOverlay.style.pointerEvents = 'none';
      clickOverlay.style.cursor = 'default';
    }
  } else {
    // Show iframe, hide sidebar
    sidebar.classList.add('mobile-hidden');
    iframeArea.classList.remove('mobile-hidden');
    sidebarBtn.classList.remove('active');
    feedbackBtn.classList.add('active');

    // Auto-activate feedback mode on mobile when switching to this tab
    if (!feedbackMode) {
      feedbackMode = true;
      clickOverlay.style.pointerEvents = 'auto';
      clickOverlay.style.cursor = 'crosshair';
      showToast('Modo feedback activado. Toca la web para comentar.', 'info');
    }
  }
}

function handleMobileResize() {
  const iframeArea = document.getElementById('iframe-area');
  const sidebarBtn = document.getElementById('toggle-sidebar-btn');
  const feedbackBtn = document.getElementById('toggle-feedback-btn');

  if (isMobile()) {
    // Entering mobile — apply current tab state
    switchMobileTab(currentMobileTab);
  } else {
    // Leaving mobile — restore desktop defaults
    sidebar.classList.remove('mobile-hidden');
    iframeArea.classList.remove('mobile-hidden');
    sidebarBtn.classList.remove('active');
    // Feedback button keeps its own active state from toggleFeedbackMode
    if (!feedbackMode) feedbackBtn.classList.remove('active');
  }
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  const sidebarBtn = document.getElementById('toggle-sidebar-btn');
  const feedbackBtn = document.getElementById('toggle-feedback-btn');

  sidebarBtn.addEventListener('click', () => {
    if (isMobile()) {
      switchMobileTab('entregables');
    } else {
      toggleSidebar();
    }
  });

  feedbackBtn.addEventListener('click', () => {
    if (isMobile()) {
      switchMobileTab('feedback');
    } else {
      toggleFeedbackMode();
    }
  });

  document.getElementById('close-sidebar').addEventListener('click', toggleSidebar);
  clickOverlay.addEventListener('click', handleOverlayClick);

  // ── Thread Detail Listeners ──
  document.getElementById('thread-back-btn').addEventListener('click', closeThreadDetail);
  document.getElementById('thread-btn-approve').addEventListener('click', () => updateDeliverableStatus('approved'));
  document.getElementById('thread-btn-reject').addEventListener('click', () => updateDeliverableStatus('changes_requested'));
  document.getElementById('thread-send-btn').addEventListener('click', sendThreadComment);
  document.getElementById('thread-comment-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendThreadComment();
    }
  });
  document.getElementById('thread-file-input').addEventListener('change', uploadThreadVersion);

  // Listen for viewport changes (rotate device, resize window)
  mobileQuery.addEventListener('change', handleMobileResize);

  // Set initial mobile state
  if (isMobile()) {
    switchMobileTab('entregables');
  }

  initScrollTracking();
  loadProject();
});
