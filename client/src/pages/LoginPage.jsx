import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { AcaiBerry } from '../components/Decorations';

export default function LoginPage() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (!senha) { setErro('Digite a senha.'); return; }

    setLoading(true);
    try {
      const data = await login(senha);
      localStorage.setItem('admin_token', data.token);
      navigate('/admin');
    } catch (err) {
      setErro(err.message || 'Senha incorreta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-vinho flex items-center justify-center px-4">
      <div className="bg-vinho-light/50 backdrop-blur border border-ouro/20 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <AcaiBerry className="w-8 h-8" />
            <h1 className="text-xl font-bold text-ouro">Area Administrativa</h1>
            <AcaiBerry className="w-8 h-8" />
          </div>
          <p className="text-ouro/50 text-sm">9&#186; Fest Acai da AD Marupauba</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-ouro/70 text-sm font-medium mb-1.5">Senha do administrador</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="Digite a senha"
              className="w-full px-4 py-3 bg-white/95 border border-ouro/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-acai" />
          </div>

          {erro && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-300 text-sm px-4 py-3 rounded-xl">
              {erro}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-acai hover:bg-acai-light disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <a href="/" className="block text-center text-ouro/40 hover:text-ouro/60 text-xs mt-4 transition-colors">
            Voltar para a pagina inicial
          </a>
        </form>
      </div>
    </div>
  );
}
