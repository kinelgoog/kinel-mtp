FROM node:18-slim
WORKDIR /app
ADD https://github.com/9seconds/mtg/releases/download/v2.1.7/mtg-2.1.7-linux-amd64.tar.gz /app/mtg.tar.gz
RUN tar -xf mtg.tar.gz && mv mtg-2.1.7-linux-amd64/mtg /app/mtg && rm -rf mtg*
COPY index.js ./
EXPOSE $PORT
CMD ["node", "index.js"]
