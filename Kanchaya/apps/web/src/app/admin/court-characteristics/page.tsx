import { AuthShell } from '../../auth-shell';
import { CourtCharacteristicsScreen } from '../../court-characteristics-screen';

export default function CourtCharacteristicsPage() {
  return (
    <AuthShell
      contentClassName="characteristics-page-content"
      description="Mantén un catálogo común, claro y útil para todos los centros."
      storyDescription="Una buena etiqueta hace más fácil encontrar dónde jugar."
      title="Características de cancha"
    >
      <CourtCharacteristicsScreen />
    </AuthShell>
  );
}
