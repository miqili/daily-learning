export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}
