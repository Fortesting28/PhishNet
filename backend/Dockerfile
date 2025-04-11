FROM ubuntu:22.04
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    curl && \
    rm -rf /var/lib/apt/lists/*
RUN ln -s /usr/bin/python3 /usr/bin/python
RUN curl -fsSL https://ollama.com/install.sh | sh
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
RUN ollama pull deepseek-coder:1.5b-instruct
ENV PORT 5000
EXPOSE $PORT
CMD sh -c "ollama serve & sleep 10 && python3 app.py"
