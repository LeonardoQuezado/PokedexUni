const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const buildCreaturesRouter = require('./routes/creatures');
const buildAuthRouter = require('./routes/auth');
const buildUsersRouter = require('./routes/users');
const attachSocket = require('./socket');

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/creatures', buildCreaturesRouter(UPLOADS_DIR));
app.use('/api/auth', buildAuthRouter());
app.use('/api/users', buildUsersRouter(UPLOADS_DIR));

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const server = http.createServer(app);
attachSocket(server);

server.listen(PORT, () => {
  console.log(`Dayonmon API rodando na porta ${PORT}`);
});
