'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok && response.status !== 401) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        throw new Error(response.status === 429 && Number.isInteger(retryAfter) && retryAfter > 0
          ? `Demasiadas solicitudes. Espera ${retryAfter} segundos antes de cerrar sesión.`
          : 'No pudimos cerrar tu sesión. Comprueba tu conexión e inténtalo otra vez.');
      }
      router.replace('/login');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos conectar con KanchaYA.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="logout-panel">
      <p>Al confirmar, no podrás seguir usando KanchaYA hasta volver a iniciar sesión.</p>
      {error && <p aria-live="polite" className="form-message form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={isSubmitting} onClick={handleLogout} type="button">
        {isSubmitting ? 'Cerrando sesión…' : 'Sí, cerrar sesión'}
      </button>
      <Link className="text-link" href="/profile">Volver a mi perfil</Link>
    </div>
  );
}
