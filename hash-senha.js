// Gera hash bcrypt de uma senha informada por linha de comando.
// Nao e importado pelo app — uso apenas manual pelo administrador.
//
// Uso (PowerShell):
//   node hash-senha.js MinhaSenha123
//   node hash-senha.js 'MinhaSenha$123'   <- aspas simples se a senha tiver $
//
// Copie o comando UPDATE impresso e cole no console do Turso de producao.

import bcrypt from 'bcryptjs';

const senha = process.argv[2];

if (!senha) {
  console.error('Uso: node hash-senha.js <senha>');
  console.error("Se a senha tiver o caractere $, use aspas simples: node hash-senha.js 'Minha$enha'");
  process.exit(1);
}

const hash = bcrypt.hashSync(senha, 10);

console.log('Hash bcrypt gerado:');
console.log(hash);
console.log('');
console.log('Comando para colar no console do Turso de producao:');
console.log(`UPDATE config SET value='${hash}' WHERE key='admin_password';`);
