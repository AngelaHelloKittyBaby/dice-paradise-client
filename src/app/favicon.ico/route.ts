const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1d4ed8"/>
  <rect x="10" y="10" width="44" height="44" rx="10" fill="#fff7d6"/>
  <circle cx="23" cy="23" r="5" fill="#ef4444"/>
  <circle cx="41" cy="23" r="5" fill="#2563eb"/>
  <circle cx="32" cy="32" r="5" fill="#f59e0b"/>
  <circle cx="23" cy="41" r="5" fill="#22c55e"/>
  <circle cx="41" cy="41" r="5" fill="#7c3aed"/>
</svg>`;

export const dynamic = 'force-static';

export function GET() {
  return new Response(faviconSvg, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': 'image/svg+xml',
    },
  });
}
