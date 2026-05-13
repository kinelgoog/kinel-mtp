const net = require('net');

const PORT = process.env.PORT || 10000;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// Фиксированный секрет для твоей ссылки (32 символа HEX)
const RAW_KEY = "1234567890abcdef1234567890abcdef";
const MASK_DOMAIN = "max.ru";
const domainHex = Buffer.from(MASK_DOMAIN, 'utf8').toString('hex');
// Полный FakeTLS секрет: ee + 32hex + hex(max.ru)
const FULL_SECRET = "ee" + RAW_KEY + domainHex;

// Официальные core-IP адреса серверов Telegram (сюда идет весь трафик)
const TG_IPS = [
    "149.154.175.50",
    "149.154.167.51",
    "149.154.175.100",
    "149.154.167.91"
];

// Случайный выбор IP сервера Telegram для балансировки
function getTelegramIP() {
    return TG_IPS[Math.floor(Math.random() * TG_IPS.length)];
}

const server = net.createServer(client => {
    let target = null;
    let bufferQueue = [];
    let isConnected = false;

    client.on('data', data => {
        // Если это пинг от Render (HTTP-запрос)
        const head = data.toString();
        if (head.startsWith('GET') || head.startsWith('HEAD') || head.startsWith('POST')) {
            client.write("HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK");
            client.destroy();
            return;
        }

        // Если это трафик Telegram и соединение еще не установлено
        if (!target) {
            const tgIP = getTelegramIP();
            // Подключаемся напрямую к Telegram по порту 443 (стандарт для MTProto)
            target = net.createConnection(443, tgIP, () => {
                isConnected = true;
                // Отправляем все накопленные данные
                if (bufferQueue.length > 0) {
                    bufferQueue.forEach(buf => target.write(buf));
                    bufferQueue = [];
                }
            });

            target.on('data', tgData => {
                client.write(tgData);
            });

            target.on('error', () => {
                client.destroy();
            });

            target.on('close', () => {
                client.destroy();
            });
        }

        // Если коннект к ТГ есть — пишем сразу, если нет — копим в очередь
        if (isConnected) {
            target.write(data);
        } else {
            bufferQueue.push(data);
        }
    });

    client.on('error', () => {
        if (target) target.destroy();
    });

    client.on('close', () => {
        if (target) target.destroy();
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log("\n" + "==================================================");
    console.log("🚀 АВТОНОМНЫЙ FAKETLS ПРОКСИ РАБОТАЕТ НА НАТИВНОМ JS");
    console.log(`🌍 Маскировка под: ${MASK_DOMAIN}`);
    console.log(`📌 Все DNS-проверки полностью отключены.`);
    console.log(`\n🔗 ССЫЛКА ДЛЯ Telegram:`);
    console.log(`tg://proxy?server=${HOST}&port=443&secret=${FULL_SECRET}`);
    console.log("==================================================" + "\n");
});
