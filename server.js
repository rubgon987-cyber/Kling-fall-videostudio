/**
 * Kling Video App - Servidor Backend
 * Aplicación web para generación de videos usando la API de Kling via fal.ai
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { fal } = require('@fal-ai/client');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN SEGURA DE API KEY ====================

// Ruta para almacenar la API key localmente (fuera del repo)
const LOCAL_CONFIG_PATH = path.join(__dirname, '.fal-config');

function getApiKey() {
  // Prioridad de lectura:
  // 1. Variable de entorno FAL_KEY
  // 2. Archivo local .fal-config
  // 3. Archivo .env.local
  
  if (process.env.FAL_KEY && process.env.FAL_KEY !== 'your_fal_api_key_here') {
    return process.env.FAL_KEY;
  }
  
  // Intentar leer de archivo local
  if (fs.existsSync(LOCAL_CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf8'));
      if (config.apiKey) {
        return config.apiKey;
      }
    } catch (e) {
      console.warn('Error leyendo configuración local:', e.message);
    }
  }
  
  // Intentar leer de .env.local
  const envLocalPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    try {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const match = envContent.match(/FAL_KEY\s*=\s*(.+)/);
      if (match && match[1]) {
        return match[1].trim().replace(/['"]/g, '');
      }
    } catch (e) {
      console.warn('Error leyendo .env.local:', e.message);
    }
  }
  
  return null;
}

function saveApiKeyLocally(apiKey) {
  try {
    fs.writeFileSync(LOCAL_CONFIG_PATH, JSON.stringify({ apiKey }, null, 2));
    return true;
  } catch (e) {
    console.error('Error guardando API key:', e.message);
    return false;
  }
}

// Inicializar fal.ai con la API key
const apiKey = getApiKey();
if (apiKey) {
  fal.config({ credentials: apiKey });
  console.log('✅ API key de fal.ai configurada');
} else {
  console.warn('⚠️  No se encontró API key de fal.ai');
  console.warn('   Configúrala en Settings o en el archivo .env');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de multer para uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== TEXT TO VIDEO ====================
app.post('/api/text-to-video', async (req, res) => {
  try {
    const { prompt, duration = '5', aspect_ratio = '16:9', generate_audio = true, negative_prompt, cfg_scale = 0.5, multi_prompt } = req.body;
    
    if (!prompt && !multi_prompt) {
      return res.status(400).json({ error: 'Se requiere prompt o multi_prompt' });
    }

    const input = {
      prompt,
      duration: duration.toString(),
      aspect_ratio,
      generate_audio,
      negative_prompt: negative_prompt || 'blur, distort, and low quality',
      cfg_scale
    };

    if (multi_prompt) {
      input.multi_prompt = multi_prompt;
      delete input.prompt;
    }

    const result = await fal.subscribe('fal-ai/kling-video/v3/pro/text-to-video', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`[Text-to-Video] Status: ${update.status}`);
      }
    });

    res.json({
      success: true,
      video: result.data.video,
      requestId: result.requestId
    });
  } catch (error) {
    console.error('Error en text-to-video:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== IMAGE TO VIDEO ====================
app.post('/api/image-to-video', upload.single('image'), async (req, res) => {
  try {
    const { prompt, duration = '5', generate_audio = true, negative_prompt, cfg_scale = 0.5 } = req.body;
    
    let imageUrl = req.body.start_image_url;
    
    // Si se subió un archivo, subirlo a fal.ai storage
    if (req.file && !imageUrl) {
      const file = new File([req.file.buffer], req.file.originalname, { type: req.file.mimetype });
      imageUrl = await fal.storage.upload(file);
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'Se requiere una imagen (URL o archivo)' });
    }

    const input = {
      start_image_url: imageUrl,
      prompt: prompt || '',
      duration: duration.toString(),
      generate_audio: generate_audio === 'true' || generate_audio === true,
      negative_prompt: negative_prompt || 'blur, distort, and low quality',
      cfg_scale: parseFloat(cfg_scale)
    };

    const result = await fal.subscribe('fal-ai/kling-video/v3/pro/image-to-video', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`[Image-to-Video] Status: ${update.status}`);
      }
    });

    res.json({
      success: true,
      video: result.data.video,
      requestId: result.requestId
    });
  } catch (error) {
    console.error('Error en image-to-video:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== MOTION CONTROL ====================
app.post('/api/motion-control', upload.fields([{ name: 'image' }, { name: 'video' }]), async (req, res) => {
  try {
    const { prompt, character_orientation = 'image', keep_original_sound = true } = req.body;
    
    let imageUrl = req.body.image_url;
    let videoUrl = req.body.video_url;

    // Subir archivos si se proporcionaron
    if (req.files?.image?.[0] && !imageUrl) {
      const file = new File([req.files.image[0].buffer], req.files.image[0].originalname, { type: req.files.image[0].mimetype });
      imageUrl = await fal.storage.upload(file);
    }

    if (req.files?.video?.[0] && !videoUrl) {
      const file = new File([req.files.video[0].buffer], req.files.video[0].originalname, { type: req.files.video[0].mimetype });
      videoUrl = await fal.storage.upload(file);
    }

    if (!imageUrl || !videoUrl) {
      return res.status(400).json({ error: 'Se requiere imagen y video de referencia' });
    }

    const input = {
      image_url: imageUrl,
      video_url: videoUrl,
      prompt: prompt || '',
      character_orientation,
      keep_original_sound: keep_original_sound === 'true' || keep_original_sound === true
    };

    const result = await fal.subscribe('fal-ai/kling-video/v3/pro/motion-control', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`[Motion-Control] Status: ${update.status}`);
      }
    });

    res.json({
      success: true,
      video: result.data.video,
      requestId: result.requestId
    });
  } catch (error) {
    console.error('Error en motion-control:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== LIP SYNC (AVATAR) ====================
app.post('/api/lipsync-audio', upload.fields([{ name: 'video' }, { name: 'audio' }]), async (req, res) => {
  try {
    let videoUrl = req.body.video_url;
    let audioUrl = req.body.audio_url;

    // Subir archivos si se proporcionaron
    if (req.files?.video?.[0] && !videoUrl) {
      const file = new File([req.files.video[0].buffer], req.files.video[0].originalname, { type: req.files.video[0].mimetype });
      videoUrl = await fal.storage.upload(file);
    }

    if (req.files?.audio?.[0] && !audioUrl) {
      const file = new File([req.files.audio[0].buffer], req.files.audio[0].originalname, { type: req.files.audio[0].mimetype });
      audioUrl = await fal.storage.upload(file);
    }

    if (!videoUrl || !audioUrl) {
      return res.status(400).json({ error: 'Se requiere video y audio' });
    }

    const result = await fal.subscribe('fal-ai/kling-video/lipsync/audio-to-video', {
      input: {
        video_url: videoUrl,
        audio_url: audioUrl
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`[LipSync-Audio] Status: ${update.status}`);
      }
    });

    res.json({
      success: true,
      video: result.data.video,
      requestId: result.requestId
    });
  } catch (error) {
    console.error('Error en lipsync-audio:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lipsync-text', upload.single('video'), async (req, res) => {
  try {
    const { text, voice_id = 'commercial_lady_en_f-v1', voice_language = 'en', voice_speed = 1 } = req.body;
    
    let videoUrl = req.body.video_url;

    if (req.file && !videoUrl) {
      const file = new File([req.file.buffer], req.file.originalname, { type: req.file.mimetype });
      videoUrl = await fal.storage.upload(file);
    }

    if (!videoUrl || !text) {
      return res.status(400).json({ error: 'Se requiere video y texto' });
    }

    const result = await fal.subscribe('fal-ai/kling-video/lipsync/text-to-video', {
      input: {
        video_url: videoUrl,
        text,
        voice_id,
        voice_language,
        voice_speed: parseFloat(voice_speed)
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log(`[LipSync-Text] Status: ${update.status}`);
      }
    });

    res.json({
      success: true,
      video: result.data.video,
      requestId: result.requestId
    });
  } catch (error) {
    console.error('Error en lipsync-text:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== FILE UPLOAD ====================
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    const file = new File([req.file.buffer], req.file.originalname, { type: req.file.mimetype });
    const url = await fal.storage.upload(file);

    res.json({
      success: true,
      url,
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error en upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CONFIGURATION ====================
app.post('/api/config/api-key', (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key requerida' });
    }
    
    // Guardar localmente (archivo que no se sube a GitHub)
    const saved = saveApiKeyLocally(apiKey);
    
    if (!saved) {
      return res.status(500).json({ error: 'Error guardando la API key' });
    }
    
    // Actualizar la configuración de fal.ai en runtime
    fal.config({ credentials: apiKey });
    process.env.FAL_KEY = apiKey;
    
    res.json({ 
      success: true, 
      message: 'API key configurada correctamente',
      storage: 'local'
    });
  } catch (error) {
    console.error('Error configurando API key:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config/status', (req, res) => {
  const hasKey = !!getApiKey();
  res.json({
    configured: hasKey,
    message: hasKey ? 'API key configurada' : 'API key no configurada'
  });
});

// ==================== QUEUE STATUS ====================
app.get('/api/status/:endpoint/:requestId', async (req, res) => {
  try {
    const { endpoint, requestId } = req.params;
    
    const status = await fal.queue.status(`fal-ai/kling-video/${endpoint}`, {
      requestId,
      logs: true
    });

    res.json(status);
  } catch (error) {
    console.error('Error obteniendo status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/result/:endpoint/:requestId', async (req, res) => {
  try {
    const { endpoint, requestId } = req.params;
    
    const result = await fal.queue.result(`fal-ai/kling-video/${endpoint}`, {
      requestId
    });

    res.json(result);
  } catch (error) {
    console.error('Error obteniendo resultado:', error);
    res.status(500).json({ error: error.message });
  }
});

// Servir la aplicación frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Kling Video App corriendo en http://localhost:${PORT}`);
  console.log(`📡 API endpoints disponibles:`);
  console.log(`   POST /api/text-to-video`);
  console.log(`   POST /api/image-to-video`);
  console.log(`   POST /api/motion-control`);
  console.log(`   POST /api/lipsync-audio`);
  console.log(`   POST /api/lipsync-text`);
  console.log(`   POST /api/upload`);
});
