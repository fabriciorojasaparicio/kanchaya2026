'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

type Characteristic = { id: string; name: string; isActive: boolean };

function messageFrom(payload: unknown, fallback: string) {
  if (typeof payload !== 'object' || payload === null || !('message' in payload)) return fallback;
  return typeof payload.message === 'string' ? payload.message : fallback;
}

export function CourtCharacteristicsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Characteristic[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/court-characteristics', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) { router.replace('/login'); return null; }
        if (response.status === 403) { router.replace('/access-denied'); return null; }
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(messageFrom(payload, 'No pudimos cargar las características.'));
        if (!payload || typeof payload !== 'object' || !('characteristics' in payload) || !Array.isArray(payload.characteristics)) {
          throw new Error('Recibimos una respuesta incompleta. Inténtalo de nuevo.');
        }
        return payload.characteristics as Characteristic[];
      })
      .then((result) => {
        if (!cancelled && result) {
          setItems(result);
          setNames(Object.fromEntries(result.map((item) => [item.id, item.name])));
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'No pudimos conectar con KanchaYA.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  async function addCharacteristic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingId('new');
    try {
      const response = await fetch('/api/auth/court-characteristics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }),
      });
      const payload: unknown = await response.json();
      if (response.status === 401) { router.replace('/login'); return; }
      if (response.status === 403) { router.replace('/access-denied'); return; }
      if (!response.ok) throw new Error(messageFrom(payload, 'No pudimos guardar la característica.'));
      const item = payload as Characteristic;
      setItems((current) => [...current, item].sort((left, right) => left.name.localeCompare(right.name, 'es')));
      setNames((current) => ({ ...current, [item.id]: item.name }));
      setNewName('');
      setNotice('Característica añadida al catálogo.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos conectar con KanchaYA.');
    } finally { setSavingId(''); }
  }

  async function saveCharacteristic(item: Characteristic, isActive = item.isActive) {
    setError('');
    setNotice('');
    setSavingId(item.id);
    try {
      const response = await fetch(`/api/auth/court-characteristics/${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: names[item.id], isActive }),
      });
      const payload: unknown = await response.json();
      if (response.status === 401) { router.replace('/login'); return; }
      if (response.status === 403) { router.replace('/access-denied'); return; }
      if (!response.ok) throw new Error(messageFrom(payload, 'No pudimos actualizar la característica.'));
      const updated = payload as Characteristic;
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry)
        .sort((left, right) => left.name.localeCompare(right.name, 'es')));
      setNames((current) => ({ ...current, [updated.id]: updated.name }));
      setNotice('Catálogo actualizado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos conectar con KanchaYA.');
    } finally { setSavingId(''); }
  }

  return (
    <div className="characteristics-management">
      <Link className="management-back-link" href="/profile">← Volver a mi perfil</Link>
      {notice && <p aria-live="polite" className="form-message form-success" role="status">{notice}</p>}
      {error && <p aria-live="polite" className="form-message form-error" role="alert">{error}</p>}

      <section aria-labelledby="new-characteristic-title" className="court-form-panel">
        <p className="court-panel-overline">Catálogo KanchaYA</p>
        <h2 id="new-characteristic-title">Características disponibles</h2>
        <p className="characteristics-intro">Administra las etiquetas que los centros pueden usar para describir sus canchas. Las etiquetas archivadas se conservan en las canchas que ya las usan.</p>
        <form className="characteristic-create-form" onSubmit={addCharacteristic}>
          <div className="field">
            <label htmlFor="new-characteristic">Nueva característica</label>
            <input id="new-characteristic" maxLength={40} minLength={2} onChange={(event) => setNewName(event.target.value)} placeholder="Ej. Techado, Estacionamiento" required value={newName} />
          </div>
          <button className="primary-button" disabled={savingId === 'new'} type="submit">{savingId === 'new' ? 'Añadiendo…' : 'Añadir etiqueta'}</button>
        </form>
      </section>

      <section aria-label="Catálogo de etiquetas" className="characteristics-list-section">
        {isLoading ? <p aria-live="polite" className="loading-line">Cargando características…</p> : items.length === 0 ? (
          <div className="court-list-empty"><p>El catálogo está vacío.</p><span>Añade etiquetas para que los centros puedan describir sus canchas.</span></div>
        ) : (
          <ul className="characteristic-admin-list">
            {items.map((item) => (
              <li className="characteristic-admin-item" key={item.id}>
                <div className="field">
                  <label htmlFor={`characteristic-${item.id}`}>Nombre de la etiqueta</label>
                  <input id={`characteristic-${item.id}`} maxLength={40} minLength={2} onChange={(event) => setNames((current) => ({ ...current, [item.id]: event.target.value }))} value={names[item.id] ?? item.name} />
                </div>
                <span className={`court-status ${item.isActive ? 'court-status-enabled' : 'court-status-disabled'}`}>{item.isActive ? 'Disponible' : 'Archivada'}</span>
                <div className="characteristic-actions">
                  {(names[item.id] ?? item.name) !== item.name && (
                    <button className="primary-button" disabled={Boolean(savingId)} onClick={() => saveCharacteristic(item)} type="button">Guardar nombre</button>
                  )}
                  <button className="secondary-button" disabled={Boolean(savingId)} onClick={() => saveCharacteristic(item, !item.isActive)} type="button">
                    {savingId === item.id ? 'Guardando…' : item.isActive ? 'Archivar' : 'Reactivar'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
