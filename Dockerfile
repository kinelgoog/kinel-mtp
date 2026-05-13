FROM node:18-slim

WORKDIR /app

# Скачиваем бинарный файл прокси (версия v2.1.7)
ADD https://github.com/9seconds/mtg/releases/download/v2.1.7/mtg-2.1.7-linux-amd64 /app/mtg
RUN chmod +x /app/mtg

# Копируем скрипт управления
COPY index.js ./

# Указываем порт (Render сам подставит нужное значение)
EXPOSE $PORT

CMD ["node", "index.js"]
