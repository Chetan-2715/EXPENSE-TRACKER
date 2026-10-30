export interface Expense {
  id?: string;
  description: string;
  amount: number;
  paid_by: string;
  participants: string[];
}

export interface SummaryRow {
  person: string;
  paid: number;
  owed: number;
  balance: number;
  status: 'receives' | 'owes' | 'settled';
}

export interface SuggestedPayment {
  payer: string;
  payee: string;
  amount: number;
}

export interface SettlementSummaryResponse {
  people: string[];
  expenses: Expense[];
  totalExpense: number;
  summary: SummaryRow[];
  payments: SuggestedPayment[];
}
