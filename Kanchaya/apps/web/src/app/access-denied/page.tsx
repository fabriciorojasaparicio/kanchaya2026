import Link from 'next/link';
import { AuthShell } from '../auth-shell';

export default function AccessDeniedPage() {
  return (
    <AuthShell
      description="Tu cuenta no tiene permiso para ver este contenido. Si crees que es un error, contacta con el equipo de KanchaYA."
      title="No tienes acceso a este espacio"
    >
      <div className="state-panel">
        <p>Inicia sesión con un perfil autorizado o vuelve a un espacio disponible para ti.</p>
        <div className="profile-actions">
          <Link className="primary-button button-link" href="/profile">Ir a mi perfil</Link>
          <Link className="text-link" href="/">Volver al inicio</Link>
        </div>
      </div>
    </AuthShell>
  );
}
