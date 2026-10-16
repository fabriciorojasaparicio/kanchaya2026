import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({
  children,
  contentClassName = '',
  description,
  storyDescription = 'Tu cuenta, tu equipo y tu próximo partido en un solo lugar.',
  title,
}: {
  children: ReactNode;
  contentClassName?: string;
  description: string;
  storyDescription?: string;
  title: string;
}) {
  return (
    <main className="auth-layout">
      <a className="skip-link" href="#auth-content">Saltar al contenido</a>
      <aside className="auth-story">
        <Link aria-label="KanchaYA, inicio" className="brand" href="/">
          <span className="brand-mark">K</span>
          <span translate="no">KanchaYA</span>
        </Link>

        <div className="story-copy">
          <p className="story-headline">Tu próxima cancha</p>
          <p className="story-description">{storyDescription}</p>
        </div>

        <div aria-hidden="true" className="court-lines">
          <span />
          <span />
          <span />
        </div>

      </aside>

      <section className="auth-main" id="auth-content" tabIndex={-1}>
        <div className={`auth-content ${contentClassName}`}>
          <div className="auth-heading">
            <h1>{title}</h1>
            <p className="auth-description">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
