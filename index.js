const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 10000;
const MTG_PORT = 3128;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// ==========================================
// НАСТРОЙКА FAKETLS ДЛЯ MAX.RU
// ==========================================
const MASK_DOMAIN = "max.ru";
const domainHex = Buffer.from(MASK_DOMAIN, 'utf8').toString('hex');
const rawKey = "1234567890abcdef1234567890abcdef";
const FULL_SECRET = "ee" + rawKey + domainHex;

// ==========================================
// ПРАВИЛЬНЫЙ БЛОК DNS ДЛЯ MTG V2
// ==========================================
const configContent = `
secret = "${FULL_SECRET}"
bind-to = "127.0.0.1:${MTG_PORT}"

[dns]
# Переключаем mtg на классический DNS вместо DoH
block-ipv6 = true

# Явно задаем сетевые маршруты для резолвера внутри mtg
routes = [
    { host = "max.ru", ips = ["185.129.100.121", "185.129.100.122"] }
]
`;
fs.writeFileSync('./config.toml', configContent);

// ==========================================
// ЗАПУСК И СТРИМИНГ ЛОГОВ
// ==========================================
const mtg = spawn('./mtg', ['run', './config.toml']);

mtg.stdout.on('data', (data) => {
    console.log(`[MTG STDOUT]: ${data.toString().trim()}`);
});

mtg.stderr.on('data', (data) => {
    console.log(`[MTG STDERR]: ${data.toString().trim()}`);
});

mtg.on('error', (err) => console.error("❌ Сбой бинарника:", err));

// ==========================================
// МУЛЬТИПЛЕКСОР ДЛЯ RENDER
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
    console.log("\n" + "⚡".repeat(25));
    console.log("🚀 ПРОКСИ ЗАПУЩЕН И ОТЛАЖЕН!");
    console.log(`🌍 Маскировка: ${MASK_DOMAIN}`);
    console.log(`\n🔗 ПОДКЛЮЧЕНИЕ В TELEGRAM:`);
    console.log(`tg://proxy?server=${HOST}&port=443&secret=${FULL_SECRET}`);
    console.log("⚡".repeat(25) + "\n");
});
