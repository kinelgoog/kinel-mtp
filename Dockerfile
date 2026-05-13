FROM node:18-slim

WORKDIR /app

# Скачиваем бинарник mtg v2.1.7
ADD https://github.com/9seconds/mtg/releases/download/v2.1.7/mtg-2.1.7-linux-amd64.tar.gz /app/mtg.tar.gz

RUN tar -xf mtg.tar.gz && \
    mv mtg-2.1.7-linux-amd64/mtg /app/mtg && \
    chmod +x /app/mtg && \
    rm -rf mtg.tar.gz mtg-2.1.7-linux-amd64

COPY index.js ./

EXPOSE $PORT

CMD ["node", "index.js"]
