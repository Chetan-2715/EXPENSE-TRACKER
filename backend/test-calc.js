const { calculateBalances, suggestedSettlements } = require('./services/calculator');

// Test Case 1: Prompt Example
const people1 = ['Chetan', 'Rahul', 'Akash'];
const expenses1 = [
  {
    id: '1',
    description: 'Dinner',
    amount: 600,
    paid_by: 'Chetan',
    participants: ['Chetan', 'Rahul', 'Akash']
  },
  {
    id: '2',
    description: 'Cabs',
    amount: 300,
    paid_by: 'Rahul',
    participants: ['Chetan', 'Rahul', 'Akash']
  }
];

const bal1 = calculateBalances(people1, expenses1);
console.log('--- Test 1 Balances ---');
console.log(bal1);
const set1 = suggestedSettlements(bal1.balances);
console.log('--- Test 1 Settlements ---');
console.log(set1);

// Test Case 2: Uneven split with odd paise (e.g., 100 split 3 ways: 33.34, 33.33, 33.33)
const people2 = ['Alice', 'Bob', 'Charlie'];
const expenses2 = [
  {
    id: '3',
    description: 'Snacks',
    amount: 100,
    paid_by: 'Alice',
    participants: ['Alice', 'Bob', 'Charlie']
  }
];
const bal2 = calculateBalances(people2, expenses2);
console.log('--- Test 2 Balances (Uneven) ---');
console.log(bal2);
const set2 = suggestedSettlements(bal2.balances);
console.log('--- Test 2 Settlements ---');
console.log(set2);
