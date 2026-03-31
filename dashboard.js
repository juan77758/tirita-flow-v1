// =============================================
// TIRITA FLOW - Dashboard (Supabase + Google Drive BYOD)
// =============================================

const loginBtn = document.getElementById('btn-login');
const logoutBtn = document.getElementById('btn-logout');
const userEmailSpan = document.getElementById('user-email');
const projectsGrid = document.getElementById('projects-grid');
const newProjectBtn = document.getElementById('btn-new-project');
const toastContainer = document.getElementById('toast-container');
const confirmModal = document.getElementById('confirm-modal');

let currentUser = null;
let providerToken = null; // We need this for Google Drive

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

// ── Authentication ──

// Iniciar sesión con Google (pidiendo scopes de Drive)
loginBtn.addEventListener('click', async () => {
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;"></div> Conectando...';
  
  try {
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: window.GOOGLE_DRIVE_SCOPES,
        redirectTo: window.location.origin + window.location.pathname,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    if (error) throw error;
  } catch (error) {
    console.error('Error initiating Google login:', error);
    showToast('Error al iniciar sesión.', 'error');
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Log in con Google';
  }
});

// Cerrar sesión
logoutBtn.addEventListener('click', async () => {
  try {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) throw error;
    showToast('Sesión cerrada.', 'info');
  } catch (error) {
    console.error('Error logging out:', error);
  }
});

// Escuchar cambios de estado auth
window.supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    providerToken = session.provider_token; // IMPORTANT: Required for Google Drive API
    
    // Store token globally so new-project.js can use it if they share state (not needed here, but good practice)
    if (providerToken) {
      localStorage.setItem('tf_provider_token', providerToken);
    }
    // Store refresh token for Edge Function uploads (persists across sessions)
    if (session.provider_refresh_token) {
      localStorage.setItem('tf_provider_refresh_token', session.provider_refresh_token);
    }

    if (userEmailSpan) {
      userEmailSpan.textContent = currentUser.email;
      userEmailSpan.style.display = 'inline';
    }
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (newProjectBtn) newProjectBtn.style.display = 'inline-flex';
    
    loadProjects();
  } else {
    currentUser = null;
    providerToken = null;
    localStorage.removeItem('tf_provider_token');
    
    if (userEmailSpan) {
      userEmailSpan.textContent = '';
      userEmailSpan.style.display = 'none';
    }
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (newProjectBtn) newProjectBtn.style.display = 'none';
    if (projectsGrid) projectsGrid.innerHTML = '';
  }
});

// ── Data Loading ──
async function loadProjects() {
  if (!currentUser) return;
  
  if (projectsGrid) {
    projectsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem;">Cargando proyectos...</div>';
  }

  try {
    const { data: allProjects, error } = await window.supabaseClient
      .from('projects')
      .select('*, checklist_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    if (projectsGrid) projectsGrid.innerHTML = '';

    // Migramos la query de Supabase a filtro local porque la tabla original 
    // no tiene columna owner_uid (Restricción de no modificar schema)
    const myProjects = (allProjects || []).filter(p => {
      try {
        const meta = JSON.parse(p.target_url);
        return meta.owner_uid === currentUser.id;
      } catch (e) {
        // En caso de que haya registros anteriores con URL pura
         return false;
      }
    });

    // Update Top Stats
    const statTotal = document.getElementById('stat-total');
    const statPending = document.getElementById('stat-pending');
    const statCompleted = document.getElementById('stat-completed');
    
    if (statTotal) statTotal.textContent = myProjects.length;
    
    let totalItems = 0;
    let completedItems = 0;

    if (myProjects.length === 0) {
      if (statTotal) statTotal.textContent = '0';
      if (statPending) statPending.textContent = '0';
      if (statCompleted) statCompleted.textContent = '0';

      if (projectsGrid) {
        projectsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: var(--text-muted);">Aún no tienes proyectos. Crea uno para comenzar.</div>';
      }
    } else {
      myProjects.forEach(p => {
        try {
          // Restauramos la URL para la vista
          const meta = JSON.parse(p.target_url);
          p.target_url = meta.url;
        } catch(e) {}
        
        if (p.checklist_items) {
          totalItems += p.checklist_items.length;
          completedItems += p.checklist_items.filter(i => i.status === 'completed').length;
        }

        renderProjectCard(p);
      });
      
      if (statPending) statPending.textContent = (totalItems - completedItems).toString();
      if (statCompleted) statCompleted.textContent = completedItems.toString();
    }
  } catch (err) {
    console.error('Error fetching projects:', err);
    if (projectsGrid) projectsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: var(--text-muted);">Error al cargar proyectos.</div>';
    showToast('Error al cargar proyectos.', 'error');
  }
}

// ── Render Card ──
function renderProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'project-card';
  card.id = `project-${project.id}`;

  const clientUrl = `${window.location.origin}/client.html?id=${project.magic_link_hash}`;

  // ── Progress calculation ──
  const items = project.checklist_items || [];
  const totalFiles = items.length;
  const deliveredFiles = items.filter(i => i.status === 'completed' && i.file_url).length;
  const progressPercent = totalFiles > 0 ? Math.round((deliveredFiles / totalFiles) * 100) : 0;
  const isComplete = progressPercent === 100;

  const progressBarHtml = totalFiles > 0 ? `
    <div class="card-progress-section">
      <div class="card-progress-header">
        <span class="card-progress-counter">${deliveredFiles}/${totalFiles} Archivos Completados</span>
        <span class="card-progress-percent ${isComplete ? 'complete' : ''}">${progressPercent}%</span>
      </div>
      <div class="card-progress-track">
        <div class="card-progress-fill ${isComplete ? 'complete' : ''}" style="width:${progressPercent}%"></div>
      </div>
    </div>
  ` : '';

  let checklistHtml = '<div class="project-checklist" style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">';
  if (project.checklist_items && project.checklist_items.length > 0) {
    // Sort items: pending first, completed last
    const sortedItems = [...project.checklist_items].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === 'pending' ? -1 : 1;
    });

    checklistHtml += '<h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; letter-spacing: 0.5px;">Archivos Solicitados</h4>';
    
    sortedItems.forEach(item => {
      if (item.status === 'completed' && item.file_url) {
        checklistHtml += `
          <div style="font-size: 13px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 8px; background: rgba(0, 255, 128, 0.05); border-radius: 4px; border: 1px solid rgba(0, 255, 128, 0.1);">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color: #4CAF50;">✓</span>
              <span style="color: #eee;">${escapeHtml(item.title)}</span>
            </div>
            <a href="${item.file_url}" target="_blank" style="color: var(--accent-blue); text-decoration: none; font-weight: 500; font-size: 12px; display:flex; align-items:center; gap:4px; padding: 4px 8px; background: rgba(0, 150, 255, 0.1); border-radius: 4px; transition: all 0.2s;"><span>Abrir</span> <span style="font-size: 10px;">↗</span></a>
          </div>
        `;
      } else {
        checklistHtml += `
          <div style="font-size: 13px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 8px; opacity: 0.7;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color: var(--text-muted);">⏳</span>
              <span style="color: var(--text-secondary);">${escapeHtml(item.title)}</span>
            </div>
            <span style="font-size: 11px; color: var(--text-muted); border: 1px dashed var(--border-color); padding: 2px 6px; border-radius: 4px;">Pendiente</span>
          </div>
        `;
      }
    });
  } else {
    checklistHtml += `<div style="font-size: 12px; color: var(--text-muted); text-align: center;">No hay archivos solicitados.</div>`;
  }
  checklistHtml += '</div>';

  card.innerHTML = `
    <div class="project-header">
      <h3 class="project-title">${escapeHtml(project.name)}</h3>
      <span class="project-status">Activo</span>
    </div>
    <div class="project-meta">
      Creado: ${new Date(project.created_at).toLocaleDateString()}
    </div>
    ${progressBarHtml}
    <div class="project-actions" style="margin-bottom: 15px;">
      <button class="btn btn-secondary btn-sm" onclick="copyMagicLink('${clientUrl}')">
        🔗 Copiar Enlace Cliente
      </button>
      <a href="${clientUrl}" target="_blank" class="btn btn-ghost btn-sm" title="Ver como cliente">
        👁️
      </a>
      <button class="btn btn-danger btn-sm" onclick="promptDeleteProject('${project.id}', '${escapeHtml(project.name)}')">
        🗑️
      </button>
    </div>
    ${checklistHtml}
  `;
  projectsGrid.appendChild(card);
}

// ── Actions ──
window.copyMagicLink = async (url) => {
  try {
    await navigator.clipboard.writeText(url);
    showToast('Enlace copiado al portapapeles', 'success');
  } catch (err) {
    console.error('Failed to copy', err);
    showToast('Error al copiar el enlace', 'error');
  }
};

window.promptDeleteProject = (id, name) => {
  confirmModal.style.display = 'block';
  confirmModal.innerHTML = `
    <div class="confirm-modal-backdrop" id="modal-backdrop">
      <div class="confirm-modal-content">
        <h3>Eliminar Proyecto</h3>
        <p>¿Estás seguro que deseas eliminar el proyecto <strong>${name}</strong>? Se eliminarán todas sus tareas y feedback.</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px;">(La carpeta de Google Drive y los archivos no se eliminarán de tu cuenta de Google).</p>
        <div class="confirm-modal-actions">
          <button class="btn btn-secondary" id="btn-cancel">Cancelar</button>
          <button class="btn btn-danger" id="btn-confirm">Eliminar</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-cancel').onclick = () => confirmModal.style.display = 'none';
  document.getElementById('modal-backdrop').onclick = (e) => {
    if (e.target.id === 'modal-backdrop') confirmModal.style.display = 'none';
  };
  document.getElementById('btn-confirm').onclick = () => {
    confirmModal.style.display = 'none';
    deleteProject(id);
  };
};

async function deleteProject(id) {
  try {
    // Delete project from Supabase. With RLS and ON DELETE CASCADE, 
    // it will delete checklist_items and feedback_notes if set up correctly.
    const { error } = await window.supabaseClient
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    document.getElementById(`project-${id}`).remove();
    showToast('Proyecto eliminado', 'success');
    
    if (projectsGrid && projectsGrid.children.length === 0) {
      projectsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: var(--text-muted);">Aún no tienes proyectos. Crea uno para comenzar.</div>';
    }
  } catch (err) {
    console.error('Error deleting project:', err);
    showToast('Error al eliminar el proyecto', 'error');
  }
}

// Helper para prevenir XSS básico
function escapeHtml(unsafe) {
  return (unsafe || '').toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
