# Kling Video Studio

Aplicación web para generación de videos utilizando la API de Kling Video v3 via fal.ai. Interfaz inspirada en Kling AI.

## Características

- **Text to Video**: Genera videos cinematográficos a partir de descripciones de texto
- **Image to Video**: Transforma imágenes estáticas en videos con movimiento
- **Motion Control**: Transfiere movimientos de un video de referencia a cualquier personaje
- **Avatar Lip Sync**: Sincronización labial para videos de avatar con texto o audio

## Requisitos

- Node.js 18+
- API Key de fal.ai

## Instalación

```bash
# Clonar o copiar el proyecto
cd kling-video-app

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env y agregar tu FAL_KEY
```

## Configuración

Edita el archivo `.env`:

```env
FAL_KEY=tu_api_key_de_fal_ai
PORT=3000
NODE_ENV=development
```

## Uso

```bash
# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
kling-video-app/
├── server.js           # Servidor Express con endpoints API
├── package.json        # Dependencias y scripts
├── .env               # Variables de entorno (no commitear)
├── public/
│   ├── index.html     # Interfaz principal
│   ├── css/
│   │   └── styles.css # Estilos
│   └── js/
│       └── app.js     # Lógica del frontend
└── README.md          # Documentación
```

## API Endpoints

### Text to Video
```
POST /api/text-to-video
Body: { prompt, duration, aspect_ratio, generate_audio, negative_prompt, cfg_scale }
```

### Image to Video
```
POST /api/image-to-video
FormData: image (file), prompt, duration, generate_audio
```

### Motion Control
```
POST /api/motion-control
FormData: image (file), video (file), prompt, character_orientation, keep_original_sound
```

### Lip Sync (Texto)
```
POST /api/lipsync-text
FormData: video (file), text, voice_id, voice_language, voice_speed
```

### Lip Sync (Audio)
```
POST /api/lipsync-audio
FormData: video (file), audio (file)
```

### Upload de archivos
```
POST /api/upload
FormData: file
Response: { url }
```

## Vozes Disponibles para Lip Sync

- `commercial_lady_en_f-v1` - Mujer (EN) - Comercial
- `reader_en_m-v1` - Hombre (EN) - Narrador
- `uk_man2` - Hombre (UK) - Inglés Británico
- `uk_boy1` - Niño (UK)
- `cartoon-girl-01` - Caricatura - Niña
- `cartoon-boy-07` - Caricatura - Niño

## Parámetros de Video

### Duración
- Text to Video: 5-15 segundos
- Image to Video: 5-15 segundos
- Motion Control: 10s (image) / 30s (video orientation)

### Aspect Ratio
- `16:9` - Horizontal
- `9:16` - Vertical (stories, shorts)
- `1:1` - Cuadrado

### CFG Scale
Rango: 0.0 - 1.0
Controla qué tan fiel es el video al prompt. Valores más altos = más adherencia al prompt.

## Deploy en Producción

### Con PM2
```bash
npm install -g pm2
pm2 start server.js --name kling-video-app
```

### Con Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Variables de Entorno en Producción
- `FAL_KEY` - Tu API key de fal.ai
- `PORT` - Puerto del servidor (default: 3000)
- `NODE_ENV` - "production"

## Licencia

MIT

## Créditos

- API de video: [Kling Video via fal.ai](https://fal.ai/models/fal-ai/kling-video)
- Diseño inspirado en: [Kling AI](https://app.klingai.com)
