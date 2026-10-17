import Link from 'next/link';
import { AuthShell } from '../../auth-shell';
import { CourtManagementScreen } from '../../court-management-screen';

export default function ManagedCourtsPage() {
  return (
    <AuthShell
      contentClassName="court-management-content"
      description="Mantén la oferta de tu centro clara y al día."
      storyDescription="Cada cancha lista es un partido más cerca."
      title="Canchas del centro"
    >
      <Link className="management-back-link" href="/profile">← Volver a mi perfil</Link>
      <CourtManagementScreen />
    </AuthShell>
  );
}
