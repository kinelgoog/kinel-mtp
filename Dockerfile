FROM node:18-slim
WORKDIR /app

# Устанавливаем curl для скачивания
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Скачиваем и распаковываем сразу в /app без вложенных папок
RUN curl -L https://github.com/9seconds/mtg/releases/download/v2.1.7/mtg-2.1.7-linux-amd64.tar.gz | tar xz --strip-components=1

# Даем права на запуск
RUN chmod +x mtg

COPY index.js ./
EXPOSE $PORT
CMD ["node", "index.js"]
