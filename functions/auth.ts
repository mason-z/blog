/**
 * Decap CMS → GitHub OAuth：与 /callback 配套，逻辑参考
 * https://github.com/sterlingwes/decap-proxy
 */
interface Env {
  GITHUB_OAUTH_ID: string;
  GITHUB_OAUTH_SECRET: string;
  GITHUB_REPO_PRIVATE?: string;
}

const GITHUB = {
  tokenHost: 'https://github.com',
  tokenPath: '/login/oauth/access_token',
  authorizePath: '/login/oauth/authorize',
} as const;

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  scope: string,
  state: string
): string {
  return `${GITHUB.tokenHost}${GITHUB.authorizePath}?response_type=code&client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(
    state
  )}`;
}

export async function onRequestGet(context: { request: Request; env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (url.searchParams.get('provider') !== 'github') {
    return new Response('Invalid provider', { status: 400 });
  }

  const repoIsPrivate =
    env.GITHUB_REPO_PRIVATE !== undefined && env.GITHUB_REPO_PRIVATE !== '0';
  const scope = repoIsPrivate ? 'repo,user' : 'public_repo,user';

  const redirectUri = `https://${url.hostname}/callback?provider=github`;
  const location = buildAuthorizeUrl(
    env.GITHUB_OAUTH_ID,
    redirectUri,
    scope,
    randomHex(4)
  );

  return Response.redirect(location, 302);
}
