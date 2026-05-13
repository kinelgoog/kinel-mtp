const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 10000;
const MTG_PORT = 3128;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// 1. ГЕНЕРИРУЕМ ВАЛИДНЫЙ FAKETLS СЕКРЕТ
const MASK_DOMAIN = "yandex.ru";
// Превращаем "yandex.ru" в hex -> "79616e6465782e7275"
const domainHex = Buffer.from(MASK_DOMAIN, 'utf8').toString('hex');
// Генерируем случайный или фиксированный ключ (32 символа hex)
const rawKey = "11223344556677889900aabbccddeeff";
// Собираем полный секрет: ee + ключ + hex_домена
const FULL_SECRET = "ee" + rawKey + domainHex;

// 2. Записываем в конфиг чистые параметры
const configContent = `
secret = "${FULL_SECRET}"
bind = "127.0.0.1:${MTG_PORT}"
`;
fs.writeFileSync('./config.toml', configContent);

// 3. Запускаем mtg
const mtg = spawn('./mtg', ['run', './config.toml'], { stdio: 'inherit' });

mtg.on('error', (err) => console.error("MTG Spawn Error:", err));

// 4. Мультиплексор (Health Check Render + Telegram)
net.createServer(client => {
    client.once('data', data => {
        const head = data.toString();
        
        // Отвечаем на запросы Render, чтобы контейнер не падал
        if (head.startsWith('GET') || head.startsWith('HEAD') || head.startsWith('POST')) {
            client.write("HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK");
            client.destroy();
        } else {
            // Перенаправляем трафик Telegram в mtg
            const proxy = net.createConnection(MTG_PORT, '127.0.0.1', () => {
                proxy.write(data);
                client.pipe(proxy).pipe(client);
            });
            proxy.on('error', () => client.destroy());
            client.on('error', () => proxy.destroy());
        }
    });
}).listen(PORT, '0.0.0.0', () => {
    console.log("\n" + "=".repeat(50));
    console.log("🚀 FakeTLS ПРОКСИ СКОНФИГУРИРОВАН И ЗАПУЩЕН!");
    console.log(`🌍 Маскировка под домен: ${MASK_DOMAIN}`);
    console.log(`🔗 Нажмите для подключения в Telegram:`);
    console.log(`tg://proxy?server=${HOST}&port=443&secret=${FULL_SECRET}`);
    console.log("=".repeat(50) + "\n");
});
