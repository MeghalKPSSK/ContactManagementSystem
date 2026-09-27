import { useEffect } from 'react';

// Prevents the page behind a modal from scrolling on touch devices while it's open.
export default function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [active]);
}
