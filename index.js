const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";
// Стандартный HEX-секрет (32 символа)
const SECRET = "0123456789abcdef0123456789abcdef";

// 1. Создаем конфиг (самый надежный способ для v2.x)
const configPath = path.join(__dirname, 'config.toml');
const configContent = `
secret = "${SECRET}"
bind = "0.0.0.0:${PORT}"
`;
fs.writeFileSync(configPath, configContent);

// 2. Простейший сервер для Render (Health Check)
// Он будет слушать тот же порт, но mtg его "перехватит" или мы просто запустим mtg
// На Render Web Service прокси должен отвечать на HTTP запросы.
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Proxy is up");
});

// Мы запускаем прокси. Если порт занят сервером, mtg v2 может ругаться.
// Поэтому мы сначала проверим бинарник и запустим только MTG.
const binPath = path.join(__dirname, 'mtg');

if (fs.existsSync(binPath)) {
    console.log("[SYSTEM]: Бинарник найден, запускаем...");
    
    // Запускаем mtg. Он сам будет слушать PORT. 
    // Render увидит, что порт открыт, и зачтет Health Check.
    const mtg = spawn(binPath, ['run', configPath], { stdio: 'inherit' });

    mtg.on('error', (err) => {
        console.error("[ERROR]: Ошибка запуска бинарника:", err);
    });
} else {
    console.error("[ERROR]: Файл mtg не найден по пути:", binPath);
}

console.log("\n" + "=".repeat(40));
console.log("🚀 НАСТРОЙКИ ПРОКСИ:");
console.log(`Сервер: ${HOST}`);
console.log(`Порт: 443`);
console.log(`Секрет: ${SECRET}`);
console.log(`Ссылка: tg://proxy?server=${HOST}&port=443&secret=${SECRET}`);
console.log("=".repeat(40) + "\n");
