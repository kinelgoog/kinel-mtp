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
// "max.ru" в hex -> "6d61782e7275"
const domainHex = Buffer.from(MASK_DOMAIN, 'utf8').toString('hex');
const rawKey = "1234567890abcdef1234567890abcdef";
const FULL_SECRET = "ee" + rawKey + domainHex;

// ==========================================
// МИНИМАЛЬНЫЙ КОНФИГ
// ==========================================
const configContent = `
secret = "${FULL_SECRET}"
bind-to = "127.0.0.1:${MTG_PORT}"
`;
fs.writeFileSync('./config.toml', configContent);

// ==========================================
// ЗАПУСК MTG И ВЫВОД ЛОГОВ
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
    console.log("\n" + "⚡".repeat(25));
    console.log("🚀 ПРОКСИ ОБНОВЛЕН И ЗАПУЩЕН!");
    console.log(`🌍 Маскировка системы: ${MASK_DOMAIN}`);
    console.log(`\n🔗 ПОДКЛЮЧЕНИЕ В TELEGRAM:`);
    console.log(`tg://proxy?server=${HOST}&port=443&secret=${FULL_SECRET}`);
    console.log("⚡".repeat(25) + "\n");
});
