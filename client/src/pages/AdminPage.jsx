import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPedidos, getResumo, atualizarPagamento, deletarPedido, baixarPDF, getPreco } from '../api';
import { AcaiBerry } from '../components/Decorations';
import { ehInfantil, TAMANHOS_ADULTO, TAMANHOS_INFANTIL } from '../../../shared/tamanhos.js';

function normalizarNome(nome) {
  return nome.trim().toLowerCase();
}

// Agrupa pela chave do nome normalizado; o grupo fica na posicao do primeiro pedido da pessoa
function agruparPorNome(pedidos) {
  const map = new Map();
  pedidos.forEach(p => {
    const chave = normalizarNome(p.nome);
    if (!map.has(chave)) map.set(chave, { chave, nome: p.nome, camisas: [] });
    map.get(chave).camisas.push(p);
  });
  return Array.from(map.values());
}

// Resumo do grupo: pago = soma de valor_pago; devido = preco a vista quando for o caso, senao valor_camisa
function resumoGrupo(camisas, precoAvista) {
  const pago = camisas.reduce((s, p) => s + Number(p.valor_pago), 0);
  const devido = camisas.reduce((s, p) =>
    s + (Number(p.pagamento_avista) === 1 ? precoAvista : Number(p.valor_camisa)), 0);
  const tamanhos = [...new Set(camisas.map(p => p.tamanho))].join(', ');
  const todos100 = camisas.every(p => Number(p.percentual_pago) === 100);
  const algumPago = camisas.some(p => Number(p.percentual_pago) > 0);
  const status = todos100 ? 'verde' : algumPago ? 'amarela' : 'vermelha';
  return { pago, devido, tamanhos, status };
}

export default function AdminPage() {
  const [pedidos, setPedidos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const [preco, setPreco] = useState(35);
  const [precoAvista, setPrecoAvista] = useState(30);
  const [precoInfantil, setPrecoInfantil] = useState(22);
  // Grupos abertos, guardados pela chave do nome normalizado (sobrevive a recargas de dados)
  const [expandidos, setExpandidos] = useState(() => new Set());
  const navigate = useNavigate();

  function alternarGrupo(chave) {
    setExpandidos(prev => {
      const novo = new Set(prev);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  useEffect(() => {
    getPreco().then(data => {
      if (data && data.preco != null) setPreco(data.preco);
      if (data && data.preco_avista != null) setPrecoAvista(data.preco_avista);
      if (data && data.preco_infantil != null) setPrecoInfantil(data.preco_infantil);
    }).catch(() => {});
  }, []);

  const carregarDados = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([getPedidos(), getResumo()]);
      setPedidos(p);
      setResumo(r);
    } catch (err) {
      if (err.message === 'NAO_AUTORIZADO') {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { navigate('/admin/login'); return; }
    carregarDados();
  }, [navigate, carregarDados]);

  async function handlePagamento(id, percentual, avista) {
    await atualizarPagamento(id, percentual, avista);
    carregarDados();
  }

  async function handleDelete(id, nome) {
    if (!window.confirm(`Excluir este pedido de "${nome}"?`)) return;
    await deletarPedido(id);
    carregarDados();
  }

  async function handleBaixarPDF() {
    setBaixandoPdf(true);
    try { await baixarPDF(); } catch {} finally { setBaixandoPdf(false); }
  }

  function logout() {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  }

  const pedidosFiltrados = pedidos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const grupos = useMemo(() => agruparPorNome(pedidosFiltrados), [pedidosFiltrados]);
  const totalCamisas = pedidosFiltrados.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-vinho flex items-center justify-center">
        <div className="text-ouro/60 text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vinho">
      <header className="bg-vinho-light/60 border-b border-ouro/15 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <AcaiBerry className="w-8 h-8" />
            <div>
              <h1 className="text-lg font-bold text-ouro">Painel Administrativo</h1>
              <p className="text-ouro/50 text-xs">{'9\u00ba Fest A\u00e7a\u00ed da AD Marupa\u00faba'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBaixarPDF} disabled={baixandoPdf}
              className="bg-folha hover:bg-folha-light disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {baixandoPdf ? 'Gerando...' : 'Baixar PDF'}
            </button>
            <button onClick={logout}
              className="bg-vinho hover:bg-vinho-light text-ouro/70 text-sm font-medium px-4 py-2 rounded-lg border border-ouro/20 transition-all">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {resumo && <ResumoCards resumo={resumo} />}

        <div className="bg-vinho-light/40 border border-ouro/15 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-ouro font-semibold">
              {grupos.length} pessoa{grupos.length !== 1 ? 's' : ''} - {totalCamisas} camisa{totalCamisas !== 1 ? 's' : ''}
              {busca ? ` (filtrado de ${pedidos.length})` : ''}
            </h2>
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome..."
              className="px-4 py-2 bg-white/95 border border-ouro/20 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-acai" />
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ouro/20">
                  <th className="text-left text-ouro/70 font-medium py-3 px-2">Nome</th>
                  <th className="text-left text-ouro/70 font-medium py-3 px-2">{'G\u00eanero'}</th>
                  <th className="text-left text-ouro/70 font-medium py-3 px-2">Tamanho</th>
                  <th className="text-left text-ouro/70 font-medium py-3 px-2">Valor</th>
                  <th className="text-left text-ouro/70 font-medium py-3 px-2 min-w-[200px]">Pagamento</th>
                  <th className="text-left text-ouro/70 font-medium py-3 px-2">Status</th>
                  <th className="text-left text-ouro/70 font-medium py-3 px-2">Pago</th>
                  <th className="text-right text-ouro/70 font-medium py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {grupos.map(grupo => {
                  if (grupo.camisas.length === 1) {
                    const p = grupo.camisas[0];
                    return (
                      <tr key={p.id} className="hover:bg-ouro/5 transition-colors border-b-2 border-ouro/15">
                        <td className="py-3 px-2 text-ouro align-top">
                          <span className="font-semibold">{grupo.nome}</span>
                        </td>
                        <PedidoCelulas p={p} preco={preco} precoAvista={precoAvista} precoInfantil={precoInfantil}
                          onPagamento={handlePagamento} onDelete={handleDelete} />
                      </tr>
                    );
                  }

                  const resumo = resumoGrupo(grupo.camisas, precoAvista);
                  const aberto = expandidos.has(grupo.chave);

                  return (
                    <Fragment key={grupo.chave}>
                      <tr role="button" tabIndex={0} aria-expanded={aberto}
                        onClick={() => alternarGrupo(grupo.chave)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternarGrupo(grupo.chave); }
                        }}
                        className="hover:bg-ouro/10 transition-colors border-b border-ouro/5 cursor-pointer bg-ouro/5">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Chevron aberto={aberto} />
                            <span className="font-semibold text-ouro">{grupo.nome}</span>
                            <span className="bg-acai/30 text-acai-light text-xs font-bold px-2 py-0.5 rounded">
                              {grupo.camisas.length} camisas
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2"></td>
                        <td className="py-3 px-2 text-ouro/60 text-xs">{resumo.tamanhos}</td>
                        <td className="py-3 px-2"></td>
                        <td className="py-3 px-2 text-ouro/80 text-xs whitespace-nowrap">
                          Pago R$ {resumo.pago.toFixed(2)} de R$ {resumo.devido.toFixed(2)}
                        </td>
                        <td className="py-3 px-2"><StatusDot status={resumo.status} /></td>
                        <td className="py-3 px-2"></td>
                        <td className="py-3 px-2"></td>
                      </tr>
                      {aberto && grupo.camisas.map(p => (
                        <tr key={p.id} className="border-b border-ouro/5">
                          <td className="w-4 border-l-4 border-acai/70 bg-acai/5"></td>
                          <PedidoCelulas p={p} preco={preco} precoAvista={precoAvista} precoInfantil={precoInfantil}
                            onPagamento={handlePagamento} onDelete={handleDelete} />
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-4">
            {grupos.map(grupo => {
              if (grupo.camisas.length === 1) {
                const p = grupo.camisas[0];
                return (
                  <div key={grupo.chave} className="bg-vinho/40 border border-ouro/10 rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-ouro font-bold">{grupo.nome}</p>
                      <p className="text-ouro/40 text-xs">1 camisa</p>
                    </div>
                    <PedidoCardMobile p={p} preco={preco} precoAvista={precoAvista} precoInfantil={precoInfantil}
                      onPagamento={handlePagamento} onDelete={handleDelete} />
                  </div>
                );
              }

              const resumo = resumoGrupo(grupo.camisas, precoAvista);
              const aberto = expandidos.has(grupo.chave);

              return (
                <div key={grupo.chave} className="bg-vinho/40 border border-ouro/10 rounded-xl p-4 space-y-3">
                  <button type="button" aria-expanded={aberto} onClick={() => alternarGrupo(grupo.chave)}
                    className="w-full text-left flex items-center gap-2 flex-wrap">
                    <Chevron aberto={aberto} />
                    <p className="text-ouro font-bold">{grupo.nome}</p>
                    <span className="bg-acai/30 text-acai-light text-xs font-bold px-2 py-0.5 rounded">
                      {grupo.camisas.length} camisas
                    </span>
                    <span className="text-ouro/50 text-xs">{resumo.tamanhos}</span>
                    <span className="text-ouro/70 text-xs">
                      Pago R$ {resumo.pago.toFixed(2)} de R$ {resumo.devido.toFixed(2)}
                    </span>
                    <StatusDot status={resumo.status} />
                  </button>
                  {aberto && grupo.camisas.map(p => (
                    <PedidoCardMobile key={p.id} p={p} preco={preco} precoAvista={precoAvista} precoInfantil={precoInfantil}
                      onPagamento={handlePagamento} onDelete={handleDelete} indentado />
                  ))}
                </div>
              );
            })}
          </div>

          {grupos.length === 0 && (
            <div className="text-center py-12 text-ouro/40">
              {busca ? 'Nenhum pedido encontrado para esta busca.' : 'Nenhum pedido registrado ainda.'}
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-4 px-4 border-t border-ouro/10">
        <a href="/" className="text-ouro/30 hover:text-ouro/60 text-xs transition-colors">
          {'Voltar para a p\u00e1gina p\u00fablica'}
        </a>
      </footer>
    </div>
  );
}

function PaymentBar({ percentual, avista }) {
  const width = percentual === 100 ? '100%' : percentual === 50 ? '50%' : '5%';
  const color = percentual === 100 ? 'bg-green-500' : percentual === 50 ? 'bg-yellow-500' : 'bg-red-500';
  const label = percentual === 100 ? '100%' : percentual === 50 ? '50%' : '0%';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-5 bg-gray-800/50 rounded-full overflow-hidden border border-ouro/10">
        <div className={`h-full ${color} rounded-full transition-all duration-500 flex items-center justify-end`}
          style={{ width, minWidth: percentual === 0 ? '18px' : undefined }}>
          <span className="text-[10px] font-bold text-white px-1.5">{label}</span>
        </div>
      </div>
      {percentual === 100 && avista && (
        <span className="text-[10px] font-bold text-green-400 bg-green-500/15 border border-green-500/30 px-1.5 py-0.5 rounded whitespace-nowrap">à vista</span>
      )}
    </div>
  );
}

function PaymentSelect({ pedido, preco, precoAvista, precoInfantil, onChange }) {
  const fmt = v => v.toFixed(2).replace('.', ',');
  const avistaPedido = Number(pedido.pagamento_avista) === 1;
  const infantil = ehInfantil(pedido.tamanho);

  // Infantil: valor unico, sem opcao a vista. Adulto: 4 opcoes.
  const opcoes = infantil ? [
    { val: 0, avista: false, label: 'Pendente (0%)', color: 'bg-red-500/20 text-red-400 border-red-500/30', active: 'bg-red-500 text-white border-red-500' },
    { val: 50, avista: false, label: `50% pago (R$ ${fmt(precoInfantil / 2)})`, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', active: 'bg-yellow-500 text-white border-yellow-500' },
    { val: 100, avista: false, label: `100% pago (R$ ${fmt(precoInfantil)})`, color: 'bg-green-500/20 text-green-400 border-green-500/30', active: 'bg-green-500 text-white border-green-500' },
  ] : [
    { val: 0, avista: false, label: 'Pendente (0%)', color: 'bg-red-500/20 text-red-400 border-red-500/30', active: 'bg-red-500 text-white border-red-500' },
    { val: 50, avista: false, label: `50% pago (R$ ${fmt(preco / 2)})`, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', active: 'bg-yellow-500 text-white border-yellow-500' },
    { val: 100, avista: false, label: `100% pago – parcelado (R$ ${fmt(preco)})`, color: 'bg-green-500/20 text-green-400 border-green-500/30', active: 'bg-green-500 text-white border-green-500' },
    { val: 100, avista: true, label: `100% pago – à vista (R$ ${fmt(precoAvista)})`, color: 'bg-green-500/20 text-green-400 border-green-500/30', active: 'bg-green-500 text-white border-green-500' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1">
      {opcoes.map(opt => {
        const ativo = Number(pedido.percentual_pago) === opt.val && (opt.val !== 100 || avistaPedido === opt.avista);
        return (
          <button key={opt.label}
            onClick={() => onChange(pedido.id, opt.val, opt.avista)}
            className={`text-xs font-medium px-2 py-1 rounded border transition-all ${
              ativo ? opt.active : opt.color + ' hover:opacity-80'
            }`}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Chevron({ aberto }) {
  return (
    <svg className={`w-4 h-4 text-ouro/70 shrink-0 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function StatusDot({ status }) {
  const cor = status === 'verde' ? 'bg-green-500' : status === 'amarela' ? 'bg-yellow-500' : 'bg-red-500';
  return <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${cor}`} aria-hidden="true" />;
}

// Celulas compartilhadas da tabela desktop (Genero ate o botao de excluir)
function PedidoCelulas({ p, preco, precoAvista, precoInfantil, onPagamento, onDelete }) {
  return (
    <>
      <td className="py-3 px-2 text-ouro/80">{p.genero}</td>
      <td className="py-3 px-2">
        <span className="bg-acai/30 text-acai-light text-xs font-bold px-2 py-1 rounded">{p.tamanho}</span>
      </td>
      <td className="py-3 px-2 text-ouro/80">R$ {Number(p.valor_camisa).toFixed(2)}</td>
      <td className="py-3 px-2"><PaymentBar percentual={Number(p.percentual_pago)} avista={Number(p.pagamento_avista) === 1} /></td>
      <td className="py-3 px-2 min-w-[320px]"><PaymentSelect pedido={p} preco={preco} precoAvista={precoAvista} precoInfantil={precoInfantil} onChange={onPagamento} /></td>
      <td className="py-3 px-2 text-ouro/80 font-medium">R$ {Number(p.valor_pago).toFixed(2)}</td>
      <td className="py-3 px-2 text-right">
        <button onClick={() => onDelete(p.id, p.nome)}
          className="text-red-400/60 hover:text-red-400 transition-colors" title="Excluir pedido">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </>
  );
}

// Sub-card de pedido compartilhado na visualizacao mobile
function PedidoCardMobile({ p, preco, precoAvista, precoInfantil, onPagamento, onDelete, indentado = false }) {
  return (
    <div className={`bg-[#1A0610]/40 rounded-lg p-3 space-y-2 ${indentado ? 'border-l-4 border-acai/70' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-ouro/60 text-xs">{p.genero}</span>
          <span className="bg-acai/30 text-acai-light text-xs font-bold px-2 py-0.5 rounded">{p.tamanho}</span>
        </div>
        <button onClick={() => onDelete(p.id, p.nome)}
          className="text-red-400/60 hover:text-red-400 p-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <PaymentBar percentual={Number(p.percentual_pago)} avista={Number(p.pagamento_avista) === 1} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PaymentSelect pedido={p} preco={preco} precoAvista={precoAvista} precoInfantil={precoInfantil} onChange={onPagamento} />
        <span className="text-ouro/80 text-xs font-medium">R$ {Number(p.valor_pago).toFixed(2)} / R$ {Number(p.valor_camisa).toFixed(2)}</span>
      </div>
    </div>
  );
}

function ResumoCards({ resumo }) {
  const tamanhoMap = {};
  resumo.por_tamanho.forEach(t => { tamanhoMap[t.tamanho] = t.total; });
  const generoMap = {};
  resumo.por_genero.forEach(g => { generoMap[g.genero] = g.total; });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card label="Total Pedidos" value={resumo.total_pedidos} color="text-ouro" />
      <Card label="Masculino" value={generoMap['Masculino'] || 0} color="text-acai-light" />
      <Card label="Feminino" value={generoMap['Feminino'] || 0} color="text-acai-light" />
      <Card label="Arrecadado" value={`R$ ${resumo.valor_arrecadado.toFixed(2)}`} color="text-folha" />
      <Card label="Pendente" value={`R$ ${resumo.valor_pendente.toFixed(2)}`} color="text-red-400" />
      <div className="bg-vinho-light/40 border border-ouro/15 rounded-xl p-3 col-span-2 sm:col-span-3 lg:col-span-1">
        <p className="text-ouro/50 text-[10px] font-medium uppercase mb-1">Tamanhos</p>
        <div className="flex flex-wrap gap-1">
          {[...TAMANHOS_ADULTO, ...TAMANHOS_INFANTIL].map(t => (
            <span key={t} className="text-[10px] bg-acai/20 text-acai-light px-1.5 py-0.5 rounded font-medium">
              {t}: {tamanhoMap[t] || 0}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, color }) {
  return (
    <div className="bg-vinho-light/40 border border-ouro/15 rounded-xl p-3">
      <p className="text-ouro/50 text-[10px] font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${color} mt-0.5`}>{value}</p>
    </div>
  );
}
