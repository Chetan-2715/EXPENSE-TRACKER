/**
 * Direct port of the Python Expense Splitter logic into JavaScript.
 *
 * Implements:
 * - _split_equally(amount, participant_count)
 * - total_paid(trip)
 * - total_owed(trip)
 * - net_balances(trip)
 * - suggested_settlements(balances)
 */

function toPaise(amount) {
  return Math.round(Number(amount) * 100);
}

function toRupees(paise) {
  return Number((paise / 100).toFixed(2));
}

/**
 * Split an amount into equal cent shares that sum exactly to the amount.
 * Leftover cents from an uneven split are given one each to the first participants.
 */
function split_equally(amount, participantCount) {
  if (participantCount <= 0) return [];
  const totalCents = toPaise(amount);
  const baseCents = Math.floor(totalCents / participantCount);
  const remainder = totalCents % participantCount;

  const shares = [];
  for (let i = 0; i < participantCount; i++) {
    const shareCents = baseCents + (i < remainder ? 1 : 0);
    shares.push(toRupees(shareCents));
  }
  return shares;
}

/**
 * Total amount each person actually paid out of pocket.
 */
function total_paid(people, expenses) {
  const paid = {};
  for (const person of people) {
    paid[person] = 0;
  }
  for (const expense of expenses) {
    if (paid[expense.paid_by] !== undefined) {
      paid[expense.paid_by] = toRupees(toPaise(paid[expense.paid_by]) + toPaise(expense.amount));
    } else {
      paid[expense.paid_by] = Number(expense.amount);
    }
  }
  return paid;
}

/**
 * Total share each person owes, counting only the expenses they joined.
 */
function total_owed(people, expenses) {
  const owed = {};
  for (const person of people) {
    owed[person] = 0;
  }
  for (const expense of expenses) {
    const shares = split_equally(expense.amount, expense.participants.length);
    expense.participants.forEach((person, idx) => {
      if (owed[person] !== undefined) {
        owed[person] = toRupees(toPaise(owed[person]) + toPaise(shares[idx]));
      } else {
        owed[person] = shares[idx];
      }
    });
  }
  return owed;
}

/**
 * Net balance per person: positive means they are owed money.
 */
function net_balances(people, expenses) {
  const paid = total_paid(people, expenses);
  const owed = total_owed(people, expenses);
  const balances = {};
  for (const person of people) {
    balances[person] = toRupees(toPaise(paid[person] || 0) - toPaise(owed[person] || 0));
  }
  return balances;
}

/**
 * Suggest payments that settle the group with fewest transactions.
 * Repeatedly pairs the largest debtor with the largest creditor until every balance is zero.
 */
function suggested_settlements(balances) {
  // creditors: balance > 0, sorted descending by balance
  const creditors = Object.entries(balances)
    .filter(([_, amount]) => amount > 0)
    .map(([person, amount]) => [person, toPaise(amount)])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  // debtors: balance < 0, sorted descending by absolute debt
  const debtors = Object.entries(balances)
    .filter(([_, amount]) => amount < 0)
    .map(([person, amount]) => [person, -toPaise(amount)])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const payments = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    const amount = Math.min(creditor[1], debtor[1]);
    if (amount > 0) {
      payments.push({
        payer: debtor[0],
        payee: creditor[0],
        amount: toRupees(amount)
      });
    }

    creditor[1] -= amount;
    debtor[1] -= amount;

    if (creditor[1] === 0) creditorIndex++;
    if (debtor[1] === 0) debtorIndex++;
  }

  return payments;
}

/**
 * Calculate full settlement summary (equivalent to print_settlement_summary)
 */
function calculate_settlement_summary(people, expenses) {
  const paid = total_paid(people, expenses);
  const owed = total_owed(people, expenses);
  const balances = net_balances(people, expenses);
  const payments = suggested_settlements(balances);

  const summary = people.map(person => {
    const p = paid[person] || 0;
    const o = owed[person] || 0;
    const b = balances[person] || 0;
    return {
      person,
      paid: p,
      owed: o,
      balance: b,
      status: b > 0 ? 'receives' : b < 0 ? 'owes' : 'settled'
    };
  });

  const totalExpense = expenses.reduce((sum, e) => toRupees(toPaise(sum) + toPaise(e.amount)), 0);

  return {
    people,
    expenses,
    totalExpense,
    summary,
    payments
  };
}

module.exports = {
  split_equally,
  total_paid,
  total_owed,
  net_balances,
  suggested_settlements,
  calculate_settlement_summary
};
