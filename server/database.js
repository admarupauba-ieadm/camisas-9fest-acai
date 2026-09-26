import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new DatabaseSync(path.join(__dirname, 'festacai.db'));

db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    genero TEXT NOT NULL CHECK(genero IN ('Masculino','Feminino')),
    tamanho TEXT NOT NULL CHECK(tamanho IN ('PP','P','M','G','GG')),
    valor_camisa REAL NOT NULL DEFAULT 35.00,
    percentual_pago INTEGER NOT NULL DEFAULT 0 CHECK(percentual_pago IN (0,50,100)),
    valor_pago REAL NOT NULL DEFAULT 0.00,
    data_pedido TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )
`);

const existing = db.prepare('SELECT value FROM config WHERE key = ?').get('admin_password');
if (!existing) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run('admin_password', hash);
}

const existingPrice = db.prepare('SELECT value FROM config WHERE key = ?').get('preco_camisa');
if (!existingPrice) {
  db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run('preco_camisa', '35.00');
}

export default db;
