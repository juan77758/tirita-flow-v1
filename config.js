// =============================================
// TIRITA FLOW - Global Configuration (Supabase)
// =============================================
// Reemplazamos Firebase por Supabase como backend principal.
// Google Drive se mantiene para almacenamiento BYOD.

const SUPABASE_URL = 'https://hjwhjkmaogojpbwbvnwb.supabase.co'; // <-- Remplazar en producción
const SUPABASE_ANON_KEY = 'sb_publishable_PBjtLQ8RII6sq6u8Z1iwNw_y1Il478E'; // <-- Remplazar en producción

// Inicializar Supabase Client (usando global provisto por el CDN)
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL de la Edge Function (se usará en client.js para subir archivos)
// En producción, reemplazar localhost por la URL real de la Edge Function.
window.EDGE_FUNCTION_URL = 'https://hjwhjkmaogojpbwbvnwb.supabase.co/functions/v1/upload-to-drive';

// Scopes requeridos para crear carpetas en Google Drive (Agencia)
window.GOOGLE_DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';

console.log('✅ Supabase configurado (Backend)');
