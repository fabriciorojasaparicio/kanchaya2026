import { AuthShell } from "../../auth-shell";
import { SportsCenterTagsScreen } from "../../sports-center-tags-screen";

export default function SportsCenterTagsPage() {
  return (
    <AuthShell
      contentClassName="characteristics-page-content"
      description="Administra las etiquetas comunes que completan la ficha de cada centro."
      storyDescription="Una descripción clara ayuda a presentar mejor cada lugar para jugar."
      title="Etiquetas de centros"
    >
      <SportsCenterTagsScreen />
    </AuthShell>
  );
}
