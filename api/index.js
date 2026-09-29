import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './database.js';
import { gerarPDF } from './pdf.js';
import { TODOS_TAMANHOS, ehInfantil } from '../shared/tamanhos.js';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'fest-acai-secret-2026-marupauba';

app.use(cors());
app.use(express.json());

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

app.get('/api/preco', async (req, res) => {
  try {
    const [result, resultAvista, resultInfantil] = await Promise.all([
      db.execute({
        sql: 'SELECT value FROM config WHERE key = ?',
        args: ['preco_camisa']
      }),
      db.execute({
        sql: 'SELECT value FROM config WHERE key = ?',
        args: ['preco_avista']
      }),
      db.execute({
        sql: 'SELECT value FROM config WHERE key = ?',
        args: ['preco_infantil']
      })
    ]);
    const preco = result.rows.length > 0 ? parseFloat(result.rows[0].value) : 35;
    const precoAvista = resultAvista.rows.length > 0 ? parseFloat(resultAvista.rows[0].value) : 30;
    const precoInfantil = resultInfantil.rows.length > 0 ? parseFloat(resultInfantil.rows[0].value) : 22;
    res.json({ preco, preco_avista: precoAvista, preco_infantil: precoInfantil });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const { pedidos } = req.body;
  if (!pedidos || !Array.isArray(pedidos) || pedidos.length === 0) {
    return res.status(400).json({ error: 'Dados invalidos' });
  }

  try {
    const [precoResult, precoInfantilResult] = await Promise.all([
      db.execute({
        sql: 'SELECT value FROM config WHERE key = ?',
        args: ['preco_camisa']
      }),
      db.execute({
        sql: 'SELECT value FROM config WHERE key = ?',
        args: ['preco_infantil']
      })
    ]);
    const preco = precoResult.rows.length > 0 ? parseFloat(precoResult.rows[0].value) : 35;
    const precoInfantil = precoInfantilResult.rows.length > 0 ? parseFloat(precoInfantilResult.rows[0].value) : 22;

    const statements = [];
    for (const item of pedidos) {
      if (!item.nome || !item.genero || !item.tamanho) {
        return res.status(400).json({ error: 'Campos obrigatorios faltando' });
      }
      if (!TODOS_TAMANHOS.includes(item.tamanho)) {
        return res.status(400).json({ error: 'Tamanho invalido' });
      }
      // Camisa infantil tem valor unico (preco_infantil); adulto usa o preco parcelado
      const valorItem = ehInfantil(item.tamanho) ? precoInfantil : preco;
      statements.push({
        sql: `INSERT INTO pedidos (nome, genero, tamanho, valor_camisa, percentual_pago, valor_pago)
              VALUES (?, ?, ?, ?, 0, 0.00)`,
        args: [item.nome.trim().toUpperCase(), item.genero, item.tamanho, valorItem]
      });
    }

    await db.batch(statements, 'write');
    res.json({ success: true, message: 'Pedido(s) registrado(s) com sucesso!' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/pedidos/buscar-nomes', async (req, res) => {
  const q = (req.query.q || '').trim().toUpperCase();
  if (q.length < 2) return res.json([]);
  try {
    const result = await db.execute({
      sql: "SELECT DISTINCT nome FROM pedidos WHERE UPPER(nome) LIKE ? ORDER BY nome ASC LIMIT 10",
      args: ['%' + q + '%']
    });
    res.json(result.rows.map(r => r.nome));
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/pedidos/consulta', async (req, res) => {
  const nome = (req.query.nome || '').trim();
  if (!nome) return res.json([]);
  try {
    const result = await db.execute({
      sql: 'SELECT genero, tamanho, valor_camisa, percentual_pago, valor_pago, pagamento_avista FROM pedidos WHERE LOWER(nome) = LOWER(?) ORDER BY id ASC',
      args: [nome]
    });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/pedidos/verificar-nome', async (req, res) => {
  const nome = (req.query.nome || '').trim();
  if (!nome) return res.json({ existe: false });
  try {
    const result = await db.execute({
      sql: 'SELECT COUNT(*) as total FROM pedidos WHERE LOWER(nome) = LOWER(?)',
      args: [nome]
    });
    res.json({ existe: Number(result.rows[0].total) > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  const { senha } = req.body;
  if (!senha) return res.status(400).json({ error: 'Senha obrigatoria' });

  try {
    const result = await db.execute({
      sql: 'SELECT value FROM config WHERE key = ?',
      args: ['admin_password']
    });
    if (result.rows.length === 0 || !bcrypt.compareSync(senha, result.rows[0].value)) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/admin/pedidos', authMiddleware, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM pedidos ORDER BY nome ASC, id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.put('/api/admin/pedidos/:id/pagamento', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { percentual_pago, pagamento_avista } = req.body;

  if (![0, 50, 100].includes(percentual_pago)) {
    return res.status(400).json({ error: 'Percentual invalido' });
  }

  try {
    const pedidoResult = await db.execute({ sql: 'SELECT * FROM pedidos WHERE id = ?', args: [id] });
    if (pedidoResult.rows.length === 0) return res.status(404).json({ error: 'Pedido nao encontrado' });

    const pedido = pedidoResult.rows[0];
    const infantil = ehInfantil(pedido.tamanho);

    // Regra unica de calculo do valor pago:
    // - infantil: nunca tem desconto a vista (flag sempre 0); valor_pago = valor_camisa (= preco_infantil gravado) x percentual
    // - adulto a vista (100%): usa o preco_avista da config
    // - adulto caso contrario: valor da camisa x percentual
    const avista = !infantil && percentual_pago === 100 && pagamento_avista ? 1 : 0;

    let valor_pago;
    if (avista === 1) {
      const precoAvistaResult = await db.execute({
        sql: 'SELECT value FROM config WHERE key = ?',
        args: ['preco_avista']
      });
      const precoAvista = precoAvistaResult.rows.length > 0 ? parseFloat(precoAvistaResult.rows[0].value) : 30;
      valor_pago = precoAvista;
    } else {
      valor_pago = pedido.valor_camisa * (percentual_pago / 100);
    }

    await db.execute({
      sql: 'UPDATE pedidos SET percentual_pago = ?, pagamento_avista = ?, valor_pago = ? WHERE id = ?',
      args: [percentual_pago, avista, valor_pago, id]
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/admin/resumo', authMiddleware, async (req, res) => {
  try {
    const [total, porTamanho, porGenero, arrecadado, pendente] = await Promise.all([
      db.execute('SELECT COUNT(*) as total FROM pedidos'),
      db.execute('SELECT tamanho, COUNT(*) as total FROM pedidos GROUP BY tamanho'),
      db.execute('SELECT genero, COUNT(*) as total FROM pedidos GROUP BY genero'),
      db.execute('SELECT COALESCE(SUM(valor_pago),0) as total FROM pedidos'),
      db.execute(`SELECT COALESCE(SUM(CASE WHEN percentual_pago = 100 THEN 0
             ELSE valor_camisa - valor_pago END),0) as total FROM pedidos`),
    ]);

    const valorArrecadado = Number(arrecadado.rows[0].total);
    const valorPendente = Number(pendente.rows[0].total);

    res.json({
      total_pedidos: Number(total.rows[0].total),
      por_tamanho: porTamanho.rows,
      por_genero: porGenero.rows,
      valor_arrecadado: valorArrecadado,
      valor_pendente: valorPendente
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.delete('/api/admin/pedidos/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.execute({ sql: 'DELETE FROM pedidos WHERE id = ?', args: [id] });
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Pedido nao encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.get('/api/admin/pedidos/pdf', authMiddleware, async (req, res) => {
  try {
    const [pedidosResult, precoResult, precoAvistaResult] = await Promise.all([
      db.execute('SELECT * FROM pedidos ORDER BY nome ASC, id ASC'),
      db.execute({ sql: 'SELECT value FROM config WHERE key = ?', args: ['preco_camisa'] }),
      db.execute({ sql: 'SELECT value FROM config WHERE key = ?', args: ['preco_avista'] })
    ]);

    const preco = precoResult.rows.length > 0 ? parseFloat(precoResult.rows[0].value) : 35;
    const precoAvista = precoAvistaResult.rows.length > 0 ? parseFloat(precoAvistaResult.rows[0].value) : 30;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=pedidos-fest-acai.pdf');

    gerarPDF(pedidosResult.rows, preco, precoAvista, res);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
});

export default app;
