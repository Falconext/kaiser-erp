import { useEffect } from 'react';

type EscapeHandler = (event: KeyboardEvent) => void;

export function useEscapeKey(handler: EscapeHandler, active: boolean = true) {
    useEffect(() => {
        if (!active) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handler(event);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [handler, active]);
}

export default useEscapeKey;
