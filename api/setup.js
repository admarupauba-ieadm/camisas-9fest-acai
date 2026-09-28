import db from './database.js';
import bcrypt from 'bcryptjs';

async function setup() {
  console.log('Criando tabelas...');

  await db.execute(`CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    genero TEXT NOT NULL CHECK(genero IN ('Masculino','Feminino')),
    tamanho TEXT NOT NULL CHECK(tamanho IN ('PP','P','M','G','GG')),
    valor_camisa REAL NOT NULL DEFAULT 35.00,
    percentual_pago INTEGER NOT NULL DEFAULT 0 CHECK(percentual_pago IN (0,50,100)),
    valor_pago REAL NOT NULL DEFAULT 0.00,
    data_pedido TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    pagamento_avista INTEGER NOT NULL DEFAULT 0 CHECK(pagamento_avista IN (0,1))
  )`);

  // Bancos antigos nao tem a coluna pagamento_avista — adiciona somente se faltar
  const colunas = await db.execute('PRAGMA table_info(pedidos)');
  if (!colunas.rows.some(c => c.name === 'pagamento_avista')) {
    await db.execute('ALTER TABLE pedidos ADD COLUMN pagamento_avista INTEGER NOT NULL DEFAULT 0');
    console.log('Coluna pagamento_avista adicionada a tabela existente.');
  } else {
    console.log('Coluna pagamento_avista ja existe.');
  }

  console.log('Tabelas criadas.');

  const existing = await db.execute({
    sql: 'SELECT value FROM config WHERE key = ?',
    args: ['admin_password']
  });

  if (existing.rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await db.execute({
      sql: 'INSERT INTO config (key, value) VALUES (?, ?)',
      args: ['admin_password', hash]
    });
    console.log('Senha admin padrao criada (admin123).');
  } else {
    console.log('Senha admin ja existe, mantida.');
  }

  const existingPrice = await db.execute({
    sql: 'SELECT value FROM config WHERE key = ?',
    args: ['preco_camisa']
  });

  if (existingPrice.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO config (key, value) VALUES (?, ?)',
      args: ['preco_camisa', '35.00']
    });
    console.log('Preco padrao criado (R$ 35,00).');
  } else {
    console.log('Preco ja existe: R$ ' + existingPrice.rows[0].value);
  }

  const existingPriceAvista = await db.execute({
    sql: 'SELECT value FROM config WHERE key = ?',
    args: ['preco_avista']
  });

  if (existingPriceAvista.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO config (key, value) VALUES (?, ?)',
      args: ['preco_avista', '30.00']
    });
    console.log('Preco a vista padrao criado (R$ 30,00).');
  } else {
    console.log('Preco a vista ja existe: R$ ' + existingPriceAvista.rows[0].value);
  }

  console.log('Setup concluido com sucesso!');
}

setup().catch(err => {
  console.error('Erro no setup:', err);
  process.exit(1);
});
