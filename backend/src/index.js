const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const buildCreaturesRouter = require('./routes/creatures');

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/creatures', buildCreaturesRouter(UPLOADS_DIR));

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  console.log(`Unidex API rodando na porta ${PORT}`);
});
