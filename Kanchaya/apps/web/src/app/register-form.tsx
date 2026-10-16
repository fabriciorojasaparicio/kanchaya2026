'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

export function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCreated, setIsCreated] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsCreated(false);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const values = new FormData(form);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'),
          email: values.get('email'),
          password: values.get('password'),
        }),
      });
      const result: { message?: string | string[] } = await response
        .json()
        .catch(() => ({}));

      if (response.status === 409) {
        setError('Ese correo ya tiene una cuenta. Prueba con otro.');
        return;
      }
      if (!response.ok) {
        setError(
          response.status === 429
            ? retryMessage(response)
            : typeof result.message === 'string'
              ? result.message
              : 'Revisa los datos e inténtalo de nuevo.',
        );
        return;
      }

      form.reset();
      setIsCreated(true);
    } catch {
      setError('No pudimos conectar con KanchaYA. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="name">Nombre completo</label>
        <input
          autoComplete="name"
          id="name"
          maxLength={120}
          minLength={2}
          name="name"
          placeholder="Tu nombre y apellido"
          required
        />
      </div>

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
          autoComplete="new-password"
          id="password"
          maxLength={128}
          minLength={8}
          name="password"
          placeholder="Mínimo 8 caracteres"
          required
          type="password"
        />
        <p className="field-hint">Usa al menos 8 caracteres.</p>
      </div>

      {error && (
        <p aria-live="polite" className="form-message form-error" role="alert">{error}</p>
      )}
      {isCreated && (
        <p aria-live="polite" className="form-message form-success" role="status">
          Tu cuenta quedó creada.{' '}
          <Link href="/login">Inicia sesión para continuar.</Link>
        </p>
      )}

      <button
        className="primary-button"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  );
}

function retryMessage(response: Response): string {
  const retryAfter = Number(response.headers.get('Retry-After'));
  return Number.isInteger(retryAfter) && retryAfter > 0
    ? `Demasiados intentos. Espera ${retryAfter} segundos antes de volver a intentarlo.`
    : 'Demasiados intentos. Espera un momento antes de volver a intentarlo.';
}
