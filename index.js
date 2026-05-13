const http = require('http');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
const SECRET = "ee74656c656772616d5f70726f78795f72656e646572"; 
const HOSTNAME = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// 1. Заглушка для Render Health Check
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Proxy is running');
}).listen(PORT, () => {
    console.log(`\n[SYSTEM]: Веб-сервер запущен на порту ${PORT}`);
    
    // Вывод ссылки в консоль
    const tgLink = `tg://proxy?server=${HOSTNAME}&port=443&secret=${SECRET}`;
    const httpsLink = `https://t.me/proxy?server=${HOSTNAME}&port=443&secret=${SECRET}`;
    
    console.log("====================================================");
    console.log("ПРОКСИ ГОТОВ К РАБОТЕ!");
    console.log("Нажми на ссылку в логах или скопируй её:");
    console.log(`\nПрямая ссылка: ${tgLink}`);
    console.log(`Через t.me: ${httpsLink}`);
    console.log("====================================================\n");
});

// 2. Запуск MTProxy
const mtg = spawn('./mtg', ['run', SECRET, '--bind', '0.0.0.0:3128']);

mtg.stdout.on('data', (data) => {
    // Выводим только важные логи от mtg
    if (data.toString().includes("stats")) return; 
    console.log(`[MTG]: ${data}`);
});

mtg.stderr.on('data', (data) => console.error(`[MTG-ERROR]: ${data}`));
