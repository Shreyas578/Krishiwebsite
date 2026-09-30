# Kisan AI - ML Models & Local Inference

This directory contains all machine learning models for offline functionality.

## Directory Structure

```
ml/
├── models/
│   ├── mistral-7b/          # Chat LLM (offline Q&A)
│   ├── whisper-tiny/        # Speech-to-text
│   ├── tts-model/           # Text-to-speech
│   └── translation/         # Light translation model
├── tflite/
│   └── crop_disease_model.tflite  # Crop disease detection
└── scripts/
    ├── setup.sh             # Install all models
    ├── download_models.py   # Download Ollama models
    └── convert_models.py    # Convert to mobile format
```

## Models to Install

### 1. Mistral 7B (Chat/Q&A)
- **Purpose**: Offline chatbot responses
- **Size**: ~4.5GB
- **Format**: GGUF (via Ollama)
- **Install**: `ollama pull mistral:7b`

### 2. Whisper Tiny (Speech-to-Text)
- **Purpose**: Convert voice to text
- **Size**: ~390MB
- **Format**: PyTorch/ONNX
- **Install**: Auto-download via `transformers`

### 3. FastPitch (Text-to-Speech)
- **Purpose**: Convert text to voice
- **Size**: ~200MB
- **Format**: PyTorch/ONNX
- **Install**: Auto-download

### 4. M2M-100 418M (Translation)
- **Purpose**: Light translation between languages
- **Size**: ~418MB
- **Format**: PyTorch/ONNX
- **Install**: Auto-download

### 5. Crop Disease Model (TFLite)
- **Purpose**: Disease detection from images
- **Size**: ~50-100MB
- **Format**: TFLite
- **Location**: `D:\Projects\Krishi\kisan-ai\outputs\crop_disease_model.tflite`

## Setup Instructions

### Option 1: Automated Setup (Recommended)
```bash
cd ml
python scripts/setup.py
```

### Option 2: Manual Setup

#### Install Ollama + Mistral 7B
```bash
# Windows: Download from https://ollama.ai
# Then run:
ollama pull mistral:7b
ollama serve  # Starts on localhost:11434
```

#### Install Python Dependencies
```bash
pip install -r requirements.txt
```

## Backend Integration

### Online Mode
- Chatbot: `POST /api/chatbot/message` → Groq API
- Disease: `POST /api/disease/detect` → Groq Vision
- TTS: `POST /api/tts/synthesize` → Google/Piper TTS

### Offline Mode
- Chatbot: Local Mistral 7B via Ollama
- Disease: crop_disease_model.tflite
- TTS: FastPitch (local)
- STT: Whisper (local)

## Browser Web Integration

Models pre-bundled in APK:
- `crop_disease_model.tflite` - TFLite interpreter
- `whisper-tiny.onnx` - Speech recognition
- `fastpitch.onnx` - Speech synthesis

## Performance Notes

- **Mistral 7B**: ~2-5 sec response on modern CPU
- **Whisper**: ~1-2 sec for 30s audio
- **FastPitch**: ~0.5 sec for TTS
- **Disease Model**: ~0.1 sec inference

## Model Files Location

After setup, models will be at:
- `ml/models/mistral-7b/` - Chat responses
- `ml/models/whisper-tiny/` - STT
- `ml/models/tts-model/` - TTS
- `ml/models/translation/` - Translation
- `ml/tflite/crop_disease_model.tflite` - Disease detection

---

## Quick Start

```bash
# 1. Install Ollama
# Download from https://ollama.ai

# 2. Pull Mistral
ollama pull mistral:7b

# 3. Start Ollama service
ollama serve

# 4. Test offline chatbot
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral:7b",
    "prompt": "What are the best practices for growing tomatoes?",
    "stream": false
  }'
```

---

**Next Steps:** Backend integration for offline mode detection and routing
