import { useAuth } from '../context/AuthContext.jsx';
import { IconSearch } from './icons.jsx';

const TITLES = { board: 'Quadro', list: 'Lista', overview: 'Painel geral', admin: 'Administração' };

export default function Topbar({ view, search, setSearch }) {
  const { canWrite } = useAuth();
  return (
    <div id="topbar">
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
