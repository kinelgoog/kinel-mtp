FROM node:18-slim
WORKDIR /app

RUN apt-get update && apt-get install -y curl tar && \
    curl -L https://github.com/9seconds/mtg/releases/download/v2.1.7/mtg-2.1.7-linux-amd64.tar.gz | tar xz --strip-components=1 && \
    chmod +x mtg && \
    rm -rf /var/lib/apt/lists/*

# ХАК: Прописываем IP для max.ru прямо в локальный DNS-файл системы
RUN echo "185.129.100.121 max.ru\n185.129.100.122 max.ru" >> /etc/hosts

COPY index.js ./
EXPOSE 10000
CMD ["node", "index.js"]
