import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { JWT } from "npm:google-auth-library@9";
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
    const googleCredentials = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!googleCredentials || !supabaseUrl || !supabaseKey) {
      throw new Error('Faltan variables de entorno esenciales.');
    }

    // 2. Parsear FormData (El archivo, la carpeta destino Puesta por la Agencia, y meta)
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const projectId = formData.get('projectId') as string;
    const itemId = formData.get('itemId') as string;

    if (!file || !folderId || !itemId) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros de archivo o carpeta.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📥 Recibiendo archivo ${file.name} (Tirita Flow)`);

    // 3. Autenticación con Google API vía Service Account
    const keys = JSON.parse(googleCredentials);
    const client = new JWT({
      email: keys.client_email,
      key: keys.private_key,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    // Obtener access token para usar con fetch nativo
    const tokenResponse = await client.authorize();
    const accessToken = tokenResponse.access_token;
    if (!accessToken) {
      throw new Error('No se pudo obtener access token de Google.');
    }

    // 4. Transformar el archivo para subir a Drive
    const fileContent = await file.arrayBuffer();
    
    // Configuración metadata Google Drive Multipart
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

    const reqBodyTextEncoder = new TextEncoder();
    const prefixBytes = reqBodyTextEncoder.encode(multipartRequestBody);
    const suffixBytes = reqBodyTextEncoder.encode(closeDelimiter);
    
    // Merge de arreglos de bytes para la request multipart
    const totalLength = prefixBytes.length + fileContent.byteLength + suffixBytes.length;
    const bodyBuffer = new Uint8Array(totalLength);
    bodyBuffer.set(prefixBytes, 0);
    bodyBuffer.set(new Uint8Array(fileContent), prefixBytes.length);
    bodyBuffer.set(suffixBytes, prefixBytes.length + fileContent.byteLength);

    console.log("🚀 Subiendo archivo a Google Drive...");
    // Usar fetch nativo en vez de client.request() porque gaxios
    // serializa Uint8Array a JSON, corrompiendo el cuerpo multipart.
    const driveRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(bodyBuffer.length),
        },
        body: bodyBuffer,
      }
    );

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      console.error("Google Drive API Error:", driveRes.status, errText);
      throw new Error(`Google Drive API error ${driveRes.status}: ${errText}`);
    }

    const fileData = await driveRes.json();
    console.log("✅ Google Drive Response:", fileData.id);

    // 5. Actualizar la base de datos de Supabase
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    const fileUrl = fileData.webViewLink;

    const { error: dbError } = await supabaseClient
      .from('checklist_items')
      .update({ status: 'completed', file_url: fileUrl })
      .eq('id', itemId);

    if (dbError) {
      console.error("DB Update Error", dbError);
      throw new Error("No se pudo actualizar el estado de la base de datos.");
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
