import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPreco, enviarPedidos, consultarPedidos, verificarNome, buscarNomes } from '../api';

// Datas do evento — editar aqui quando mudar
const DATA_INICIO_PEDIDOS = '27/09';
const DATA_FIM_PEDIDOS = '05/10';
const DATA_SEGUNDA_PARCELA = '30/10';

// Fallbacks usados apenas ate a API responder
const PRECO_PADRAO_PARCELADO = 35;
const PRECO_PADRAO_AVISTA = 30;

function formatarPreco(valor) {
  return valor.toFixed(2).replace('.', ',');
}

export default function PublicPage() {
  const [preco, setPreco] = useState(PRECO_PADRAO_PARCELADO);
  const [precoAvista, setPrecoAvista] = useState(PRECO_PADRAO_AVISTA);
  const [nome, setNome] = useState('');
  const [itens, setItens] = useState([{ genero: '', tamanho: '' }]);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [modoConsulta, setModoConsulta] = useState(false);
  const [nomeConsulta, setNomeConsulta] = useState('');
  const [resultadoConsulta, setResultadoConsulta] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erroConsulta, setErroConsulta] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    getPreco().then(data => {
      if (data && data.preco != null) setPreco(data.preco);
      if (data && data.preco_avista != null) setPrecoAvista(data.preco_avista);
    }).catch(() => {});
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMostrarSugestoes(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

    const nomeFormatado = nome.trim().toUpperCase();
    if (!nomeFormatado) { setErro('Por favor, preencha seu nome.'); return; }

    const palavras = nomeFormatado.split(/\s+/).filter(Boolean);
    if (palavras.length < 2) { setErro('Insira nome e sobrenome (ex: MARIA SILVA).'); return; }

    for (let i = 0; i < itens.length; i++) {
      if (!itens[i].genero) { setErro(`Selecione o g\u00eanero da camisa ${i + 1}.`); return; }
      if (!itens[i].tamanho) { setErro(`Selecione o tamanho da camisa ${i + 1}.`); return; }
    }

    setEnviando(true);
    try {
      const check = await verificarNome(nomeFormatado);
      if (check.existe) {
        setErro(`J\u00e1 existe um pedido para ${nomeFormatado}. Adicione mais um nome para diferenciar.`);
        setEnviando(false);
        return;
      }

      const pedidos = itens.map(item => ({
        nome: nomeFormatado,
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
      setErro('Erro de conex\u00e3o. Tente novamente.');
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

  function handleNomeConsultaChange(val) {
    const v = val.toUpperCase();
    setNomeConsulta(v);
    setResultadoConsulta(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) { setSugestoes([]); setMostrarSugestoes(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const nomes = await buscarNomes(v.trim());
        setSugestoes(nomes);
        setMostrarSugestoes(nomes.length > 0);
      } catch { setSugestoes([]); }
    }, 300);
  }

  async function selecionarNome(nome) {
    setNomeConsulta(nome);
    setMostrarSugestoes(false);
    setSugestoes([]);
    setErroConsulta('');
    setBuscando(true);
    try {
      const data = await consultarPedidos(nome);
      if (Array.isArray(data) && data.length > 0) {
        setResultadoConsulta({ nome, camisas: data });
      } else {
        setResultadoConsulta({ nome, camisas: [] });
      }
    } catch { setErroConsulta('Erro de conex\u00e3o.'); }
    finally { setBuscando(false); }
  }

  async function handleConsulta(e) {
    e.preventDefault();
    setErroConsulta('');
    setResultadoConsulta(null);
    setMostrarSugestoes(false);
    const n = nomeConsulta.trim().toUpperCase();
    if (!n) { setErroConsulta('Digite seu nome para consultar.'); return; }
    setBuscando(true);
    try {
      const data = await consultarPedidos(n);
      if (Array.isArray(data) && data.length > 0) {
        setResultadoConsulta({ nome: n, camisas: data });
      } else {
        setResultadoConsulta({ nome: n, camisas: [] });
      }
    } catch {
      setErroConsulta('Erro de conex\u00e3o.');
    } finally {
      setBuscando(false);
    }
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
            <div className="text-ouro/70 text-sm mb-6 space-y-1">
              <p>À vista: R$ {formatarPreco(precoAvista)} × {itens.length} = <span className="text-ouro-dark font-bold">R$ {formatarPreco(precoAvista * itens.length)}</span></p>
              <p>Parcelado: R$ {formatarPreco((preco * itens.length) / 2)} agora (50%) + R$ {formatarPreco((preco * itens.length) / 2)} no dia {DATA_SEGUNDA_PARCELA} (50%)</p>
              <p className="text-ouro/50 text-xs">= total de R$ {formatarPreco(preco * itens.length)} (R$ {formatarPreco(preco)} × {itens.length})</p>
            </div>
            {/* Chave Pix */}
            <div className="mb-6">
              <p className="text-ouro/70 text-xs font-medium mb-2">Chave Pix para pagamento:</p>
              <div className="relative">
                <span className="bg-[#1A0610] rounded-lg p-3 font-mono text-sm block focus:outline-none focus:ring-2 focus:ring-acai focus:border-transparent">78be269e-190e-4f21-8918-50b4dd589a91</span>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText('78be269e-190e-4f21-8918-50b4dd589a91');
                      setCopiado(true);
                      setTimeout(() => setCopiado(false), 2000);
                    } catch {
                      // Fallback for older browsers
                      const input = document.createElement('input');
                      input.value = '78be269e-190e-4f21-8918-50b4dd589a91';
                      document.body.appendChild(input);
                      input.select();
                      document.execCommand('copy');
                      document.body.removeChild(input);
                      setCopiado(true);
                      setTimeout(() => setCopiado(false), 2000);
                    }
                  }}
                  className="bg-acai hover:bg-acai-light text-white font-semibold py-3 px-8 rounded-full transition-all">
                  {copiado ? 'Copiado! ✓' : 'Copiar Chave Pix'}
                </button>
              </div>
              <p className="text-ouro/50 text-xs mt-3">Depois de pagar, envie o comprovante no grupo de avisos do WhatsApp.</p>
            </div>
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
          alt={'9\u00ba Fest A\u00e7a\u00ed da AD Marupa\u00faba 2026'}
          className="mx-auto w-64 sm:w-80 rounded-2xl shadow-2xl shadow-black/50"
        />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ouro mt-6 mb-1 tracking-tight">
          Pedido da Camisa Oficial
        </h1>
        <p className="text-ouro/50 text-sm">
          {'Igreja Assembleia de Deus \u2014 Campo Marupa\u00faba, Tom\u00e9-A\u00e7u, Par\u00e1'}
        </p>
        <div className="inline-block mt-4 border border-ouro-dark/60 rounded-full px-5 py-1.5">
          <span className="text-ouro-dark font-bold text-sm">R$ {formatarPreco(precoAvista)} à vista | R$ {formatarPreco(preco)} parcelado</span>
        </div>
      </header>

      {/* Informações do pedido */}
      <section className="px-4 pb-2 flex justify-center">
        <div className="max-w-xl w-full space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#2A0A16]/80 backdrop-blur border border-ouro/10 rounded-xl p-4 text-center">
              <p className="text-2xl leading-none">🏷️</p>
              <p className="text-ouro/60 text-xs font-medium mt-2 tracking-wide">VALOR DA CAMISA</p>
              <p className="text-ouro-dark font-extrabold text-lg mt-1">R$ {formatarPreco(preco)}</p>
              <p className="text-ouro/50 text-xs mt-1">no pagamento parcelado</p>
            </div>
            <div className="bg-[#2A0A16]/80 backdrop-blur border border-ouro/10 rounded-xl p-4 text-center">
              <p className="text-2xl leading-none">📅</p>
              <p className="text-ouro/60 text-xs font-medium mt-2 tracking-wide">PRAZO PARA PEDIDOS</p>
              <p className="text-ouro-dark font-extrabold text-lg mt-1">{DATA_INICIO_PEDIDOS} até {DATA_FIM_PEDIDOS}</p>
              <p className="text-ouro/50 text-xs mt-1">pedidos somente nesse período</p>
            </div>
            <div className="bg-[#2A0A16]/80 backdrop-blur border border-ouro/10 rounded-xl p-4 text-center">
              <p className="text-2xl leading-none">💳</p>
              <p className="text-ouro/60 text-xs font-medium mt-2 tracking-wide">PAGAMENTO</p>
              <p className="text-ouro-dark font-extrabold text-lg mt-1">50% + 50%</p>
              <p className="text-ouro/50 text-xs mt-1">50% no pedido da camisa e 50% no dia {DATA_SEGUNDA_PARCELA}</p>
            </div>
          </div>
          <div className="bg-[#2A0A16]/80 backdrop-blur border-2 border-ouro rounded-2xl p-5 text-center shadow-2xl shadow-ouro-dark/20">
            <p className="text-ouro font-extrabold text-lg sm:text-xl">💰 Pagou à vista? A camisa sai por R$ {formatarPreco(precoAvista)}!</p>
            <p className="text-ouro/50 text-xs mt-2">Desconto de R$ {formatarPreco(preco - precoAvista)} no pagamento à vista (100% no ato do pedido).</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-6 flex justify-center">
  <div className="max-w-xl w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-ouro/10">
    <img src="/camisa-mockup.png" alt="Camisa oficial - frente e costas" className="w-full h-auto" />
  </div>
</section>

{/* Passo a passo — Como fazer seu pedido */}
<section className="px-4 pb-6 flex justify-center">
  <div className="bg-[#2A0A16]/80 backdrop-blur border border-ouro/10 rounded-2xl p-5 sm:p-7 max-w-xl w-full shadow-2xl">
    <h3 className="text-ouro font-bold text-base mb-5 text-center">Como fazer seu pedido</h3>
    <ol className="space-y-4">
      <li className="flex gap-3 items-start">
        <span className="w-7 h-7 rounded-full bg-acai text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
        <div>
          <p className="text-ouro font-bold text-sm">Escolha sua camisa</p>
          <p className="text-ouro/60 text-xs mt-1">Preencha seu nome completo, escolha Masculino ou Feminino e o tamanho (PP, P, M, G ou GG). Quer mais de uma? Toque em "Adicionar outro tamanho/pedido".</p>
        </div>
      </li>
      <li className="flex gap-3 items-start">
        <span className="w-7 h-7 rounded-full bg-ouro-dark text-vinho font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
        <div>
          <p className="text-ouro font-bold text-sm">Envie o pedido</p>
          <p className="text-ouro/60 text-xs mt-1">Toque em "Enviar pedido". Você verá a confirmação com o valor e a chave Pix.</p>
        </div>
      </li>
      <li className="flex gap-3 items-start">
        <span className="w-7 h-7 rounded-full bg-acai text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
        <div>
          <p className="text-ouro font-bold text-sm">Pague pelo Pix</p>
          <p className="text-ouro/60 text-xs mt-1">À vista: R$ {formatarPreco(precoAvista)} por camisa. Parcelado: 50% (R$ {formatarPreco(preco / 2)}) agora e 50% (R$ {formatarPreco(preco / 2)}) no dia {DATA_SEGUNDA_PARCELA}, total de R$ {formatarPreco(preco)}.</p>
        </div>
      </li>
      <li className="flex gap-3 items-start">
        <span className="w-7 h-7 rounded-full bg-ouro-dark text-vinho font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
        <div>
          <p className="text-ouro font-bold text-sm">Envie o comprovante</p>
          <p className="text-ouro/60 text-xs mt-1">Entre no grupo de avisos do WhatsApp e envie o comprovante do Pix.</p>
        </div>
      </li>
      <li className="flex gap-3 items-start">
        <span className="w-7 h-7 rounded-full bg-acai text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">5</span>
        <div>
          <p className="text-ouro font-bold text-sm">Acompanhe seu pedido</p>
          <p className="text-ouro/60 text-xs mt-1">Toque em "Consultar meu pedido" e digite seu nome. O administrador confirma seu pagamento (50% ou 100%).</p>
        </div>
      </li>
    </ol>
  </div>
</section>

{/* Aviso do grupo WhatsApp (sempre visível) */}
<section className="px-4 pb-6 flex justify-center">
  <div className="bg-[#2A0A16]/80 backdrop-blur border border-ouro/10 rounded-2xl p-6 max-w-xl w-full text-center">
    <h3 className="text-ouro font-bold text-sm mb-3">📢 Acesse o grupo de avisos.</h3>
    <a href="https://chat.whatsapp.com/LOethvMGKHD4YMigUFdW1f"
       target="_blank"
       rel="noopener noreferrer"
       className="inline-block bg-acai text-white font-semibold py-3 px-8 rounded-full transition-all hover:bg-acai-light text-sm">
      Entrar no Grupo de Avisos
    </a>
    <p className="text-ouro/50 text-sm mt-4">Envie o comprovante de pagamento no grupo, caso tenha feito pelo Pix.</p>
  </div>
</section>

<div className="flex justify-center px-4 mb-4">
        <div className="flex bg-[#2A0A16]/60 rounded-full border border-ouro/10 p-1 max-w-xl w-full">
          <button onClick={() => setModoConsulta(false)}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${!modoConsulta ? 'bg-acai text-white' : 'text-ouro/50 hover:text-ouro/70'}`}>
            Fazer pedido
          </button>
          <button onClick={() => setModoConsulta(true)}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${modoConsulta ? 'bg-acai text-white' : 'text-ouro/50 hover:text-ouro/70'}`}>
            Consultar meu pedido
          </button>
        </div>
      </div>

      <main className="flex-1 flex items-start justify-center px-4 pb-8">
        {!modoConsulta ? (
          <div className="bg-[#2A0A16]/80 backdrop-blur border border-ouro/10 rounded-2xl p-5 sm:p-7 max-w-xl w-full shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-ouro-dark font-bold text-sm mb-2">Nome completo</label>
                <input type="text" value={nome}
                  onChange={e => setNome(e.target.value.toUpperCase())}
                  placeholder="SEU NOME E SOBRENOME"
                  className="w-full px-4 py-3 bg-[#1A0610] border border-ouro/10 rounded-xl text-ouro text-sm uppercase focus:outline-none focus:ring-2 focus:ring-acai focus:border-transparent placeholder:text-ouro/30" />
              </div>

              {itens.map((item, idx) => (
                <div key={idx} className="bg-[#1A0610]/60 border border-ouro/8 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-ouro font-bold text-sm">Camisa {itens.length > 1 ? idx + 1 : 1}</span>
                    {itens.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)}
                        className="text-red-400/70 hover:text-red-400 text-xs font-medium transition-colors">Remover</button>
                    )}
                  </div>
                  <div>
                    <label className="block text-ouro/60 text-xs font-medium mb-2">{'\u0047\u00eanero'}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Masculino', 'Feminino'].map(g => (
                        <button key={g} type="button" onClick={() => updateItem(idx, 'genero', g)}
                          className={`py-2.5 rounded-full text-sm font-medium transition-all ${
                            item.genero === g ? 'bg-acai text-white shadow-lg shadow-acai/30'
                              : 'bg-[#2A0A16] text-ouro/50 border border-ouro/10 hover:border-ouro/25'}`}>
                          {g.toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-ouro/60 text-xs font-medium mb-2">Tamanho</label>
                    <div className="flex gap-2">
                      {['PP', 'P', 'M', 'G', 'GG'].map(t => (
                        <button key={t} type="button" onClick={() => updateItem(idx, 'tamanho', t)}
                          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            item.tamanho === t ? 'bg-ouro-dark text-vinho shadow-lg shadow-ouro-dark/30'
                              : 'bg-[#2A0A16] text-ouro/50 border border-ouro/10 hover:border-ouro/25'}`}>
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
                <div className="bg-red-500/15 border border-red-400/20 text-red-300 text-sm px-4 py-3 rounded-xl text-center">{erro}</div>
              )}

              <button type="submit" disabled={enviando}
                className="w-full py-3.5 rounded-full font-bold text-base text-white transition-all shadow-lg shadow-acai/30 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #9B4CAE 0%, #7B2C8E 50%, #5A1C6E 100%)' }}>
                {enviando ? 'Enviando...' : 'Enviar pedido'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-[#2A0A16]/80 backdrop-blur border border-ouro/10 rounded-2xl p-5 sm:p-7 max-w-xl w-full shadow-2xl">
            <form onSubmit={handleConsulta} className="space-y-4">
              <div className="relative" ref={dropdownRef}>
                <label className="block text-ouro-dark font-bold text-sm mb-2">Digite seu nome</label>
                <input type="text" value={nomeConsulta}
                  onChange={e => handleNomeConsultaChange(e.target.value)}
                  onFocus={() => { if (sugestoes.length > 0) setMostrarSugestoes(true); }}
                  placeholder="COMECE A DIGITAR SEU NOME..."
                  className="w-full px-4 py-3 bg-[#1A0610] border border-ouro/10 rounded-xl text-ouro text-sm uppercase focus:outline-none focus:ring-2 focus:ring-acai focus:border-transparent placeholder:text-ouro/30" />
                {mostrarSugestoes && sugestoes.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-[#2A0A16] border border-ouro/20 rounded-xl shadow-2xl overflow-hidden">
                    {sugestoes.map((s, i) => (
                      <button key={i} type="button"
                        onClick={() => selecionarNome(s)}
                        className="w-full text-left px-4 py-3 text-ouro text-sm hover:bg-acai/20 transition-colors border-b border-ouro/5 last:border-b-0">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {erroConsulta && (
                <div className="bg-red-500/15 border border-red-400/20 text-red-300 text-sm px-4 py-3 rounded-xl text-center">{erroConsulta}</div>
              )}
              <button type="submit" disabled={buscando}
                className="w-full py-3 rounded-full font-bold text-sm text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #9B4CAE 0%, #7B2C8E 50%, #5A1C6E 100%)' }}>
                {buscando ? 'Buscando...' : 'Consultar'}
              </button>
            </form>

            {resultadoConsulta && (
              <div className="mt-6">
                {resultadoConsulta.camisas.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-ouro font-bold text-lg">{resultadoConsulta.nome}</p>
                      <p className="text-ouro/50 text-xs">{resultadoConsulta.camisas.length} camisa{resultadoConsulta.camisas.length > 1 ? 's' : ''}</p>
                    </div>
                    {resultadoConsulta.camisas.map((c, i) => (
                      <div key={i} className="bg-[#1A0610]/60 border border-ouro/8 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-ouro/70 text-xs">{c.genero}</span>
                            <span className="bg-acai/30 text-acai-light text-xs font-bold px-2 py-0.5 rounded">{c.tamanho}</span>
                          </div>
                          <span className="text-ouro/60 text-xs">R$ {Number(c.valor_camisa).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <StatusBar percentual={Number(c.percentual_pago)} valorPago={Number(c.valor_pago)} valorTotal={Number(c.valor_camisa)} avista={Number(c.pagamento_avista) === 1} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-ouro/40 text-sm">
                    Nenhum pedido encontrado para <span className="font-bold text-ouro/60">{resultadoConsulta.nome}</span>.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function StatusBar({ percentual, valorPago, valorTotal, avista }) {
  const width = percentual === 100 ? '100%' : percentual === 50 ? '50%' : '5%';
  const color = percentual === 100 ? 'bg-green-500' : percentual === 50 ? 'bg-yellow-500' : 'bg-red-500';
  const label = percentual === 100 ? (avista ? 'Pago (à vista)' : 'Pago') : percentual === 50 ? '50% Pago' : 'Pendente';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${percentual === 100 ? 'text-green-400' : percentual === 50 ? 'text-yellow-400' : 'text-red-400'}`}>
          {label}
        </span>
        <span className="text-ouro/50 text-xs">R$ {valorPago.toFixed(2).replace('.', ',')} / R$ {valorTotal.toFixed(2).replace('.', ',')}</span>
      </div>
      <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden border border-ouro/10">
        <div className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width, minWidth: percentual === 0 ? '8px' : undefined }} />
      </div>
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
