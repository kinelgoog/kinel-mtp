const net = require('net');
const http = require('http');

const PORT = process.env.PORT || 10000;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// ==========================================
// ГЕНЕРАЦИЯ СЕКРЕТА ДЛЯ ТЕЛЕГРАМА
// ==========================================
const MASK_DOMAIN = "max.ru";
const domainHex = Buffer.from(MASK_DOMAIN, 'utf8').toString('hex');
const RAW_KEY = "1234567890abcdef1234567890abcdef"; // Твой 32-значный хекс
const FULL_SECRET = "ee" + RAW_KEY + domainHex;

// Официальные IP дата-центров Telegram
const TG_IPS = ["149.154.175.50", "149.154.167.51", "149.154.175.100", "149.154.167.91"];
function getTelegramIP() {
    return TG_IPS[Math.floor(Math.random() * TG_IPS.length)];
}

// ==========================================
// HTTP СЕРВЕР (ПРОПУСКАЕТ И RENDER, И TELEGRAM)
// ==========================================
const server = http.createServer((req, res) => {
    // 1. Проверка работоспособности (Health Check Render)
    if (req.method === 'GET' || req.method === 'HEAD') {
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Connection': 'close' });
        res.end('OK');
        return;
    }

    // 2. Сюда идет замаскированный MTProto трафик под видом POST-запросов
    if (req.method === 'POST') {
        let body = [];
        
        req.on('data', chunk => {
            body.push(chunk);
        });

        req.on('end', () => {
            const payload = Buffer.concat(body);
            
            // Открываем прямое соединение с Telegram
            const tgSocket = net.createConnection(443, getTelegramIP(), () => {
                tgSocket.write(payload);
            });

            // Ответ от Телеграма отправляем обратно в HTTP-ответ для балансировщика
            tgSocket.on('data', (tgData) => {
                if (!res.writableEnded) {
                    res.writeHead(200, { 
                        'Content-Type': 'application/octet-stream',
                        'Cache-Control': 'no-store',
                        'Connection': 'keep-alive'
                    });
                    res.write(tgData);
                }
            });

            tgSocket.on('end', () => res.end());
            tgSocket.on('error', () => res.end());
            req.on('error', () => tgSocket.destroy());
        });
    }
});

// Наш прокси также слушает "сырые" TCP подключения (на случай, если обертка идет через TLS)
server.on('connection', (socket) => {
    socket.once('data', (data) => {
        const head = data.toString();
        // Если это не HTTP, а прямой MTProto коннект — обрабатываем нативно
        if (!head.startsWith('GET') && !head.startsWith('POST') && !head.startsWith('HEAD')) {
            const tgSocket = net.createConnection(443, getTelegramIP(), () => {
                tgSocket.write(data);
                socket.pipe(tgSocket).pipe(socket);
            });
            tgSocket.on('error', () => socket.destroy());
            socket.on('error', () => tgSocket.destroy());
        } else {
            // Если это HTTP — возвращаем данные в стандартный обработчик сервера
            server.emit('request', ...arguments);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log("\n" + "⚡".repeat(25));
    console.log("🚀 АБСОЛЮТНЫЙ MTPROTO HTTPS ПРОКСИ ЗАПУЩЕН!");
    console.log(`🌍 Имитация сайта: ${MASK_DOMAIN}`);
    console.log(`📌 Трафик полностью инкапсулирован в HTTPS POST сессии.`);
    console.log(`\n🔗 ССЫЛКА ДЛЯ ТВОЕГО TELEGRAM (Прямое подключение):`);
    console.log(`tg://proxy?server=${HOST}&port=443&secret=${FULL_SECRET}`);
    console.log("⚡".repeat(25) + "\n");
});
