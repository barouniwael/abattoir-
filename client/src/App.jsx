import { useEffect, useMemo, useState } from 'react';

const speciesOptions = ['ovin', 'caprin', 'bovin'];
const organOptions = ['tete', 'coeur', 'viscere', 'foie', 'poumon', 'viande'];
const causesByOrgan = {
  tete: ['Tuberculose', 'Autre'],
  coeur: ['Tuberculose', 'Autre'],
  viscere: ['Tuberculose', 'Autre'],
  foie: ['Kyste hydatique', 'Parasite', 'Tuberculose', 'Fasciolose'],
  poumon: ['Kyste hydatique', 'Parasite', 'Tuberculose', 'Pneumonie', 'Autre'],
  viande: []
};

const today = new Date();
const currentMonth = today.toISOString().slice(0, 7);
const currentDate = today.toISOString().slice(0, 10);

export default function App() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState({ abattage: [], seizures: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [abattageForm, setAbattageForm] = useState({ date: currentDate, species: 'ovin', number: '', weight: '' });
  const [seizureForm, setSeizureForm] = useState({
    date: currentDate,
    species: 'ovin',
    organ: 'tete',
    cause: 'Tuberculose',
    number: ''
  });

  const fetchMonth = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/month/${month}`);
      if (!res.ok) throw new Error('Chargement impossible');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const summary = useMemo(() => {
    const bySpecies = speciesOptions.map((s) => ({ species: s, abattus: 0, poids: 0, saisies: 0 }));
    const total = { abattus: 0, poids: 0, saisies: 0 };
    data.abattage.forEach((r) => {
      const target = bySpecies.find((x) => x.species === r.species);
      if (target) {
        target.abattus += r.total_number;
        target.poids += r.total_weight;
      }
      total.abattus += r.total_number;
      total.poids += r.total_weight;
    });
    data.seizures.forEach((r) => {
      const target = bySpecies.find((x) => x.species === r.species);
      if (target) target.saisies += r.total_number;
      total.saisies += r.total_number;
    });
    return { bySpecies, total };
  }, [data]);

  const groupedByDate = useMemo(() => {
    const map = {};
    data.abattage.forEach((r) => {
      map[r.date] = map[r.date] || { abattage: [], seizures: [] };
      map[r.date].abattage.push(r);
    });
    data.seizures.forEach((r) => {
      map[r.date] = map[r.date] || { abattage: [], seizures: [] };
      map[r.date].seizures.push(r);
    });
    const dates = Object.keys(map).sort((a, b) => (a > b ? -1 : 1));
    return dates.map((d) => ({ date: d, ...map[d] }));
  }, [data]);

  const onSubmitAbattage = async (e) => {
    e.preventDefault();
    setError('');
    const num = Number(abattageForm.number);
    const poids = Number(abattageForm.weight);
    if (!Number.isFinite(num) || num <= 0 || !Number.isFinite(poids) || poids <= 0) {
      setError('Nombre et poids doivent être positifs.');
      return;
    }
    try {
      const payload = {
        ...abattageForm,
        number: num,
        weight: poids
      };
      const res = await fetch('/api/abattage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Enregistrement abattage refusé');
      setModal(null);
      setAbattageForm({ ...abattageForm, number: '', weight: '' });
      fetchMonth();
    } catch (err) {
      setError(err.message);
    }
  };

  const onSubmitSeizure = async (e) => {
    e.preventDefault();
    setError('');
    const num = Number(seizureForm.number);
    if (!Number.isFinite(num) || num <= 0) {
      setError('Nombre doit être positif.');
      return;
    }
    try {
      const payload = {
        ...seizureForm,
        number: num
      };
      const res = await fetch('/api/seizures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Enregistrement saisie refusé');
      setModal(null);
      setSeizureForm({ ...seizureForm, number: '', cause: payload.organ === 'viande' ? '' : seizureForm.cause });
      fetchMonth();
    } catch (err) {
      setError(err.message);
    }
  };

  const exportLinks = [
    { label: 'Abattage CSV', href: `/api/export/${month}/abattage.csv` },
    { label: 'Saisies CSV', href: `/api/export/${month}/saisies.csv` },
    { label: 'PDF', href: `/api/export/${month}/report.pdf` }
  ];

  const causes = seizureForm.organ === 'viande' ? [] : causesByOrgan[seizureForm.organ];

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Abattoir Tracker</p>
          <h1>Tableau de bord</h1>
        </div>
        <div className="month-picker">
          <label>Mois</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      </header>

      <section className="exports">
        {exportLinks.map((link) => (
          <a key={link.href} className="pill" href={link.href}>
            {link.label}
          </a>
        ))}
      </section>

      {error && <div className="error">{error}</div>}
      {loading && <div className="info">Chargement...</div>}

      <section className="summary">
        {summary.bySpecies.map((item) => (
          <div className="card" key={item.species}>
            <div className="card-head">
              <span className="tag">{item.species}</span>
              <span className="muted">{month}</span>
            </div>
            <p className="stat">{item.abattus} abattus</p>
            <p className="stat">{item.poids.toFixed(2)} kg</p>
            <p className="stat small">{item.saisies} saisies</p>
          </div>
        ))}
        <div className="card highlight">
          <div className="card-head">
            <span className="tag">Total</span>
            <span className="muted">{month}</span>
          </div>
          <p className="stat">{summary.total.abattus} abattus</p>
          <p className="stat">{summary.total.poids.toFixed(2)} kg</p>
          <p className="stat small">{summary.total.saisies} saisies</p>
        </div>
      </section>

      <section className="actions">
        <button className="action-btn" onClick={() => setModal('abattage')}>+ Abattage</button>
        <button className="action-btn secondary" onClick={() => setModal('seizure')}>+ Saisie</button>
      </section>

      <section className="daily">
        <h2>Par jour</h2>
        {groupedByDate.length === 0 && <p className="muted">Aucune donnée ce mois.</p>}
        {groupedByDate.map((day) => (
          <div className="card" key={day.date}>
            <div className="card-head">
              <strong>{day.date}</strong>
              <span className="muted">{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long' })}</span>
            </div>
            <div className="daily-section">
              <p className="muted">Abattage</p>
              {day.abattage.length === 0 && <p className="small muted">Aucun</p>}
              {day.abattage.map((item) => (
                <div className="row" key={item.species}>
                  <span className="tag small">{item.species}</span>
                  <span>{item.total_number} têtes</span>
                  <span>{item.total_weight} kg</span>
                </div>
              ))}
            </div>
            <div className="daily-section">
              <p className="muted">Saisies</p>
              {day.seizures.length === 0 && <p className="small muted">Aucune</p>}
              {day.seizures.map((item) => (
                <div className="row" key={`${item.species}-${item.organ}-${item.cause}`}>
                  <span className="tag small">{item.species}</span>
                  <span>{item.organ}</span>
                  <span className="muted small">{item.cause}</span>
                  <span>{item.total_number}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {modal === 'abattage' && (
        <Modal title="Nouvel abattage" onClose={() => setModal(null)}>
          <form className="form" onSubmit={onSubmitAbattage}>
            <label>
              Date
              <input type="date" value={abattageForm.date} onChange={(e) => setAbattageForm({ ...abattageForm, date: e.target.value })} required />
            </label>
            <label>
              Espèce
              <select value={abattageForm.species} onChange={(e) => setAbattageForm({ ...abattageForm, species: e.target.value })}>
                {speciesOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Nombre
              <input type="number" min="1" value={abattageForm.number} onChange={(e) => setAbattageForm({ ...abattageForm, number: e.target.value })} required />
            </label>
            <label>
              Poids (kg)
              <input type="number" min="0" step="0.01" value={abattageForm.weight} onChange={(e) => setAbattageForm({ ...abattageForm, weight: e.target.value })} required />
            </label>
            <button className="action-btn" type="submit">Enregistrer</button>
          </form>
        </Modal>
      )}

      {modal === 'seizure' && (
        <Modal title="Nouvelle saisie" onClose={() => setModal(null)}>
          <form className="form" onSubmit={onSubmitSeizure}>
            <label>
              Date
              <input type="date" value={seizureForm.date} onChange={(e) => setSeizureForm({ ...seizureForm, date: e.target.value })} required />
            </label>
            <label>
              Espèce
              <select value={seizureForm.species} onChange={(e) => setSeizureForm({ ...seizureForm, species: e.target.value })}>
                {speciesOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Organe
              <select
                value={seizureForm.organ}
                onChange={(e) => {
                  const organ = e.target.value;
                  setSeizureForm((prev) => ({ ...prev, organ, cause: organ === 'viande' ? '' : causesByOrgan[organ][0] }));
                }}
              >
                {organOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
            {seizureForm.organ === 'viande' ? (
              <label>
                Cause (texte)
                <input type="text" value={seizureForm.cause} onChange={(e) => setSeizureForm({ ...seizureForm, cause: e.target.value })} required />
              </label>
            ) : (
              <label>
                Cause
                <select value={seizureForm.cause} onChange={(e) => setSeizureForm({ ...seizureForm, cause: e.target.value })}>
                  {causes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Nombre
              <input type="number" min="1" value={seizureForm.number} onChange={(e) => setSeizureForm({ ...seizureForm, number: e.target.value })} required />
            </label>
            <button className="action-btn" type="submit">Enregistrer</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
