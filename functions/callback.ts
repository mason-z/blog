/**
 * GitHub OAuth 回调：把 access_token 通过 postMessage 交给 Decap 父窗口
 */
interface Env {
  GITHUB_OAUTH_ID: string;
  GITHUB_OAUTH_SECRET: string;
}

const GITHUB = {
  tokenHost: 'https://github.com',
  tokenPath: '/login/oauth/access_token',
} as const;

async function exchangeCode(
  id: string,
  secret: string,
  code: string,
  redirectUri: string
): Promise<string> {
  const response = await fetch(`${GITHUB.tokenHost}${GITHUB.tokenPath}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: id,
      client_secret: secret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const json = (await response.json()) as { access_token?: string; error?: string };
  if (!json.access_token) {
    throw new Error(json.error || 'no access_token');
  }
  return json.access_token;
}

function callbackHtml(status: string, token: string): Response {
  const message = `authorization:github:${status}:${JSON.stringify({ token })}`;
  const body = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Authorizing Decap</title></head><body>
<script>
(function(){
  var receiveMessage = function() {
    window.opener.postMessage(${JSON.stringify(message)}, '*');
    window.removeEventListener("message", receiveMessage, false);
  };
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
<p>Authorizing Decap...</p>
</body></html>`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (url.searchParams.get('provider') !== 'github') {
    return new Response('Invalid provider', { status: 400 });
  }
  const code = url.searchParams.get('code');
  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  const redirectUri = `https://${url.hostname}/callback?provider=github`;
  try {
    const accessToken = await exchangeCode(
      env.GITHUB_OAUTH_ID,
      env.GITHUB_OAUTH_SECRET,
      code,
      redirectUri
    );
    return callbackHtml('success', accessToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'token exchange failed';
    return new Response(msg, { status: 500 });
  }
}
