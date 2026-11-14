// Cloudflare Pages Function: Safe CORS Proxy for fetching external CSV datasets
// Endpoint: /api/proxy-csv?url=<encoded_url>

function isPrivateOrLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.endsWith('.local') ||
    h.endsWith('.internal')
  ) {
    return true;
  }
  if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(h)) {
    return true;
  }
  return false;
}

export function normalizeDatasetUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  // 1. Convert GitHub blob URL to raw.githubusercontent.com
  const ghMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i
  );
  if (ghMatch) {
    return `https://raw.githubusercontent.com/${ghMatch[1]}/${ghMatch[2]}/${ghMatch[3]}`;
  }

  // 2. Convert Google Drive share link to direct download link
  const gdriveMatch = trimmed.match(
    /\/file\/d\/([a-zA-Z0-9_-]+)/i
  );
  if (gdriveMatch && trimmed.includes('drive.google.com')) {
    return `https://drive.google.com/uc?export=download&id=${gdriveMatch[1]}`;
  }

  return trimmed;
}

export const onRequestGet = async (context: { request: Request }) => {
  const reqUrl = new URL(context.request.url);
  const targetParam = reqUrl.searchParams.get('url');

  if (!targetParam) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(normalizeDatasetUrl(targetParam));
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
    return new Response(JSON.stringify({ error: 'Only HTTP/HTTPS URLs are allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isPrivateOrLocalHost(parsedTarget.hostname)) {
    return new Response(JSON.stringify({ error: 'Private/local network URLs are blocked (SSRF protection)' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const upstream = await fetch(parsedTarget.toString(), {
      headers: {
        'User-Agent': 'AMLICS-Dataset-Fetcher/1.0',
        Accept: 'text/csv,text/plain,application/octet-stream,*/*',
      },
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          error: `Remote server returned HTTP ${upstream.status} (${upstream.statusText})`,
        }),
        {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const contentLength = Number(upstream.headers.get('content-length') || '0');
    const MAX_BYTES = 25 * 1024 * 1024; // 25MB limit for proxy
    if (contentLength > MAX_BYTES) {
      return new Response(
        JSON.stringify({
          error: `File size (${(contentLength / (1024 * 1024)).toFixed(1)}MB) exceeds 25MB browser proxy limit. Switch to Colab/Kaggle Runtime to load large URLs directly.`,
        }),
        {
          status: 413,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const text = await upstream.text();
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: `Failed to fetch remote URL: ${err instanceof Error ? err.message : String(err)}`,
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
