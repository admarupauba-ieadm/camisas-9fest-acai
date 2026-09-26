import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPreco, enviarPedidos } from '../api';

export default function PublicPage() {
  const [preco, setPreco] = useState(35);
  const [nome, setNome] = useState('');
  const [itens, setItens] = useState([{ genero: '', tamanho: '' }]);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    getPreco().then(data => { if (data && data.preco != null) setPreco(data.preco); }).catch(() => {});
  }, []);

  function addItem() {
    setItens([...itens, { genero: '', tamanho: '' }]);
  }

  function removeItem(idx) {
    if (itens.length <= 1) return;
    setItens(itens.filter((_, i) => i !== idx));
  }

  function updateItem(idx, field, value) {
    const updated = [...itens];
    updated[idx] = { ...updated[idx], [field]: value };
    setItens(updated);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    if (!nome.trim()) { setErro('Por favor, preencha seu nome.'); return; }
    for (let i = 0; i < itens.length; i++) {
      if (!itens[i].genero) { setErro(`Selecione o g\u00eanero da camisa ${i + 1}.`); return; }
      if (!itens[i].tamanho) { setErro(`Selecione o tamanho da camisa ${i + 1}.`); return; }
    }

    setEnviando(true);
    try {
      const pedidos = itens.map(item => ({
        nome: nome.trim(),
        genero: item.genero,
        tamanho: item.tamanho
      }));
      const result = await enviarPedidos(pedidos);
      if (result.success) {
        setEnviado(true);
      } else {
        setErro(result.error || 'Erro ao enviar pedido.');
      }
    } catch {
      setErro('Erro de conex\u00E3o. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  function novoPedido() {
    setNome('');
    setItens([{ genero: '', tamanho: '' }]);
    setEnviado(false);
    setErro('');
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-vinho flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="bg-[#2A0A16]/80 backdrop-blur border border-ouro/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-folha/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-folha" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-ouro mb-3">Pedido Enviado!</h2>
            <p className="text-ouro/80 mb-2">
              {itens.length === 1
                ? 'Sua camisa foi registrada com sucesso.'
                : `Suas ${itens.length} camisas foram registradas com sucesso.`
              }
            </p>
            <p className="text-ouro/50 text-sm mb-6">
              Valor total: R$ {(preco * itens.length).toFixed(2).replace('.', ',')}
            </p>
            <button onClick={novoPedido}
              className="bg-acai hover:bg-acai-light text-white font-semibold py-3 px-8 rounded-full transition-all">
              Fazer novo pedido
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #3A0F1E 0%, #2A0818 40%, #1E0610 100%)' }}>

      <header className="text-center pt-10 pb-4 px-4">
        <img
          src="/logo-festival.jpg"
          alt={'9\u00ba Fest A\u00e7a\u00ed da AD Marupauba 2026'}
          className="mx-auto w-64 sm:w-80 rounded-2xl shadow-2xl shadow-black/50"
        />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ouro mt-6 mb-1 tracking-tight">
          Pedido da Camisa Oficial
        </h1>
        <p className="text-ouro/50 text-sm">
          {'Igreja Assembleia de Deus \u2014 Campo Marupa\u00faba, Tom\u00e9-A\u00e7u, Par\u00e1'}
        </p>
        <div className="inline-block mt-4 border border-ouro-dark/60 rounded-full px-5 py-1.5">
          <span className="text-ouro-dark font-bold text-sm">R$ {preco.toFixed(2).replace('.', ',')} por camisa</span>
        </div>
      </header>

      <section className="px-4 py-6 flex justify-center">
        <div className="max-w-xl w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-ouro/10">
          <img
            src="/camisa-mockup.png"
            alt="Camisa oficial - frente e costas"
            className="w-full h-auto"
          />
        </div>
      </section>

      <main className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="bg-[#2A0A16]/80 backdrop-blur border border-ouro/10 rounded-2xl p-5 sm:p-7 max-w-xl w-full shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-ouro-dark font-bold text-sm mb-2">Nome completo</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full px-4 py-3 bg-[#1A0610] border border-ouro/10 rounded-xl text-ouro text-sm focus:outline-none focus:ring-2 focus:ring-acai focus:border-transparent placeholder:text-ouro/30"
              />
            </div>

            {itens.map((item, idx) => (
              <div key={idx} className="bg-[#1A0610]/60 border border-ouro/8 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-ouro font-bold text-sm">
                    Camisa {itens.length > 1 ? idx + 1 : 1}
                  </span>
                  {itens.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)}
                      className="text-red-400/70 hover:text-red-400 text-xs font-medium transition-colors">
                      Remover
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-ouro/60 text-xs font-medium mb-2">{'G\u00eanero'}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Masculino', 'Feminino'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => updateItem(idx, 'genero', g)}
                        className={`py-2.5 rounded-full text-sm font-medium transition-all ${
                          item.genero === g
                            ? 'bg-acai text-white shadow-lg shadow-acai/30'
                            : 'bg-[#2A0A16] text-ouro/50 border border-ouro/10 hover:border-ouro/25'
                        }`}
                      >
                        {g.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-ouro/60 text-xs font-medium mb-2">Tamanho</label>
                  <div className="flex gap-2">
                    {['PP', 'P', 'M', 'G', 'GG'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateItem(idx, 'tamanho', t)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                          item.tamanho === t
                            ? 'bg-ouro-dark text-vinho shadow-lg shadow-ouro-dark/30'
                            : 'bg-[#2A0A16] text-ouro/50 border border-ouro/10 hover:border-ouro/25'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={addItem}
              className="w-full py-3 bg-ouro-dark/90 hover:bg-ouro-dark text-vinho font-bold text-sm rounded-full transition-all shadow-lg shadow-ouro-dark/20">
              + Adicionar outro tamanho/pedido
            </button>

            <div className="text-center text-ouro/70 text-sm py-1">
              Total: <span className="text-ouro-dark font-bold text-base">R$ {(preco * itens.length).toFixed(2).replace('.', ',')}</span>
            </div>

            {erro && (
              <div className="bg-red-500/15 border border-red-400/20 text-red-300 text-sm px-4 py-3 rounded-xl text-center">
                {erro}
              </div>
            )}

            <button type="submit" disabled={enviando}
              className="w-full py-3.5 rounded-full font-bold text-base text-white transition-all shadow-lg shadow-acai/30 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #9B4CAE 0%, #7B2C8E 50%, #5A1C6E 100%)' }}>
              {enviando ? 'Enviando...' : 'Enviar pedido'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="text-center py-6 px-4 border-t border-ouro/5">
      <p className="text-ouro/30 text-xs mb-2">
        {'9\u00ba Fest A\u00e7a\u00ed da AD Marupa\u00faba 2026'}
      </p>
      <Link to="/admin/login"
        className="text-ouro/25 hover:text-ouro/50 text-xs underline transition-colors">
        {'\u00c1rea do Administrador'}
      </Link>
    </footer>
  );
}
