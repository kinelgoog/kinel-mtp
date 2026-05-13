const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 10000;
const MTG_PORT = 3128;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// ==========================================
// ГЕНЕРАЦИЯ АВТОНОМНОГО FakeTLS СЕКРЕТА
// ==========================================
const MASK_DOMAIN = "yandex.ru";
// "yandex.ru" в hex -> "79616e6465782e7275"
const domainHex = Buffer.from(MASK_DOMAIN, 'utf8').toString('hex');
const rawKey = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
const FULL_SECRET = "ee" + rawKey + domainHex;

// ==========================================
// ЖЕСТКАЯ ПРИВЯЗКА IP (ОБХОД ОШИБКИ DNS)
// ==========================================
// Прописываем официальные IP Яндекса (yandex.ru), чтобы mtg не лез в DNS
const configContent = `
secret = "${FULL_SECRET}"
bind-to = "127.0.0.1:${MTG_PORT}"

[dns]
routes = [
    { host = "yandex.ru", ips = ["5.255.255.242", "77.88.55.242"] }
]
`;
fs.writeFileSync('./config.toml', configContent);

// ==========================================
// ЗАПУСК MTG С ВЫВОДОМ ЛОГОВ
// ==========================================
// Передаем логи mtg в основную консоль Render
const mtg = spawn('./mtg', ['run', './config.toml']);

mtg.stdout.on('data', (data) => {
    console.log(`[MTG STDOUT]: ${data.toString().trim()}`);
});

mtg.stderr.on('data', (data) => {
    console.log(`[MTG STDERR]: ${data.toString().trim()}`);
});

mtg.on('error', (err) => console.error("❌ Сбой при запуске бинарника:", err));

// ==========================================
// МУЛЬТИПЛЕКСОР (HEALTH CHECK + TG)
// ==========================================
net.createServer(client => {
    client.once('data', data => {
        const head = data.toString();
        
        if (head.match(/^(GET|POST|HEAD)/)) {
            client.write("HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK");
            client.destroy();
        } else {
            const proxy = net.createConnection(MTG_PORT, '127.0.0.1', () => {
                proxy.write(data);
                client.pipe(proxy).pipe(client);
            });
            proxy.on('error', () => client.destroy());
            client.on('error', () => proxy.destroy());
        }
    });
}).listen(PORT, '0.0.0.0', () => {
    console.log("\n" + "💎".repeat(25));
    console.log("🚀 FakeTLS ПРОКСИ СКОНФИГУРИРОВАН И ПОДКЛЮЧЕН!");
    console.log(`🌍 Маскировка (Hardcoded IP): ${MASK_DOMAIN}`);
    console.log(`\n🔗 ДЛЯ ПОДКЛЮЧЕНИЯ НАЖМИ НА ССЫЛКУ:`);
    console.log(`tg://proxy?server=${HOST}&port=443&secret=${FULL_SECRET}`);
    console.log("💎".repeat(25) + "\n");
});
