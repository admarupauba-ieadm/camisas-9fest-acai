import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPedidos, getResumo, atualizarPagamento, deletarPedido, baixarPDF } from '../api';
import { AcaiBerry } from '../components/Decorations';

function agruparPorNome(pedidos) {
  const map = new Map();
  pedidos.forEach(p => {
    if (!map.has(p.nome)) map.set(p.nome, []);
    map.get(p.nome).push(p);
  });
  return Array.from(map.entries()).map(([nome, camisas]) => ({ nome, camisas }));
}

export default function AdminPage() {
  const [pedidos, setPedidos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [baixandoPdf, setBaixandoPdf] = useState(false);
  const navigate = useNavigate();

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

  async function handlePagamento(id, percentual) {
    await atualizarPagamento(id, percentual);
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
                {grupos.map(grupo => (
                  grupo.camisas.map((p, idx) => (
                    <tr key={p.id} className={`hover:bg-ouro/5 transition-colors ${idx === grupo.camisas.length - 1 ? 'border-b-2 border-ouro/15' : 'border-b border-ouro/5'}`}>
                      {idx === 0 ? (
                        <td className="py-3 px-2 text-ouro align-top" rowSpan={grupo.camisas.length}>
                          <span className="font-semibold">{grupo.nome}</span>
                          {grupo.camisas.length > 1 && (
                            <span className="block text-ouro/40 text-[10px] mt-0.5">{grupo.camisas.length} camisas</span>
                          )}
                        </td>
                      ) : null}
                      <td className="py-3 px-2 text-ouro/80">{p.genero}</td>
                      <td className="py-3 px-2">
                        <span className="bg-acai/30 text-acai-light text-xs font-bold px-2 py-1 rounded">{p.tamanho}</span>
                      </td>
                      <td className="py-3 px-2 text-ouro/80">R$ {Number(p.valor_camisa).toFixed(2)}</td>
                      <td className="py-3 px-2"><PaymentBar percentual={Number(p.percentual_pago)} /></td>
                      <td className="py-3 px-2"><PaymentSelect pedido={p} onChange={handlePagamento} /></td>
                      <td className="py-3 px-2 text-ouro/80 font-medium">R$ {Number(p.valor_pago).toFixed(2)}</td>
                      <td className="py-3 px-2 text-right">
                        <button onClick={() => handleDelete(p.id, p.nome)}
                          className="text-red-400/60 hover:text-red-400 transition-colors" title="Excluir pedido">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-4">
            {grupos.map(grupo => (
              <div key={grupo.nome} className="bg-vinho/40 border border-ouro/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-ouro font-bold">{grupo.nome}</p>
                    <p className="text-ouro/40 text-xs">{grupo.camisas.length} camisa{grupo.camisas.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                {grupo.camisas.map(p => (
                  <div key={p.id} className="bg-[#1A0610]/40 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-ouro/60 text-xs">{p.genero}</span>
                        <span className="bg-acai/30 text-acai-light text-xs font-bold px-2 py-0.5 rounded">{p.tamanho}</span>
                      </div>
                      <button onClick={() => handleDelete(p.id, p.nome)}
                        className="text-red-400/60 hover:text-red-400 p-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <PaymentBar percentual={Number(p.percentual_pago)} />
                    <div className="flex items-center justify-between">
                      <PaymentSelect pedido={p} onChange={handlePagamento} />
                      <span className="text-ouro/80 text-xs font-medium">R$ {Number(p.valor_pago).toFixed(2)} / R$ {Number(p.valor_camisa).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
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

function PaymentBar({ percentual }) {
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
    </div>
  );
}

function PaymentSelect({ pedido, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[
        { val: 0, label: 'Pendente', color: 'bg-red-500/20 text-red-400 border-red-500/30', active: 'bg-red-500 text-white border-red-500' },
        { val: 50, label: '50%', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', active: 'bg-yellow-500 text-white border-yellow-500' },
        { val: 100, label: '100%', color: 'bg-green-500/20 text-green-400 border-green-500/30', active: 'bg-green-500 text-white border-green-500' },
      ].map(opt => (
        <button key={opt.val}
          onClick={() => onChange(pedido.id, opt.val)}
          className={`text-xs font-medium px-2 py-1 rounded border transition-all ${
            Number(pedido.percentual_pago) === opt.val ? opt.active : opt.color + ' hover:opacity-80'
          }`}>
          {opt.label}
        </button>
      ))}
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
          {['PP', 'P', 'M', 'G', 'GG'].map(t => (
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
