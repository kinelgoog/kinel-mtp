const http = require('http');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
// Новый корректный секрет (32 символа + ee)
const SECRET = "ee0123456789abcdef0123456789abcdef"; 
const HOSTNAME = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Proxy is running');
}).listen(PORT, () => {
    console.log(`\n[SYSTEM]: Сервер запущен`);
    
    const tgLink = `tg://proxy?server=${HOSTNAME}&port=443&secret=${SECRET}`;
    const httpsLink = `https://t.me/proxy?server=${HOSTNAME}&port=443&secret=${SECRET}`;
    
    console.log("====================================================");
    console.log("ПРОКСИ ГОТОВ!");
    console.log(`\nСсылка для Telegram: ${tgLink}`);
    console.log(`\nРезервная ссылка: ${httpsLink}`);
    console.log("====================================================\n");
});

const mtg = spawn('./mtg', ['run', SECRET, '--bind', '0.0.0.0:3128']);

mtg.stdout.on('data', (data) => {
    if (!data.toString().includes("stats")) console.log(`[MTG]: ${data}`);
});

mtg.stderr.on('data', (data) => console.error(`[MTG-ERROR]: ${data}`));
