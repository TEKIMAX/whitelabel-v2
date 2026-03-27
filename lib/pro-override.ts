const STORAGE_KEY = 'FORCE_PRO_MODE';
const EVENT_NAME = 'entitlements-override-change';

export function isProOverridden(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setProOverride(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event(EVENT_NAME));
}

export function subscribeToProOverride(callback: (enabled: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => { };

    const handler = () => {
        callback(isProOverridden());
    };

    window.addEventListener(EVENT_NAME, handler);
    // Also listen to storage events for cross-tab sync
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            handler();
        }
    });

    return () => {
        window.removeEventListener(EVENT_NAME, handler);
        window.removeEventListener('storage', handler);
    };
}
