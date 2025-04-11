curl -fsSL https://ollama.com/install.sh | sh
ollama pull tinyllama  # Small model
ollama serve &
python app.py
