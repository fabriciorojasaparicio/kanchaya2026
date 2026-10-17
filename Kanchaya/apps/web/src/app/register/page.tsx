import Link from 'next/link';
import { AuthShell } from '../auth-shell';
import { RegisterForm } from '../register-form';

export default function RegisterPage() {
  return (
    <AuthShell
      description="Crea tu cuenta de jugador y encuentra dónde jugar."
      title="Crea tu cuenta"
    >
      <RegisterForm />
      <p className="form-switch">¿Ya tienes una cuenta? <Link href="/login">Inicia sesión</Link></p>
    </AuthShell>
  );
}
