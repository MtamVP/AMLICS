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

  // 2. Convert Google Sheets link to CSV export link
  const gsheetMatch = trimmed.match(
    /^https?:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i
  );
  if (gsheetMatch) {
    const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/i);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return `https://docs.google.com/spreadsheets/d/${gsheetMatch[1]}/export?format=csv${gidParam}`;
  }

  // 3. Convert Google Drive share/open/uc links to direct download link
  if (trimmed.includes('drive.google.com')) {
    const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    const driveId = fileMatch?.[1] || idQueryMatch?.[1];
    if (driveId) {
      return `https://drive.google.com/uc?export=download&id=${driveId}`;
    }
  }

  // 4. Convert Dropbox share link (?dl=0 -> ?dl=1)
  if (/^https?:\/\/(www\.)?dropbox\.com\//i.test(trimmed)) {
    if (/[?&]dl=0/i.test(trimmed)) {
      return trimmed.replace(/([?&])dl=0/i, '$1dl=1');
    }
    if (!/[?&]dl=1/i.test(trimmed)) {
      return trimmed + (trimmed.includes('?') ? '&dl=1' : '?dl=1');
    }
  }

  return trimmed;
}

export function detectUnsupportedPlatformPage(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === 'colab.research.google.com') {
      return 'URL Google Colab là trang Notebook (.ipynb), không phải file CSV. Để dùng dữ liệu trên Colab, hãy chuyển sang tab "Colab / Kaggle" -> Connect Cloud và chọn file trong /content/ hoặc Google Drive.';
    }
    if (host === 'kaggle.com' || host === 'www.kaggle.com') {
      if (!parsed.pathname.includes('/api/v1/')) {
        return 'URL trang web Kaggle (datasets/competitions/code) trả về HTML và yêu cầu đăng nhập Kaggle. Hãy mở Public API hoặc chạy AMLICS Cloud Worker trực tiếp trên Kaggle Notebook để đọc thẳng /kaggle/input/...';
      }
    }
  } catch {
    return null;
  }
  return null;
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

  const platformErr = detectUnsupportedPlatformPage(parsedTarget.toString());
  if (platformErr) {
    return new Response(JSON.stringify({ error: platformErr }), {
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
      const authHint =
        upstream.status === 401 || upstream.status === 403
          ? ' Link có thể đang để Private/Restricted. Hãy mở quyền Public ("Anyone with the link") hoặc tải trực tiếp qua Colab/Kaggle Cloud Worker.'
          : '';
      return new Response(
        JSON.stringify({
          error: `Remote server returned HTTP ${upstream.status} (${upstream.statusText}).${authHint}`,
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
    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    const trimmedHead = text.trimStart().slice(0, 512).toLowerCase();
    if (
      contentType.includes('text/html') ||
      trimmedHead.startsWith('<!doctype html') ||
      trimmedHead.startsWith('<html')
    ) {
      return new Response(
        JSON.stringify({
          error:
            'URL trả về trang HTML (thường do link Google Drive/Sheets/Kaggle đang để Private yêu cầu đăng nhập, hoặc là trang web thay vì file CSV thô). Hãy bật chế độ Public ("Anyone with the link" -> Viewer) hoặc dùng Colab/Kaggle Cloud Runtime.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
