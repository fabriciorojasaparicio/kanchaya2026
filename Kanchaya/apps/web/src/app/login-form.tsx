'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const values = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.get('email'),
          password: values.get('password'),
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          response.status === 401
            ? 'Correo o contraseña incorrectos.'
            : response.status === 429
              ? retryMessage(response)
              : typeof result.message === 'string'
                ? result.message
                : 'No pudimos iniciar sesión. Inténtalo de nuevo.',
        );
        return;
      }

      router.push('/profile');
    } catch {
      setError('No pudimos conectar con KanchaYA. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <input
          autoComplete="email"
          id="email"
          maxLength={254}
          name="email"
          placeholder="nombre@correo.com"
          required
          type="email"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          autoComplete="current-password"
          id="password"
          maxLength={128}
          name="password"
          placeholder="Tu contraseña"
          required
          type="password"
        />
      </div>
      {error && (
        <p aria-live="polite" className="form-message form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
      </button>
      <p className="form-switch">
        ¿Aún no tienes cuenta? <Link href="/register">Regístrate</Link>
      </p>
    </form>
  );
}

function retryMessage(response: Response): string {
  const retryAfter = Number(response.headers.get('Retry-After'));
  return Number.isInteger(retryAfter) && retryAfter > 0
    ? `Demasiados intentos. Espera ${retryAfter} segundos antes de volver a intentarlo.`
    : 'Demasiados intentos. Espera un momento antes de volver a intentarlo.';
}
