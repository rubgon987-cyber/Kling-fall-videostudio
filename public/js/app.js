/**
 * Kling Video Studio - Frontend JavaScript
 * Maneja todas las interacciones y llamadas a la API
 */

// ==================== CONFIGURATION ====================
const API_BASE = window.location.origin + '/api';

// ==================== STATE ====================
const state = {
  uploads: {},
  videos: {}
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSubTabs();
  initCharCounters();
  initRangeSliders();
  initDragDrop();
});

// ==================== TAB NAVIGATION ====================
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show corresponding content
      const tabId = tab.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(tabId).classList.add('active');
    });
  });
}

function initSubTabs() {
  const subTabs = document.querySelectorAll('.sub-tab');
  subTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const parent = tab.closest('.tab-content');
      
      // Update active sub-tab
      parent.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show corresponding content
      const subTabId = tab.dataset.subtab;
      parent.querySelectorAll('.subtab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(subTabId).classList.add('active');
    });
  });
}

// ==================== CHARACTER COUNTERS ====================
function initCharCounters() {
  const counters = [
    { input: 't2v-prompt', display: 't2v-prompt-count' },
    { input: 'lst-text', display: 'lst-text-count' }
  ];
  
  counters.forEach(({ input, display }) => {
    const inputEl = document.getElementById(input);
    const displayEl = document.getElementById(display);
    
    if (inputEl && displayEl) {
      inputEl.addEventListener('input', () => {
        displayEl.textContent = inputEl.value.length;
      });
    }
  });
}

// ==================== RANGE SLIDERS ====================
function initRangeSliders() {
  const sliders = [
    { slider: 't2v-cfg', display: 't2v-cfg-value' },
    { slider: 'lst-speed', display: 'lst-speed-value' }
  ];
  
  sliders.forEach(({ slider, display }) => {
    const sliderEl = document.getElementById(slider);
    const displayEl = document.getElementById(display);
    
    if (sliderEl && displayEl) {
      sliderEl.addEventListener('input', () => {
        displayEl.textContent = sliderEl.value;
      });
    }
  });
}

// ==================== DRAG & DROP ====================
function initDragDrop() {
  const uploadAreas = document.querySelectorAll('.upload-area');
  
  uploadAreas.forEach(area => {
    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('dragover');
    });
    
    area.addEventListener('dragleave', () => {
      area.classList.remove('dragover');
    });
    
    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('dragover');
      
      const input = area.querySelector('input[type="file"]');
      if (input && e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
      }
    });
  });
}

// ==================== FILE HANDLING ====================
function handleImageUpload(input, prefix) {
  const file = input.files[0];
  if (!file) return;
  
  const previewImg = document.getElementById(`${prefix}-preview-img`) || 
                      document.getElementById(`${prefix}-preview`);
  const uploadArea = input.closest('.upload-area');
  
  if (previewImg && uploadArea) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewImg.classList.remove('hidden');
      uploadArea.querySelector('.upload-content').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
  
  state.uploads[prefix] = file;
}

function handleVideoUpload(input, prefix) {
  const file = input.files[0];
  if (!file) return;
  
  const previewVid = document.getElementById(`${prefix}-preview`);
  const uploadArea = input.closest('.upload-area');
  
  if (previewVid && uploadArea) {
    const url = URL.createObjectURL(file);
    previewVid.src = url;
    previewVid.classList.remove('hidden');
    uploadArea.querySelector('.upload-content').style.display = 'none';
  }
  
  state.uploads[prefix] = file;
}

function handleAudioUpload(input, prefix) {
  const file = input.files[0];
  if (!file) return;
  
  const previewAud = document.getElementById(`${prefix}-preview`);
  const uploadArea = input.closest('.upload-area');
  
  if (previewAud && uploadArea) {
    const url = URL.createObjectURL(file);
    previewAud.src = url;
    previewAud.classList.remove('hidden');
    uploadArea.querySelector('.upload-content').style.display = 'none';
  }
  
  state.uploads[prefix] = file;
}

// ==================== TOGGLE ADVANCED OPTIONS ====================
function toggleAdvanced(id) {
  const content = document.getElementById(id);
  content.classList.toggle('hidden');
}

// ==================== API CALLS ====================

// Text to Video
async function generateTextToVideo() {
  const prompt = document.getElementById('t2v-prompt').value.trim();
  
  if (!prompt) {
    showToast('Por favor ingresa un prompt', 'error');
    return;
  }
  
  const data = {
    prompt,
    duration: document.getElementById('t2v-duration').value,
    aspect_ratio: document.getElementById('t2v-aspect').value,
    generate_audio: document.getElementById('t2v-audio').checked,
    negative_prompt: document.getElementById('t2v-negative')?.value,
    cfg_scale: parseFloat(document.getElementById('t2v-cfg')?.value || 0.5)
  };
  
  await generateVideo('t2v', '/text-to-video', data);
}

// Image to Video
async function generateImageToVideo() {
  const imageFile = state.uploads['i2v'];
  const imageUrl = document.getElementById('i2v-image')?.dataset?.url;
  
  if (!imageFile && !imageUrl) {
    showToast('Por favor sube una imagen', 'error');
    return;
  }
  
  const formData = new FormData();
  if (imageFile) {
    formData.append('image', imageFile);
  }
  
  formData.append('prompt', document.getElementById('i2v-prompt').value);
  formData.append('duration', document.getElementById('i2v-duration').value);
  formData.append('generate_audio', document.getElementById('i2v-audio').checked);
  
  await generateVideoWithFormData('i2v', '/image-to-video', formData);
}

// Motion Control
async function generateMotionControl() {
  const imageFile = state.uploads['mc-img'];
  const videoFile = state.uploads['mc-vid'];
  
  if (!imageFile || !videoFile) {
    showToast('Por favor sube una imagen y un video de referencia', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('video', videoFile);
  formData.append('prompt', document.getElementById('mc-prompt').value);
  formData.append('character_orientation', document.getElementById('mc-orientation').value);
  formData.append('keep_original_sound', document.getElementById('mc-sound').checked);
  
  await generateVideoWithFormData('mc', '/motion-control', formData);
}

// Lip Sync Text
async function generateLipSyncText() {
  const videoFile = state.uploads['lst-vid'];
  const text = document.getElementById('lst-text').value.trim();
  
  if (!videoFile && !document.getElementById('lst-video')?.dataset?.url) {
    showToast('Por favor sube un video', 'error');
    return;
  }
  
  if (!text) {
    showToast('Por favor ingresa el texto a sincronizar', 'error');
    return;
  }
  
  const formData = new FormData();
  if (videoFile) {
    formData.append('video', videoFile);
  }
  formData.append('text', text);
  formData.append('voice_id', document.getElementById('lst-voice').value);
  formData.append('voice_speed', document.getElementById('lst-speed').value);
  
  await generateVideoWithFormData('lst', '/lipsync-text', formData);
}

// Lip Sync Audio
async function generateLipSyncAudio() {
  const videoFile = state.uploads['lsa-vid'];
  const audioFile = state.uploads['lsa-aud'];
  
  if (!videoFile || !audioFile) {
    showToast('Por favor sube un video y un archivo de audio', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('audio', audioFile);
  
  await generateVideoWithFormData('lsa', '/lipsync-audio', formData);
}

// ==================== HELPER FUNCTIONS ====================

async function generateVideo(prefix, endpoint, data) {
  const loadingEl = document.getElementById(`${prefix}-loading`);
  const previewEl = document.getElementById(`${prefix}-preview`);
  const resultEl = document.getElementById(`${prefix}-result`);
  const btnEl = document.querySelector(`#${prefix}`).querySelector('.btn-generate');
  
  try {
    // Show loading
    loadingEl.classList.remove('hidden');
    btnEl.disabled = true;
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      displayVideo(prefix, result.video.url);
      state.videos[prefix] = result.video.url;
      resultEl.classList.remove('hidden');
      showToast('¡Video generado exitosamente!', 'success');
    } else {
      throw new Error(result.error || 'Error al generar video');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast(error.message, 'error');
  } finally {
    loadingEl.classList.add('hidden');
    btnEl.disabled = false;
  }
}

async function generateVideoWithFormData(prefix, endpoint, formData) {
  const loadingEl = document.getElementById(`${prefix}-loading`);
  const previewEl = document.getElementById(`${prefix}-preview`);
  const resultEl = document.getElementById(`${prefix}-result`);
  const btnEl = document.querySelector(`#${prefix}`).querySelector('.btn-generate') ||
                document.querySelector(`#${prefix}`).closest('.tab-content').querySelector('.btn-generate');
  
  try {
    loadingEl.classList.remove('hidden');
    if (btnEl) btnEl.disabled = true;
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      displayVideo(prefix, result.video.url);
      state.videos[prefix] = result.video.url;
      resultEl.classList.remove('hidden');
      showToast('¡Video generado exitosamente!', 'success');
    } else {
      throw new Error(result.error || 'Error al generar video');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast(error.message, 'error');
  } finally {
    loadingEl.classList.add('hidden');
    if (btnEl) btnEl.disabled = false;
  }
}

function displayVideo(prefix, url) {
  const previewEl = document.getElementById(`${prefix}-preview`);
  
  previewEl.innerHTML = `
    <video class="video-player" controls autoplay loop>
      <source src="${url}" type="video/mp4">
      Tu navegador no soporta el elemento video.
    </video>
  `;
}

function downloadVideo(prefix) {
  const url = state.videos[prefix];
  if (url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `kling-video-${Date.now()}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function copyVideoUrl(prefix) {
  const url = state.videos[prefix];
  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('URL copiada al portapapeles', 'success');
    });
  }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${icons[type]}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==================== UTILITY ====================
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
