const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

// --- НАСТРОЙКИ ---
const PORT = process.env.PORT || 10000; // Порт от Render
const MTG_PORT = 3128;                 // Внутренний порт для прокси
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";
// Используем чистый 32-битный HEX для стабильности через балансировщик Render
const SECRET = "d34db33fd34db33fd34db33fd34db33f"; 

// 1. Создаем файл конфигурации (ТОЛЬКО ТАК mtg v2 работает без ошибок)
const configContent = `secret = "${SECRET}"\nbind = "127.0.0.1:${MTG_PORT}"`;
fs.writeFileSync('config.toml', configContent);

// 2. Запускаем mtg
const mtg = spawn('./mtg', ['run', 'config.toml'], { stdio: 'inherit' });

// 3. Мультиплексор: разделяем Health Check и Трафик Telegram
net.createServer(conn => {
    conn.once('data', data => {
        const content = data.toString();
        // Если это запрос от Render (HTTP GET), отвечаем заглушкой
        if (content.match(/^(GET|POST|HEAD)/)) {
            conn.write("HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK");
            conn.destroy();
        } else {
            // Если это трафик Telegram, пробрасываем в mtg
            const proxy = net.createConnection(MTG_PORT, '127.0.0.1', () => {
                proxy.write(data);
                conn.pipe(proxy).pipe(conn);
            });
            proxy.on('error', () => conn.destroy());
            conn.on('error', () => proxy.destroy());
        }
    });
}).listen(PORT, () => {
    console.log("\n" + "=".repeat(50));
    console.log("🚀 ПРОКСИ СЕРВЕР ЗАПУЩЕН");
    console.log(`🔗 Ссылка: tg://proxy?server=${HOST}&port=443&secret=${SECRET}`);
    console.log("=".repeat(50) + "\n");
});
