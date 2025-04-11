FROM python:3.9-slim
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://ollama.com/install.sh | sh
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
RUN ollama pull tinyllama
ENV PORT 5000
CMD ["sh", "-c", "ollama serve & sleep 10 && python app.py"]
