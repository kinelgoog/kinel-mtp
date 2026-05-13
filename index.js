const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

// --- НАСТРОЙКИ ---
const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";
// Стабильный Base64 секрет с маскировкой под google.com
const SECRET = "7l6-Z28_L_6-Z28_L_6-Z28yLWdvb2dsZS5jb20="; 

// 1. Генерируем файл конфигурации, чтобы mtg не ругался на "stat"
const configPath = path.join(__dirname, 'config.toml');
const configContent = `
secret = "${SECRET}"
bind = "0.0.0.0:3128"
`;

try {
    fs.writeFileSync(configPath, configContent);
    console.log("[SYSTEM]: Файл конфигурации создан.");
} catch (err) {
    console.error("[SYSTEM-ERROR]: Не удалось создать конфиг:", err);
}

// 2. Веб-сервер для Health Check (чтобы Render не выключал сервис)
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Proxy is active');
}).listen(PORT, () => {
    console.log(`[SYSTEM]: Health-check запущен на порту ${PORT}`);
    
    // Вывод ссылок в консоль
    const tgLink = `tg://proxy?server=${HOSTNAME}&port=443&secret=${SECRET}`;
    const webLink = `https://t.me/proxy?server=${HOSTNAME}&port=443&secret=${SECRET}`;
    
    console.log("\n" + "=".repeat(50));
    console.log("🚀 ПРОКСИ ЗАПУЩЕН!");
    console.log(`🔗 Ссылка: ${tgLink}`);
    console.log(`🌍 Резерв: ${webLink}`);
    console.log("=".repeat(50) + "\n");
});

// 3. Запуск прокси через файл конфигурации
// Мы передаем путь к файлу, так mtg работает стабильнее всего
const mtg = spawn('./mtg', ['run', configPath]);

mtg.stdout.on('data', (data) => {
    if (!data.toString().includes("stats")) console.log(`[MTG]: ${data}`);
});

mtg.stderr.on('data', (data) => {
    const msg = data.toString();
    // Игнорируем отладочную инфу, выводим только ошибки
    if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("fatal")) {
        console.error(`[MTG-ERROR]: ${msg}`);
    }
});
