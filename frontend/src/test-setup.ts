// Polyfill required by Mantine color scheme hook
// Ensure both window and globalThis provide matchMedia
// @ts-ignore
const mm = (query: string) => ({
  matches: false,
  media: query,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})
// @ts-ignore
if (typeof window !== 'undefined') window.matchMedia = window.matchMedia || mm
// @ts-ignore
if (typeof globalThis !== 'undefined') (globalThis as any).matchMedia = (globalThis as any).matchMedia || mm