# Lift Web Pages

GitHub Pages publishes the Lift Web production bundle at
https://pc-922.github.io/lift-web-pages/.

To publish a release:

1. Run **Build Lift Web for Pages** on `main` in the source repository. The
   workflow builds and checks the production bundle, then uploads
   `lift-web-production` as a short-lived Actions artifact.
2. Run **Publish Lift Web** in this repository with the source workflow run ID.
   GitHub Pages deploys the bundle from an artifact.

The publishing workflow uses the `LIFT_WEB_ARTIFACT_TOKEN` Actions secret.
Use a fine-grained GitHub token restricted to the source repository with
**Actions: Read** and no source-code permissions.

This release publishes the local-only edition of Lift Web.
