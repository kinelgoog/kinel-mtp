FROM node:18-slim
WORKDIR /app

RUN apt-get update && apt-get install -y curl tar && \
    curl -L https://github.com/9seconds/mtg/releases/download/v2.1.7/mtg-2.1.7-linux-amd64.tar.gz | tar xz --strip-components=1 && \
    chmod +x mtg && \
    rm -rf /var/lib/apt/lists/*

COPY index.js ./
EXPOSE 10000
CMD ["node", "index.js"]
