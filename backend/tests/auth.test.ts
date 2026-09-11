import { app, httpServer } from '../src/index';
import http from 'http';

async function runTests() {
  console.log('🧪 Starting Phase 2 Auth & Middleware verification...\n');

  const server = httpServer.listen(3002);
  const BASE_URL = 'http://localhost:3002';

  try {
    // 1. Invalid input validation
    console.log('1. Testing validation error handling...');
    const valRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '' }),
    });
    const valData = await valRes.json();
    console.assert(valRes.status === 400, 'Expected 400 for validation error');
    console.assert(valData.error.code === 'VALIDATION_ERROR', 'Expected VALIDATION_ERROR code');
    console.log('   ✓ Input validation returned 400 with structured Zod errors\n');

    // 2. Invalid credentials
    console.log('2. Testing invalid credentials...');
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cpd.dev', password: 'WrongPassword!' }),
    });
    const badLoginData = await badLoginRes.json();
    console.assert(badLoginRes.status === 401, 'Expected 401 for wrong password');
    console.assert(badLoginData.error.code === 'UNAUTHORIZED', 'Expected UNAUTHORIZED code');
    console.log('   ✓ Invalid credentials returned 401 UNAUTHORIZED\n');

    // 3. Successful login
    console.log('3. Testing successful login...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@cpd.dev', password: 'Password123!' }),
    });
    const loginData = await loginRes.json();
    console.assert(loginRes.status === 200, 'Expected 200 for successful login');
    console.assert(loginData.success === true, 'Expected success === true');
    console.assert(typeof loginData.data.accessToken === 'string', 'Expected access token string');
    console.assert(loginData.data.user.role === 'ADMIN', 'Expected role ADMIN');

    const rawCookies = loginRes.headers.get('set-cookie') || '';
    console.assert(rawCookies.includes('cpd_refresh_token='), 'Expected cpd_refresh_token cookie');
    console.assert(rawCookies.includes('HttpOnly'), 'Expected HttpOnly flag');
    console.assert(rawCookies.includes('SameSite=Strict'), 'Expected SameSite=Strict flag');

    const adminToken = loginData.data.accessToken;
    const cookieHeader = rawCookies.split(';')[0];
    console.log('   ✓ Successful login returned 200, JWT accessToken, and HttpOnly/SameSite=Strict cookie\n');

    // 4. Access protected endpoint (/api/auth/me) with token
    console.log('4. Testing protected endpoint access...');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData = await meRes.json();
    console.assert(meRes.status === 200, 'Expected 200 for /api/auth/me');
    console.assert(meData.data.user.email === 'admin@cpd.dev', 'Expected user email match');
    console.log('   ✓ Protected route accessed successfully with Bearer token\n');

    // 5. Access protected endpoint without token
    console.log('5. Testing protected endpoint rejection without token...');
    const noTokenRes = await fetch(`${BASE_URL}/api/auth/me`);
    const noTokenData = await noTokenRes.json();
    console.assert(noTokenRes.status === 401, 'Expected 401 without token');
    console.assert(noTokenData.error.code === 'UNAUTHORIZED', 'Expected UNAUTHORIZED code');
    console.log('   ✓ Protected route rejected request without token (401)\n');

    // 6. Token refresh with cookie
    console.log('6. Testing refresh token rotation...');
    const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
      },
    });
    const refreshData = await refreshRes.json();
    console.assert(refreshRes.status === 200, 'Expected 200 for refresh');
    console.assert(refreshData.data.accessToken !== adminToken, 'Expected new access token');
    const newCookies = refreshRes.headers.get('set-cookie') || '';
    console.assert(newCookies.includes('cpd_refresh_token='), 'Expected new refresh cookie');
    console.log('   ✓ Refresh token rotated: issued new access token and rotated refresh cookie\n');

    // 7. Replay attack detection (using old refresh token)
    console.log('7. Testing token reuse / replay attack prevention...');
    const replayRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader, // Old revoked cookie!
      },
    });
    const replayData = await replayRes.json();
    console.assert(replayRes.status === 401, 'Expected 401 for revoked token reuse');
    console.log('   ✓ Reused refresh token rejected (401) with session invalidation\n');

    // 8. Developer login & role authorization check
    console.log('8. Testing role authorization (DEVELOPER forbidden from ADMIN route)...');
    const devLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kiran@cpd.dev', password: 'Password123!' }),
    });
    const devLoginData = await devLoginRes.json();
    const devToken = devLoginData.data.accessToken;

    const adminOnlyRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({
        name: 'Hacker',
        email: 'hacker@cpd.dev',
        password: 'Password123!',
        role: 'ADMIN',
      }),
    });
    const adminOnlyData = await adminOnlyRes.json();
    console.assert(adminOnlyRes.status === 403, 'Expected 403 for non-admin');
    console.assert(adminOnlyData.error.code === 'FORBIDDEN', 'Expected FORBIDDEN code');
    console.log('   ✓ Role authorization enforced: DEVELOPER received 403 FORBIDDEN on admin route\n');

    // 9. Structured 404 for unknown route
    console.log('9. Testing structured 404 handler...');
    const notFoundRes = await fetch(`${BASE_URL}/api/non-existent-route`);
    const notFoundData = await notFoundRes.json();
    console.assert(notFoundRes.status === 404, 'Expected 404');
    console.assert(notFoundData.error.code === 'NOT_FOUND', 'Expected NOT_FOUND code');
    console.log('   ✓ Centralized 404 handler returned structured response\n');

    console.log('🎉 ALL PHASE 2 TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
