import { AuthShell } from '../auth-shell';
import { LoginForm } from '../login-form';

export default function LoginPage() {
  return (
    <AuthShell
      description="Entra a tu cuenta para volver a la cancha."
      title="Inicia sesión"
    >
      <LoginForm />
    </AuthShell>
  );
}
