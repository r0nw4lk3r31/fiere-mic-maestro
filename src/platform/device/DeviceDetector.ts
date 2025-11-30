/**
 * Device Type Detection
 * Determines if running on desktop, tablet, or mobile screen
 */

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Mobile phones: typically < 480px width
  if (width < 480) {
    return 'mobile';
  }
  
  // Tablets: 480-1024px width
  if (width < 1024) {
    return 'tablet';
  }
  
  // Desktop/laptop: >= 1024px width
  return 'desktop';
}

export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'landscape';
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

export function getDeviceInfo() {
  return {
    type: getDeviceType(),
    isTouch: isTouchDevice(),
    orientation: getOrientation(),
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1
  };
}
