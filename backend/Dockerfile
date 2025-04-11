FROM ubuntu:22.04
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*
ENV OLLAMA_NO_GPU=1
RUN curl -fsSL https://ollama.com/install.sh | sh
RUN ollama pull starcoder:1b
EXPOSE 11434
CMD ["ollama", "serve"]
