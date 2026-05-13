FROM node:18-slim
WORKDIR /app
COPY index.js ./
EXPOSE 10000
CMD ["node", "index.js"]
