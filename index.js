const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 10000;
const MTG_PORT = 3128;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// Валидный 32-символьный HEX + префикс ee (итого 34 символа)
const SECRET = "eeafc8152309831f24d4586d88c426359b";

// 1. Генерируем конфиг
const configContent = `
secret = "${SECRET}"
bind = "127.0.0.1:${MTG_PORT}"
`;
fs.writeFileSync('./config.toml', configContent);

// 2. Запускаем mtg
const mtg = spawn('./mtg', ['run', './config.toml'], { stdio: 'inherit' });

mtg.on('error', (err) => console.error("MTG Spawn Error:", err));

// 3. Мультиплексор (Health Check + Proxy)
net.createServer(client => {
    client.once('data', data => {
        const buf = data.toString();
        // Если это HTTP запрос от Render
        if (buf.startsWith('GET') || buf.startsWith('HEAD')) {
            client.write("HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK");
            client.destroy();
        } else {
            // Если это Telegram
            const proxy = net.createConnection(MTG_PORT, '127.0.0.1', () => {
                proxy.write(data);
                client.pipe(proxy).pipe(client);
            });
            proxy.on('error', () => client.destroy());
            client.on('error', () => proxy.destroy());
        }
    });
}).listen(PORT, () => {
    console.log("\n" + "=".repeat(50));
    console.log("✅ СЕРВЕР ПЕРЕЗАПУЩЕН");
    console.log(`🔗 Ссылка: tg://proxy?server=${HOST}&port=443&secret=${SECRET}`);
    console.log("=".repeat(50) + "\n");
});
