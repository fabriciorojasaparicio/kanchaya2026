import Image from 'next/image';
import Link from 'next/link';
import { SportsCentersSection } from './sports-centers-section';

const futsalPhoto =
  'https://images.unsplash.com/photo-1760174012435-630a17a434ed?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=85&w=1800';

export default function Home() {
  return (
    <main className="home-page">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>

      <header className="home-header">
        <Link aria-label="KanchaYA, inicio" className="brand home-brand" href="/">
          <span className="brand-mark">K</span>
          <span translate="no">KanchaYA</span>
        </Link>
        <nav aria-label="Navegación principal" className="home-nav">
          <Link className="home-nav-link" href="#como-funciona">Así se juega</Link>
          <Link className="home-nav-link" href="#centros-deportivos">Centros</Link>
          <Link className="home-nav-link home-login" href="/login">Iniciar sesión</Link>
          <Link className="home-nav-cta" href="/register">Crear cuenta</Link>
        </nav>
      </header>

      <section aria-labelledby="home-title" className="home-hero" id="contenido">
        <div className="hero-copy">
          <p className="hero-eyebrow"><span aria-hidden="true" /> El juego empieza cuando nos juntamos</p>
          <h1 id="home-title">Que el partido no se quede en el chat<span>.</span></h1>
          <p className="hero-description">
            Encuentra dónde jugar, reúne a tu gente y convierte ese «¿cuándo?» en un nos vemos en la cancha.
          </p>
          <div className="hero-actions">
            <Link className="hero-primary" href="/register">
              Empezar a jugar <span aria-hidden="true">↗</span>
            </Link>
            <Link className="hero-secondary" href="#como-funciona">Conoce KanchaYA</Link>
          </div>
        </div>

        <figure className="hero-image-wrap">
          <Image
            alt="Dos jugadores disputan el balón en una cancha cubierta de fútbol sala."
            className="hero-image"
            fill
            priority
            sizes="(max-width: 760px) 100vw, 54vw"
            src={futsalPhoto}
            unoptimized
          />
          <figcaption className="image-caption">El plan es jugar. Lo demás lo armamos.</figcaption>
        </figure>
        <span aria-hidden="true" className="hero-orbit hero-orbit-one" />
        <span aria-hidden="true" className="hero-orbit hero-orbit-two" />
      </section>

      <SportsCentersSection />

      <section aria-labelledby="manifesto-title" className="manifesto" id="como-funciona">
        <div className="manifesto-heading landing-reveal">
          <p className="section-kicker">Menos coordinar. Más jugar.</p>
          <h2 id="manifesto-title">El partido se arma entre todos.</h2>
        </div>
        <div className="manifesto-steps landing-reveal">
          <article className="manifesto-step">
            <span aria-hidden="true" className="step-mark">01</span>
            <div>
              <h3>Encuentra tu cancha</h3>
              <p>Un buen plan comienza con un lugar para encontrarse y jugar.</p>
            </div>
          </article>
          <article className="manifesto-step">
            <span aria-hidden="true" className="step-mark">02</span>
            <div>
              <h3>Convoca a tu equipo</h3>
              <p>Invita a tu parche y pongan fecha al próximo partido.</p>
            </div>
          </article>
          <article className="manifesto-step">
            <span aria-hidden="true" className="step-mark">03</span>
            <div>
              <h3>Nos vemos jugando</h3>
              <p>Menos mensajes para cuadrar. Más historias después del pitazo.</p>
            </div>
          </article>
        </div>
      </section>

      <section aria-labelledby="join-title" className="home-join landing-reveal">
        <div>
          <p className="section-kicker">Tu próximo partido te espera</p>
          <h2 id="join-title">Hagamos que pase.</h2>
        </div>
        <Link className="join-link" href="/register">Únete a KanchaYA <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className="home-footer">
        <Link aria-label="KanchaYA, inicio" className="footer-brand" href="/">KanchaYA</Link>
        <p>El deporte nos encuentra.</p>
        <Link href="/login">Ya tengo cuenta</Link>
      </footer>
    </main>
  );
}
