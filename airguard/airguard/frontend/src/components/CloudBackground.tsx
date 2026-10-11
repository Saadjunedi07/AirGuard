import { useEffect, useRef } from 'react';

interface VantaCloudsEffect {
  destroy: () => void;
}

interface VantaCloudsApi {
  CLOUDS: (options: {
    el: HTMLElement;
    mouseControls: boolean;
    touchControls: boolean;
    gyroControls: boolean;
    minHeight: number;
    minWidth: number;
  }) => VantaCloudsEffect;
}

declare global {
  interface Window {
    VANTA?: VantaCloudsApi;
  }
}

export const CloudBackground = () => {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = backgroundRef.current;
    if (!container || !window.VANTA) return;

    const effect = window.VANTA.CLOUDS({
      el: container,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
    });

    return () => effect.destroy();
  }, []);

  return <div ref={backgroundRef} aria-hidden="true" className="absolute inset-0 z-0 opacity-35" />;
};
