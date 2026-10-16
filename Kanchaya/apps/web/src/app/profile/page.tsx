import { AuthShell } from '../auth-shell';
import { ProfileScreen } from '../profile-screen';

export default function ProfilePage() {
  return (
    <AuthShell
      contentClassName="profile-content"
      description="Administra los datos de tu cuenta y prepárate para tu próximo partido."
      storyDescription="Mantén tus datos al día y vuelve a la cancha."
      title="Mi perfil"
    >
      <ProfileScreen />
    </AuthShell>
  );
}
