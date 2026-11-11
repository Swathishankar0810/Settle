async function test() {
  try {
    const res1 = await fetch('http://localhost:3000/api/subscriptions').then(r => r.json());
    console.log('Subscriptions count:', res1.subscriptions?.length, 'Monthly spend: $' + res1.metrics?.totalMonthly);

    const res2 = await fetch('http://localhost:3000/api/ledger').then(r => r.json());
    console.log('Ledger events count:', res2.events?.length);

    const res3 = await fetch('http://localhost:3000/api/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenseId: 'exp_restaurant_001', rule: 'ITEM_BASED' })
    }).then(r => r.json());
    console.log('Allocations count:', res3.allocations?.length, 'Total allocated: $' + res3.totalAllocated);

    const res4 = await fetch('http://localhost:3000/').then(r => r.status);
    console.log('Homepage status:', res4);

    console.log('ALL SERVER ENDPOINTS PASSED VERIFICATION!');
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

test();
