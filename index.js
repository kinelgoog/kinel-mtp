const http = require('http');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 3000;
// Новый Base64 секрет (уже с FakeTLS маскировкой под google.com)
const SECRET = "7l6-Z28_L_6-Z28_L_6-Z28yLWdvb2dsZS5jb20="; 
const HOSTNAME = process.env.RENDER_EXTERNAL_HOSTNAME || "your-app.onrender.com";

// 1. Заглушка для Render Health Check
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Proxy is running');
}).listen(PORT, () => {
    console.log(`\n[SYSTEM]: Сервер заглушки запущен на порту ${PORT}`);
    
    const tgLink = `tg://proxy?server=${HOSTNAME}&port=443&secret=${SECRET}`;
    const httpsLink = `https://t.me/proxy?server=${HOSTNAME}&port=443&secret=${SECRET}`;
    
    console.log("====================================================");
    console.log("ПРОКСИ ГОТОВ (Исправленная версия v2)");
    console.log(`\nСсылка для Telegram: ${tgLink}`);
    console.log(`\nРезервная ссылка: ${httpsLink}`);
    console.log("====================================================\n");
});

// 2. Запуск MTProxy (используем секрет в кавычках для надежности)
const mtg = spawn('./mtg', ['run', SECRET, '--bind', '0.0.0.0:3128'], {
    shell: true // Добавляем оболочку для корректной передачи аргументов
});

mtg.stdout.on('data', (data) => {
    const output = data.toString();
    if (!output.includes("stats")) console.log(`[MTG]: ${output}`);
});

mtg.stderr.on('data', (data) => {
    const errorOutput = data.toString();
    // Игнорируем мелкие предупреждения, выводим только реальные ошибки
    if (errorOutput.includes("error") || errorOutput.includes("fatal")) {
        console.error(`[MTG-ERROR]: ${errorOutput}`);
    }
});
