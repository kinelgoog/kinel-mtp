const http = require('http');
const { WebSocketServer } = require('ws');
const net = require('net');

const PORT = process.env.PORT || 10000;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// Создаем базовый HTTP сервер для прохождения Health Check Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Proxy Node is Active');
});

// Поднимаем WebSocket сервер поверх HTTP
const wss = new WebSocketServer({ server });

// Список IP-адресов Telegram
const TG_IPS = ["149.154.175.50", "149.154.167.51", "149.154.175.100", "149.154.167.91"];
function getTelegramIP() {
    return TG_IPS[Math.floor(Math.random() * TG_IPS.length)];
}

wss.on('connection', (ws, req) => {
    // Проверяем путь, чтобы левый трафик не забил нам сервер
    if (req.url !== '/tg-proxy') {
        ws.close();
        return;
    }

    let tgSocket = null;
    let isConnected = false;
    let bufferQueue = [];

    // Когда клиент присылает данные по WebSocket
    ws.on('message', (message) => {
        // Если соединение с Telegram еще не открыто
        if (!tgSocket) {
            const tgIP = getTelegramIP();
            
            tgSocket = net.createConnection(443, tgIP, () => {
                isConnected = true;
                // Отправляем всё, что скопилось
                if (bufferQueue.length > 0) {
                    bufferQueue.forEach(chunk => tgSocket.write(chunk));
                    bufferQueue = [];
                }
            });

            // Данные от Telegram отправляем обратно в WebSocket
            tgSocket.on('data', (data) => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(data);
                }
            });

            tgSocket.on('error', () => ws.close());
            tgSocket.on('close', () => ws.close());
        }

        // Пишем данные в сокет Telegram
        if (isConnected) {
            tgSocket.write(message);
        } else {
            bufferQueue.push(message);
        }
    });

    ws.on('close', () => {
        if (tgSocket) tgSocket.destroy();
    });

    ws.on('error', () => {
        if (tgSocket) tgSocket.destroy();
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log("\n" + "==================================================");
    console.log("🚀 МОЩНЫЙ WEBSOCKET-ПЕРЕХОДНИК ЗАПУЩЕН");
    console.log(`📌 Способ обхода: Маскировка под WebSocket (WS)`);
    console.log(`🌍 Адрес подключения: wss://${HOST}/tg-proxy`);
    console.log("==================================================" + "\n");
});
