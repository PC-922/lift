# Publicación de LIFT

GitHub Pages publica la landing en https://pc-922.github.io/lift/ y el artefacto de la app en https://pc-922.github.io/lift/web/.

Ejecuta **Build Lift Web for Pages** en `PC-922/lift-web` y pasa su ID de ejecución a **Publish Lift Web**. El workflow combina la landing pública con el build de producción. El secreto `LIFT_WEB_ARTIFACT_TOKEN` usa **Actions: Read** en el repo fuente.
