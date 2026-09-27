const BASE = '/api';

export async function getPreco() {
  const res = await fetch(`${BASE}/preco`);
  return res.json();
}

export async function enviarPedidos(pedidos) {
  const res = await fetch(`${BASE}/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedidos })
  });
  return res.json();
}

export async function consultarPedidos(nome) {
  const res = await fetch(`${BASE}/pedidos/consulta?nome=${encodeURIComponent(nome)}`);
  return res.json();
}

export async function buscarNomes(query) {
  const res = await fetch(`${BASE}/pedidos/buscar-nomes?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function verificarNome(nome) {
  const res = await fetch(`${BASE}/pedidos/verificar-nome?nome=${encodeURIComponent(nome)}`);
  return res.json();
}

export async function login(senha) {
  const res = await fetch(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }
  return res.json();
}

function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export async function getPedidos() {
  const res = await fetch(`${BASE}/admin/pedidos`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('NAO_AUTORIZADO');
  return res.json();
}

export async function getResumo() {
  const res = await fetch(`${BASE}/admin/resumo`, { headers: authHeaders() });
  if (res.status === 401) throw new Error('NAO_AUTORIZADO');
  return res.json();
}

export async function atualizarPagamento(id, percentual_pago) {
  const res = await fetch(`${BASE}/admin/pedidos/${id}/pagamento`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ percentual_pago })
  });
  return res.json();
}

export async function deletarPedido(id) {
  const res = await fetch(`${BASE}/admin/pedidos/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return res.json();
}

export function baixarPDF() {
  const token = localStorage.getItem('admin_token');
  return fetch(`${BASE}/admin/pedidos/pdf`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pedidos-fest-acai.pdf';
      a.click();
      URL.revokeObjectURL(url);
    });
}
