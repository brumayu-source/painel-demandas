import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null); // { kind: 'err', msg }
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const emailValue = email.trim();
    if (!emailValue || !password) return;
    setSending(true);
    setStatus(null);
    const { error } = await signInWithPassword(emailValue, password);
    setSending(false);
    if (error) {
      const msg =
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar: ' + error.message;
      setStatus({ kind: 'err', msg });
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <img src="/logo-ume.png" alt="umê" className="login-logo" />
        </div>
        <p className="login-eyebrow">painel de demandas</p>
        <h1>Entrar</h1>
        <p className="sub">Digite seu e-mail e senha de acesso.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="voce@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            required
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        {status && <div className={`login-status ${status.kind}`}>{status.msg}</div>}
        <p className="login-hint">Não tem acesso? Peça pro administrador criar sua conta.</p>
      </div>
    </div>
  );
}
