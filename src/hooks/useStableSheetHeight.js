import { useEffect, useRef, useState } from 'react';

const KEYBOARD_THRESHOLD = 120;

function getKeyboardInset() {
  if (typeof window === 'undefined' || !window.visualViewport) return 0;
  const viewportBottom = (window.visualViewport.offsetTop || 0) + window.visualViewport.height;
  return Math.max(0, window.innerHeight - viewportBottom);
}

export default function useStableSheetHeight() {
  const baseHeightRef = useRef(typeof window === 'undefined' ? 0 : window.innerHeight);
  const [height, setHeight] = useState(baseHeightRef.current);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const commitBaseHeight = () => {
      baseHeightRef.current = window.innerHeight;
      setHeight(window.innerHeight);
    };

    const update = () => {
      const keyboardOpen = getKeyboardInset() > KEYBOARD_THRESHOLD;
      if (keyboardOpen) return;

      // Run twice because iOS sometimes reports the restored viewport one frame late.
      window.requestAnimationFrame(commitBaseHeight);
      setTimeout(commitBaseHeight, 220);
    };

    const updateAfterOrientation = () => {
      setTimeout(commitBaseHeight, 320);
      setTimeout(commitBaseHeight, 650);
    };

    window.addEventListener('resize', update);
    window.addEventListener('focusout', update, true);
    window.addEventListener('orientationchange', updateAfterOrientation);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('focusout', update, true);
      window.removeEventListener('orientationchange', updateAfterOrientation);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  return height || (typeof window !== 'undefined' ? window.innerHeight : 0);
}