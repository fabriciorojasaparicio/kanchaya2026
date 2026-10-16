import { AuthShell } from '../auth-shell';
import { LogoutScreen } from '../logout-screen';

export default function LogoutPage() {
  return (
    <AuthShell
      description="La sesión se cerrará en esta pestaña y quedará revocada en KanchaYA."
      title="Cerrar sesión"
    >
      <LogoutScreen />
    </AuthShell>
  );
}
