const http = require('http');

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting API Integration Tests ---');

  // 1. Health
  const health = await request('GET', '/api/health');
  console.log('1. Health Check:', health.status === 200 ? 'PASS' : 'FAIL', health.data);

  // 2. Reset sample data
  const reset = await request('POST', '/api/reset');
  console.log('2. Reset Sample Data:', reset.status === 200 ? 'PASS' : 'FAIL');

  // 3. Get Members
  const members = await request('GET', '/api/members');
  console.log('3. Get Members count:', members.data.count, members.data.data);

  // 4. Add Member
  const addMem = await request('POST', '/api/members', { name: 'TestUser123' });
  console.log('4. Add Member:', addMem.status === 201 ? 'PASS' : 'FAIL', addMem.data.data);

  // 5. Delete newly added member (has no expenses) -> Should succeed
  const delMem = await request('DELETE', `/api/members/TestUser123`);
  console.log('5. Delete Unused Member:', delMem.status === 200 ? 'PASS' : 'FAIL');

  // 6. Attempt to delete Chetan (has expenses) -> Should FAIL with 400
  const delPayer = await request('DELETE', `/api/members/Chetan`);
  console.log('6. Prevent Deletion of Active Member:', delPayer.status === 400 ? 'PASS (Correctly Blocked)' : 'FAIL', delPayer.data);

  // 7. Balances & Settlements
  const bal = await request('GET', '/api/balances');
  console.log('7. Balances computed:', bal.data.data.balances.length, 'members');
  const sumBalances = bal.data.data.balances.reduce((s, b) => s + b.netBalancePaise, 0);
  console.log('   Zero-sum verification sum (paise):', sumBalances, sumBalances === 0 ? 'PERFECT 0-SUM' : 'ROUNDING LEAK');

  const settlements = await request('GET', '/api/settlements');
  console.log('8. Settlements generated:', settlements.data.count, 'transactions');
  settlements.data.data.settlements.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.from} pays ${s.to} ₹${s.amount}`);
  });

  // 9. Dashboard API
  const dash = await request('GET', '/api/dashboard');
  console.log('9. Dashboard API:', dash.status === 200 ? 'PASS' : 'FAIL', dash.data.data.metrics);

  console.log('--- ALL BACKEND INTEGRATION TESTS COMPLETE ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
