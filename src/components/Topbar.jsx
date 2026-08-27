import { useAuth } from '../context/AuthContext.jsx';
import { IconSearch, IconMenu } from './icons.jsx';

const TITLES = { board: 'Quadro', list: 'Lista', overview: 'Painel geral', admin: 'Administração' };

export default function Topbar({ view, search, setSearch, onMenuClick }) {
  const { canWrite } = useAuth();
  return (
    <div id="topbar">
      <button className="menu-btn" onClick={onMenuClick} aria-label="Abrir menu">
        <IconMenu />
      </button>
      <h1>{TITLES[view] || ''}</h1>
      {!canWrite && <span className="readonly-pill">Somente visualização</span>}
      {view !== 'admin' && (
        <div className="search-box">
          <IconSearch />
          <input type="text" placeholder="Buscar demandas…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}
    </div>
  );
}
