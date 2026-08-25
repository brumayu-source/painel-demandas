import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // { kind: 'wait'|'ok'|'err', msg }
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setSending(true);
    setStatus({ kind: 'wait', msg: 'Enviando link…' });
    const { error } = await signInWithEmail(value);
    setSending(false);
    if (error) {
      setStatus({ kind: 'err', msg: 'Não foi possível enviar o link: ' + error.message });
    } else {
      setStatus({ kind: 'ok', msg: `Link enviado para ${value}. Confira sua caixa de entrada (e o spam).` });
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <div className="mark">PD</div>
          <div className="name">Painel de Demandas</div>
        </div>
        <h1>Entrar</h1>
        <p className="sub">Digite seu e-mail e enviamos um link de acesso — sem senha.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="voce@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? 'Enviando…' : 'Enviar link de acesso'}
          </button>
        </form>
        {status && <div className={`login-status ${status.kind}`}>{status.msg}</div>}
      </div>
    </div>
  );
}
