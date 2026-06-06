// Simple HTML popup for Privy fallback during local development.
// This page should be replaced with the real Privy redirect/callback that
// performs OAuth or embedded wallet handoff.

export async function GET(req) {
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Privy Connect (dev)</title>
      <style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:24px;background:#0b0b0f;color:#e6eef6}button{padding:12px 16px;border-radius:8px;background:#00f2fe;color:#001; border:none;cursor:pointer}</style>
    </head>
    <body>
      <h2>Privy Connect (development)</h2>
      <p>This is a development popup stub. Click the button to simulate a successful Privy connection and postMessage the connected address to the opener window.</p>
      <button id="connectBtn">Complete Privy Auth</button>

      <script>
        const btn = document.getElementById('connectBtn');
        btn.addEventListener('click', () => {
          const address = '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0');
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'privy:connected', address }, '*');
            window.close();
          } else {
            document.body.insertAdjacentHTML('beforeend', '<p style="color:#f66">No opener detected.</p>');
          }
        });
      </script>
    </body>
  </html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
