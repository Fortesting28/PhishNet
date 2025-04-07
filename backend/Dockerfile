FROM ubuntu:22.04
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://ollama.com/install.sh | sh
RUN ollama pull deepseek-coder:1.5b-instruct && \
    ollama pull deepseek-llm:1.5b  # Add other small models if needed
EXPOSE 11434
ENV OLLAMA_HOST=0.0.0.0
HEALTHCHECK --interval=30s --timeout=10s \
    CMD curl -f http://localhost:11434/api/tags || exit 1
RUN useradd -m ollama && \
    chown -R ollama:ollama /usr/local/bin/ollama
USER ollama
WORKDIR /home/ollama
CMD ["ollama", "serve"]
