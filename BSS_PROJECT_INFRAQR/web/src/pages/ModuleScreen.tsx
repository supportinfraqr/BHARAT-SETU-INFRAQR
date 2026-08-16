import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPageData } from '../api/pages';
import './ModuleScreen.css';

// Normalize a key to a human-friendly header
function headerOf(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export default function ModuleScreen() {
  const { page } = useParams();
  const url = '/' + (page || '');
  const [rows, setRows] = useState<any[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPageData(url);
        if (data === null) {
          setError(`No data endpoint mapped for this page (${url}).`);
        } else {
          setRows(data);
          if (data.length > 0) setCols(Object.keys(data[0]));
        }
      } catch (e: any) {
        setError(e?.response?.data?.Message || e?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, [url]);

  return (
    <div className="module-page">
      <div className="module-header">
        <h2>{decodeURIComponent(page || '')}</h2>
        <button className="btn-primary" onClick={() => window.location.reload()}>Refresh</button>
      </div>

      {loading && <div className="module-loading">Loading...</div>}
      {error && <div className="module-error">{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="module-empty">No records found.</div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {cols.map((c) => <th key={c}>{headerOf(c)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c}>{row[c] != null ? String(row[c]) : '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 100 && <div className="module-note">Showing first 100 of {rows.length} records.</div>}
        </div>
      )}
    </div>
  );
}
