import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obtener y validar variables de entorno
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!googleClientId || !googleClientSecret || !supabaseUrl || !supabaseKey) {
      throw new Error('Faltan variables de entorno esenciales (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET).');
    }

    // 2. Parsear FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const projectId = formData.get('projectId') as string;
    const itemId = formData.get('itemId') as string;

    if (!file || !folderId || !itemId || !projectId) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros (file, folderId, itemId, projectId).' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📥 Recibiendo archivo ${file.name} para proyecto ${projectId}`);

    // 3. Obtener el refresh token del proyecto (almacenado por la agencia al crear el proyecto)
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    const { data: project, error: projError } = await supabaseClient
      .from('projects')
      .select('target_url')
      .eq('id', projectId)
      .single();

    if (projError || !project) {
      throw new Error('Proyecto no encontrado.');
    }

    const projectConfig = JSON.parse(project.target_url);
    const refreshToken = projectConfig.google_refresh_token;

    if (!refreshToken) {
      throw new Error('No hay refresh token de Google para este proyecto. La agencia debe re-crear el proyecto después de iniciar sesión.');
    }

    // 4. Usar el refresh token para obtener un access token fresco (como el usuario de la agencia)
    console.log("🔑 Obteniendo access token con refresh token...");
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      console.error("Token refresh error:", tokenErr);
      throw new Error(`No se pudo renovar el token de Google: ${tokenErr}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 5. Subir archivo a Google Drive como el usuario de la agencia
    const fileContent = await file.arrayBuffer();
    
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      parents: [folderId]
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + metadata.mimeType + '\r\n\r\n';

    const encoder = new TextEncoder();
    const prefixBytes = encoder.encode(multipartRequestBody);
    const suffixBytes = encoder.encode(closeDelimiter);
    
    const totalLength = prefixBytes.length + fileContent.byteLength + suffixBytes.length;
    const bodyBuffer = new Uint8Array(totalLength);
    bodyBuffer.set(prefixBytes, 0);
    bodyBuffer.set(new Uint8Array(fileContent), prefixBytes.length);
    bodyBuffer.set(suffixBytes, prefixBytes.length + fileContent.byteLength);

    console.log("🚀 Subiendo archivo a Google Drive como usuario de la agencia...");
    const driveRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: bodyBuffer,
      }
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      console.error("Google Drive API Error:", driveRes.status, errText);
      throw new Error(`Google Drive error ${driveRes.status}: ${errText}`);
    }

    const fileData = await driveRes.json();
    console.log("✅ Archivo subido a Drive:", fileData.id);

    // 6. Actualizar la base de datos
    const fileUrl = fileData.webViewLink;

    const { error: dbError } = await supabaseClient
      .from('checklist_items')
      .update({ status: 'completed', file_url: fileUrl })
      .eq('id', itemId);

    if (dbError) {
      console.error("DB Update Error", dbError);
      throw new Error("No se pudo actualizar el estado en la base de datos.");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      fileId: fileData.id, 
      fileUrl: fileUrl 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error procesando el archivo:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
