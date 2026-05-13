const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 10000;
const MTG_PORT = 3128;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// ==========================================
// НАСТРОЙКА FAKETLS ДЛЯ ОБХОДА БЛОКИРОВОК В РФ
// ==========================================
// Маскируемся под домен, который никогда не заблокируют
const MASK_DOMAIN = "google.com";
// Превращаем "google.com" в hex -> "676f6f676c652e636f6d"
const domainHex = Buffer.from(MASK_DOMAIN, 'utf8').toString('hex');
// Ключ (любые 32 символа hex). Я сделал красивый симметричный ключ.
const rawKey = "b1b2b3b4b5b6b7b8b9b0c1c2c3c4c5c6";
// Собираем секрет: префикс 'ee' (FakeTLS) + ключ + hex домена
const FULL_SECRET = "ee" + rawKey + domainHex;

// ==========================================
// ГЕНЕРАЦИЯ КОНФИГА (ИСПРАВЛЕНА ОШИБКА BIND-TO)
// ==========================================
const configContent = `
secret = "${FULL_SECRET}"
bind-to = "127.0.0.1:${MTG_PORT}"
`;
fs.writeFileSync('./config.toml', configContent);

// Запускаем сам mtg
const mtg = spawn('./mtg', ['run', './config.toml'], { stdio: 'inherit' });
mtg.on('error', (err) => console.error("MTG Error:", err));

// ==========================================
// УМНЫЙ МУЛЬТИПЛЕКСОР (ДЛЯ RENDER И TELEGRAM)
// ==========================================
net.createServer(client => {
    client.once('data', data => {
        const head = data.toString();
        
        // 1. Отвечаем Render'у на его проверки (чтобы не убил контейнер)
        if (head.match(/^(GET|POST|HEAD)/)) {
            client.write("HTTP/1.1 200 OK\r\nConnection: close\r\n\r\nOK");
            client.destroy();
        } else {
            // 2. Весь остальной трафик отдаем нашему MTProto прокси
            const proxy = net.createConnection(MTG_PORT, '127.0.0.1', () => {
                proxy.write(data);
                client.pipe(proxy).pipe(client);
            });
            proxy.on('error', () => client.destroy());
            client.on('error', () => proxy.destroy());
        }
    });
}).listen(PORT, '0.0.0.0', () => {
    console.log("\n" + "🔥".repeat(25));
    console.log("🚀 ПРОКСИ УСПЕШНО ЗАПУЩЕН БЕЗ ОШИБОК!");
    console.log(`🛡  Защита от блокировок: FakeTLS (маскировка под ${MASK_DOMAIN})`);
    console.log(`\n🔗 НАЖМИ ДЛЯ ПОДКЛЮЧЕНИЯ В TELEGRAM:`);
    console.log(`tg://proxy?server=${HOST}&port=443&secret=${FULL_SECRET}`);
    console.log("🔥".repeat(25) + "\n");
});
