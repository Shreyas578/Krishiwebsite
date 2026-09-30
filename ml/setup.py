#!/usr/bin/env python3
"""
Kisan AI ML Setup Script
Downloads and configures all models for offline inference
"""

import os
import sys
import subprocess
import json
from pathlib import Path

# Colors for output
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

def print_status(msg, status='info'):
    """Print colored status message"""
    if status == 'success':
        print(f"{GREEN}✓ {msg}{RESET}")
    elif status == 'error':
        print(f"{RED}✗ {msg}{RESET}")
    elif status == 'warn':
        print(f"{YELLOW}⚠ {msg}{RESET}")
    else:
        print(f"{YELLOW}→ {msg}{RESET}")

def check_ollama():
    """Check if Ollama is installed"""
    try:
        result = subprocess.run(['ollama', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print_status(f"Ollama found: {result.stdout.strip()}", 'success')
            return True
    except FileNotFoundError:
        pass
    return False

def install_ollama():
    """Guide user to install Ollama"""
    print_status("Ollama not found", 'warn')
    print(f"\n{YELLOW}Download Ollama from: https://ollama.ai{RESET}")
    print(f"Or install via package manager:")
    print(f"  Windows: Download installer from https://ollama.ai")
    print(f"  macOS: brew install ollama")
    print(f"  Linux: curl https://ollama.ai/install.sh | sh\n")
    return False

def setup_mistral():
    """Download Mistral 7B model"""
    print_status("Setting up Mistral 7B...")
    try:
        subprocess.run(['ollama', 'pull', 'mistral:7b'], check=True)
        print_status("Mistral 7B ready", 'success')
        return True
    except Exception as e:
        print_status(f"Failed to pull Mistral: {e}", 'error')
        return False

def setup_whisper():
    """Download Whisper model for STT"""
    print_status("Setting up Whisper (Speech-to-Text)...")
    try:
        subprocess.run([
            sys.executable, '-m', 'pip', 'install', 'openai-whisper'
        ], check=True)
        print_status("Whisper installed", 'success')
        return True
    except Exception as e:
        print_status(f"Failed to install Whisper: {e}", 'error')
        return False

def setup_tts():
    """Setup Text-to-Speech models"""
    print_status("Setting up TTS (Text-to-Speech)...")
    try:
        subprocess.run([
            sys.executable, '-m', 'pip', 'install', 'gTTS', 'pyttsx3'
        ], check=True)
        print_status("TTS libraries installed", 'success')
        return True
    except Exception as e:
        print_status(f"Failed to install TTS: {e}", 'error')
        return False

def setup_translation():
    """Setup translation model"""
    print_status("Setting up Translation model...")
    try:
        subprocess.run([
            sys.executable, '-m', 'pip', 'install', 'transformers', 'torch'
        ], check=True)
        print_status("Translation dependencies installed", 'success')
        return True
    except Exception as e:
        print_status(f"Failed to install translation: {e}", 'error')
        return False

def check_tflite():
    """Check for TFLite crop disease model"""
    tflite_path = Path('D:/Projects/Krishi/kisan-ai/outputs/crop_disease_model.tflite')
    if tflite_path.exists():
        print_status(f"Crop disease model found: {tflite_path}", 'success')
        return True
    else:
        print_status(f"Crop disease model not found at {tflite_path}", 'warn')
        return False

def create_directories():
    """Create required directories"""
    dirs = [
        'models/mistral-7b',
        'models/whisper-tiny',
        'models/tts-model',
        'models/translation',
        'tflite',
        'scripts'
    ]
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)
    print_status("Directories created", 'success')

def create_config():
    """Create configuration file"""
    config = {
        "offline_models": {
            "mistral": {
                "type": "ollama",
                "model": "mistral:7b",
                "endpoint": "http://localhost:11434",
                "purpose": "Chatbot Q&A"
            },
            "whisper": {
                "type": "local",
                "model": "openai/whisper-tiny",
                "purpose": "Speech-to-Text"
            },
            "tts": {
                "type": "local",
                "model": "gtts",
                "purpose": "Text-to-Speech"
            },
            "translation": {
                "type": "transformer",
                "model": "facebook/m2m100_418M",
                "purpose": "Light translation"
            },
            "crop_disease": {
                "type": "tflite",
                "path": "D:/Projects/Krishi/kisan-ai/outputs/crop_disease_model.tflite",
                "purpose": "Disease detection"
            }
        },
        "online_services": {
            "chatbot": {
                "provider": "groq",
                "endpoint": "http://localhost:3000/api/chatbot/message",
                "model": "mixtral-8x7b-32768"
            },
            "disease": {
                "provider": "groq",
                "endpoint": "http://localhost:3000/api/disease/detect",
                "model": "vision"
            },
            "tts": {
                "provider": "google",
                "endpoint": "http://localhost:3000/api/tts/synthesize"
            }
        }
    }
    
    with open('ml_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    print_status("Configuration saved to ml_config.json", 'success')

def main():
    """Main setup routine"""
    print(f"\n{GREEN}{'='*60}")
    print("  Kisan AI - ML Models Setup")
    print(f"{'='*60}{RESET}\n")
    
    # Create directories
    create_directories()
    
    # Check Ollama
    print(f"\n{YELLOW}Checking Ollama installation...{RESET}")
    if not check_ollama():
        if not install_ollama():
            print_status("Please install Ollama first: https://ollama.ai", 'error')
            sys.exit(1)
    
    # Setup models
    print(f"\n{YELLOW}Installing models...{RESET}")
    
    # Mistral 7B
    if not setup_mistral():
        print_status("Mistral setup failed", 'error')
        sys.exit(1)
    
    # Whisper
    if not setup_whisper():
        print_status("Whisper setup failed", 'warn')
    
    # TTS
    if not setup_tts():
        print_status("TTS setup failed", 'warn')
    
    # Translation
    if not setup_translation():
        print_status("Translation setup failed", 'warn')
    
    # Check TFLite model
    print(f"\n{YELLOW}Checking TFLite model...{RESET}")
    check_tflite()
    
    # Create config
    print(f"\n{YELLOW}Creating configuration...{RESET}")
    create_config()
    
    # Summary
    print(f"\n{GREEN}{'='*60}")
    print("  Setup Complete!")
    print(f"{'='*60}{RESET}")
    print(f"\n{YELLOW}Next Steps:{RESET}")
    print(f"1. Start Ollama: {GREEN}ollama serve{RESET}")
    print(f"2. Test Mistral: {GREEN}ollama run mistral:7b{RESET}")
    print(f"3. Backend will auto-detect offline mode")
    print(f"4. Chatbot works both online and offline!\n")

if __name__ == '__main__':
    main()
