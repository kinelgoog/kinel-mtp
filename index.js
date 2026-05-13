const net = require('net');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 10000;
const MTG_PORT = 3128;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// 1. Генерируем секрет и правильный FakeTLS конфиг
// ee + 32 символа hex
const HEX_SECRET = "0123456789abcdef0123456789abcdef"; 
const TG_SECRET = "ee" + HEX_SECRET; 

const configContent = `
secret = "${TG_SECRET}"
bind = "127.0.0.1:${MTG_PORT}"

[prefer-ip]
prefer = "ipv4"
`;
fs.writeFileSync('./config.toml', configContent);

// 2. Запускаем mtg с чистым конфигом
const mtg = spawn('./mtg', ['run', './config.toml'], { stdio: 'inherit' });

mtg.on('error', (err) => console.error("MTG Spawn Error:", err));

// 3. Умный мультиплексор для Render
net.createServer(client => {
    client.once('data', data => {
        const head = data.toString();
        
        // Отвечаем на пинги Render (Health Check)
        if (head.startsWith('GET') || head.startsWith('HEAD') || head.startsWith('POST')) {
            client.write("HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK");
            client.destroy();
        } else {
            // Перенаправляем чистый трафик Telegram в mtg
            const proxy = net.createConnection(MTG_PORT, '127.0.0.1', () => {
                proxy.write(data);
                client.pipe(proxy).pipe(client);
            });
            proxy.on('error', () => client.destroy());
            client.on('error', () => proxy.destroy());
        }
    });
}).listen(PORT, '0.0.0.0', () => {
    // Формируем финальный секрет для ссылки (секрет + hex-версия домена)
    // yandex.ru в hex формате — это 79616e6465782e7275
    const finalSecret = TG_SECRET + "79616e6465782e7275";
    
    console.log("\n" + "=".repeat(50));
    console.log("🚀 FakeTLS ПРОКСИ ЗАПУЩЕН!");
    console.log(`🌍 Маскировка под: yandex.ru`);
    console.log(`🔗 Ссылка: tg://proxy?server=${HOST}&port=443&secret=${finalSecret}`);
    console.log("=".repeat(50) + "\n");
});
