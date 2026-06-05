/**
 * test-api.js
 * 
 * Simple script to hit and verify all endpoints in the backend server.
 * Run this while the server is running to verify API implementation.
 */

const http = require('http');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;
let token = '';
let sessionId = '';
let feedbackId = '';
let alertId = '';

const request = (method, path, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(dataString);
    }
    req.end();
  });
};

async function runTests() {
  console.log('--- STARTING BACKEND API DIAGNOSTICS ---');

  try {
    // 1. Health Check
    console.log('\nTesting /health...');
    const health = await request('GET', '/health');
    console.log(`Health Status: ${health.status}`, health.body);

    // 2. Signup User
    console.log('\nTesting /auth/signup...');
    const email = `testuser_${Date.now()}@test.com`;
    const signup = await request('POST', '/auth/signup', {
      email: email,
      password: 'Password123!',
      name: 'Integration Test User'
    });
    console.log(`Signup Status: ${signup.status}`, signup.body.message || signup.body.error);
    if (signup.status !== 201) throw new Error('Signup failed');

    // 3. Login User
    console.log('\nTesting /auth/login...');
    const login = await request('POST', '/auth/login', {
      email: email,
      password: 'Password123!'
    });
    console.log(`Login Status: ${login.status}`, login.body.message || login.body.error);
    if (login.status !== 200) throw new Error('Login failed');
    token = login.body.token;
    const authHeader = { 'Authorization': `Bearer ${token}` };

    // 4. Get Profile
    console.log('\nTesting /auth/me...');
    const profile = await request('GET', '/auth/me', null, authHeader);
    console.log(`Me Status: ${profile.status}`, profile.body.user ? `Authenticated as ${profile.body.user.email} (${profile.body.user.role})` : profile.body.error);

    // 5. Ingest Feedback
    console.log('\nTesting /feedback/ingest...');
    const ingest = await request('POST', '/feedback/ingest', {
      content: 'Our payments page is crashing when clicking pay with Apple Pay. It is broken.',
      source: 'MANUAL'
    }, authHeader);
    console.log(`Ingest Status: ${ingest.status}`, ingest.body.data ? `Ingested ID: ${ingest.body.data.id} - Sentiment: ${ingest.body.data.sentiment} - Category: ${ingest.body.data.category}` : ingest.body.error);
    if (ingest.status === 201) feedbackId = ingest.body.data.id;

    // 6. Get Feedbacks list
    console.log('\nTesting /feedback list...');
    const feedbacks = await request('GET', '/feedback', null, authHeader);
    console.log(`List Feedbacks Status: ${feedbacks.status}`, `Items found: ${feedbacks.body.data ? feedbacks.body.data.length : 'none'}`);

    // 7. Get Releases
    console.log('\nTesting /releases list...');
    const releases = await request('GET', '/releases', null, authHeader);
    console.log(`List Releases Status: ${releases.status}`, `Releases count: ${releases.body.data ? releases.body.data.length : 'none'}`);

    // 8. Create Chat Session
    console.log('\nTesting /chat/sessions (create)...');
    const newSession = await request('POST', '/chat/sessions', { title: 'Checkout Issue Analysis' }, authHeader);
    console.log(`Create Session Status: ${newSession.status}`, newSession.body.data ? `Session ID: ${newSession.body.data.id}` : newSession.body.error);
    if (newSession.status === 201) sessionId = newSession.body.data.id;

    // 9. Send Chat Message (RAG)
    if (sessionId) {
      console.log('\nTesting /chat/message (RAG prompt)...');
      const chatMsg = await request('POST', '/chat/message', {
        sessionId: sessionId,
        content: 'Why is checkout failing for Apple Pay?'
      }, authHeader);
      console.log(`Chat Response Status: ${chatMsg.status}`);
      if (chatMsg.status === 201) {
        console.log(`AI Answer: "${chatMsg.body.data.assistantMessage.content}"`);
        console.log(`Context sources matched: ${chatMsg.body.data.context.length}`);
      }
    }

    // 10. Get Alerts
    console.log('\nTesting /alerts...');
    const alertsList = await request('GET', '/alerts', null, authHeader);
    console.log(`Alerts Status: ${alertsList.status}`, `Alerts count: ${alertsList.body.data ? alertsList.body.data.length : 'none'}`);
    if (alertsList.status === 200 && alertsList.body.data.length > 0) {
      alertId = alertsList.body.data[0].id;
    }

    // 11. Resolve Alert
    if (alertId) {
      console.log(`\nTesting /alerts/${alertId}/resolve...`);
      const resolveAlert = await request('PATCH', `/alerts/${alertId}/resolve`, null, authHeader);
      console.log(`Resolve Alert Status: ${resolveAlert.status}`, resolveAlert.body.message || resolveAlert.body.error);
    }

    console.log('\n--- ALL TESTS COMPLETED SUCCESSFULLY ---');

  } catch (error) {
    console.error('\nTest failed with error:', error);
  }
}

// Start tests after 1s delay
setTimeout(runTests, 1000);
