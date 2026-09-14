import { vi } from 'vitest';

declare const jsdom: { window: { localStorage: Storage } };

// Node's native storage must not shadow the browser storage supplied by jsdom.
if (typeof jsdom !== 'undefined') vi.stubGlobal('localStorage', jsdom.window.localStorage);
