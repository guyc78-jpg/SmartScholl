import { useEffect, useState } from 'react';

export default function useStableSheetHeight() {
  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return window.innerHeight;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const active = document.activeElement;
      const editingTextField = active && ['INPUT', 'TEXTAREA'].includes(active.tagName);
      // Keyboard-driven viewport changes must not resize sheets.
      if (!editingTextField) setHeight(window.innerHeight);
    };

    const updateAfterOrientation = () => setTimeout(() => setHeight(window.innerHeight), 280);

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', updateAfterOrientation);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', updateAfterOrientation);
    };
  }, []);

  return height || (typeof window !== 'undefined' ? window.innerHeight : 0);
}