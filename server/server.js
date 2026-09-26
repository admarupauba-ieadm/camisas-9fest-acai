import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';
import { gerarPDF } from './pdf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fest-acai-secret-2026-marupauba';

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token nao fornecido' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido' });
  }
}

app.get('/api/preco', (req, res) => {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('preco_camisa');
  res.json({ preco: parseFloat(row.value) });
});

app.post('/api/pedidos', (req, res) => {
  const { pedidos } = req.body;
  if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
    return res.status(400).json({ error: 'Dados invalidos' });
  }

  const precoRow = db.prepare('SELECT value FROM config WHERE key = ?').get('preco_camisa');
  const preco = parseFloat(precoRow.value);

  const insert = db.prepare(`
    INSERT INTO pedidos (nome, genero, tamanho, valor_camisa, percentual_pago, valor_pago)
    VALUES (?, ?, ?, ?, 0, 0.00)
  `);

  try {
    db.exec('BEGIN TRANSACTION');
    for (const item of pedidos) {
      if (!item.nome || !item.genero || !item.tamanho) {
        throw new Error('Campos obrigatorios faltando');
      }
      insert.run(item.nome.trim(), item.genero, item.tamanho, preco);
    }
    db.exec('COMMIT');
    res.json({ success: true, message: 'Pedido(s) registrado(s) com sucesso!' });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { senha } = req.body;
  if (!senha) return res.status(400).json({ error: 'Senha obrigatoria' });

  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('admin_password');
  if (!row || !bcrypt.compareSync(senha, row.value)) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

app.get('/api/admin/pedidos', authMiddleware, (req, res) => {
  const pedidos = db.prepare('SELECT * FROM pedidos ORDER BY nome ASC, id ASC').all();
  res.json(pedidos);
});

app.put('/api/admin/pedidos/:id/pagamento', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { percentual_pago } = req.body;

  if (![0, 50, 100].includes(percentual_pago)) {
    return res.status(400).json({ error: 'Percentual invalido' });
  }

  const pedido = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
  if (!pedido) return res.status(404).json({ error: 'Pedido nao encontrado' });

  const valor_pago = pedido.valor_camisa * (percentual_pago / 100);

  db.prepare('UPDATE pedidos SET percentual_pago = ?, valor_pago = ? WHERE id = ?')
    .run(percentual_pago, valor_pago, id);

  res.json({ success: true });
});

app.get('/api/admin/resumo', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as total FROM pedidos').get();
  const porTamanho = db.prepare('SELECT tamanho, COUNT(*) as total FROM pedidos GROUP BY tamanho').all();
  const porGenero = db.prepare('SELECT genero, COUNT(*) as total FROM pedidos GROUP BY genero').all();
  const arrecadado = db.prepare('SELECT COALESCE(SUM(valor_pago),0) as total FROM pedidos').get();
  const totalCamisas = db.prepare('SELECT COALESCE(SUM(valor_camisa),0) as total FROM pedidos').get();
  const pendente = totalCamisas.total - arrecadado.total;

  res.json({
    total_pedidos: total.total,
    por_tamanho: porTamanho,
    por_genero: porGenero,
    valor_arrecadado: arrecadado.total,
    valor_pendente: pendente
  });
});

app.delete('/api/admin/pedidos/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM pedidos WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Pedido nao encontrado' });
  res.json({ success: true });
});

app.get('/api/admin/pedidos/pdf', authMiddleware, (req, res) => {
  const pedidos = db.prepare('SELECT * FROM pedidos ORDER BY nome ASC, id ASC').all();
  const precoRow = db.prepare('SELECT value FROM config WHERE key = ?').get('preco_camisa');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=pedidos-fest-acai.pdf');

  gerarPDF(pedidos, parseFloat(precoRow.value), res);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
