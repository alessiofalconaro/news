/**
 * The public half of the VAPID key pair.
 *
 * Public by design, like the Firebase values next door: it identifies this app
 * to the browser's push service and can do nothing on its own. The private half
 * lives in `.env` and in the GitHub secrets, and only the pipeline holds it.
 *
 * Generate both once with `npx web-push generate-vapid-keys`; the README
 * explains where each half goes.
 */
export const VAPID_PUBLIC_KEY = 'BBwaSXiWLZaKTHCB-nOs-JgkG9Z84F1Fp2hvx1mOtVi0sAfUiP7AOS-9uyT5Ux4BENrDTcfVzZ3FZfYboCEtG8Q';

/** False until the key above is filled in, so the UI can explain itself. */
export const pushConfigured = !VAPID_PUBLIC_KEY.startsWith('REPLACE_ME');
