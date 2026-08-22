'use strict';

function decodeBase64Url(value) {
  if (typeof value !== 'string') return null;
  try {
    return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } catch {
    return null;
  }
}

function jwtPayload(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const bytes = decodeBase64Url(parts[1]);
  if (!bytes) return null;
  try {
    const value = JSON.parse(bytes.toString('utf8'));
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function validateAuth(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.auth_mode === 'chatgpt') {
    return Boolean(value.tokens && typeof value.tokens.refresh_token === 'string' && value.tokens.refresh_token.length > 10);
  }
  return value.auth_mode === 'apikey' && typeof value.OPENAI_API_KEY === 'string' && value.OPENAI_API_KEY.length >= 20;
}

function accountIdentity(auth) {
  if (!validateAuth(auth)) return null;
  if (auth.auth_mode === 'apikey') {
    return `apikey:${auth.OPENAI_API_KEY.slice(-12)}`;
  }
  const accountId = auth.tokens && auth.tokens.account_id;
  if (typeof accountId === 'string' && accountId) return `chatgpt:${accountId}`;
  const email = emailFromAuth(auth);
  return email ? `email:${email.toLowerCase()}` : null;
}

function emailFromAuth(auth) {
  if (!validateAuth(auth) || auth.auth_mode !== 'chatgpt') return null;
  const payload = jwtPayload(auth.tokens.id_token);
  return payload && typeof payload.email === 'string' ? payload.email : null;
}

function accessTokenIsFresh(auth, minimumSeconds = 120) {
  if (!validateAuth(auth) || auth.auth_mode !== 'chatgpt') return false;
  const payload = jwtPayload(auth.tokens.access_token);
  return Boolean(payload && Number.isFinite(payload.exp) && payload.exp - Date.now() / 1000 >= minimumSeconds);
}

module.exports = { validateAuth, accountIdentity, emailFromAuth, accessTokenIsFresh };
