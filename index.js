const http = require('http');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// Чистый HEX-секрет (32 символа) + префикс ee для FakeTLS
const RAW_HEX = "0123456789abcdef0123456789abcdef";
const SECRET = "ee" + RAW_HEX;

// 1. Простейший веб-сервер для Render
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Proxy Status: Online');
}).listen(PORT, () => {
    console.log(`[SYSTEM]: Веб-заглушка готова на порту ${PORT}`);
    
    // Формируем ссылки
    const tgLink = `tg://proxy?server=${HOSTNAME}&port=443&secret=${SECRET}`;
    const webLink = `https://t.me/proxy?server=${HOSTNAME}&port=443&secret=${SECRET}`;
    
    console.log("\n" + "=".repeat(50));
    console.log("🚀 ПРОКСИ ЗАПУЩЕН И ГОТОВ!");
    console.log(`🔗 Ссылка для входа: ${tgLink}`);
    console.log(`🌍 Ссылка t.me: ${webLink}`);
    console.log("=".repeat(50) + "\n");
});

// 2. Запуск MTProxy с префиксом hex:
// Это "ультимативный" способ заставить mtg v2 работать без ошибок парсинга
const mtg = spawn('./mtg', ['run', `hex:${SECRET}`, '--bind', '0.0.0.0:3128']);

mtg.stdout.on('data', (data) => {
    if (!data.toString().includes("stats")) console.log(`[MTG]: ${data}`);
});

mtg.stderr.on('data', (data) => {
    const errorMsg = data.toString();
    if (errorMsg.includes("error") || errorMsg.includes("fatal")) {
        console.error(`[MTG-ERROR]: ${errorMsg}`);
    }
});
