import { useState, useEffect } from 'react';

// Single source of truth for responsive breakpoints (no Tailwind in this project,
// so components read these flags and switch their inline styles accordingly).
//   phone:   < 640
//   mobile:  < 768  (hamburger / single-column threshold)
//   tablet:  640–1023
//   desktop: >= 1024
export function useViewport() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return {
    width,
    isPhone: width < 640,
    isMobile: width < 768,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
  };
}

export default useViewport;
