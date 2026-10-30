import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Expense, SettlementSummaryResponse, SuggestedPayment } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly STORAGE_PEOPLE = 'smartsplit_people';
  private readonly STORAGE_EXPENSES = 'smartsplit_expenses';

  // In-memory state with LocalStorage persistence for instant single-try Vercel deployment
  private people: string[] = [];
  private expenses: Expense[] = [];

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const savedPeople = localStorage.getItem(this.STORAGE_PEOPLE);
      if (savedPeople) {
        this.people = JSON.parse(savedPeople);
      }
      const savedExpenses = localStorage.getItem(this.STORAGE_EXPENSES);
      if (savedExpenses) {
        this.expenses = JSON.parse(savedExpenses);
      }
    } catch (e) {
      this.people = [];
      this.expenses = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_PEOPLE, JSON.stringify(this.people));
      localStorage.setItem(this.STORAGE_EXPENSES, JSON.stringify(this.expenses));
    } catch (e) {
      // ignore
    }
  }

  getTrip(): Observable<{ people: string[]; expenses: Expense[] }> {
    return of({ people: [...this.people], expenses: [...this.expenses] });
  }

  addPerson(name: string): Observable<string> {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return throwError(() => ({ error: { error: 'Please enter a name.' } }));
    }
    if (this.people.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      return throwError(() => ({ error: { error: 'That name is already in the group.' } }));
    }
    this.people.push(trimmed);
    this.saveToStorage();
    return of(trimmed);
  }

  removePerson(name: string): Observable<any> {
    const trimmed = (name || '').trim().toLowerCase();
    this.people = this.people.filter(p => p.toLowerCase() !== trimmed);
    this.expenses = this.expenses.filter(e => e.paid_by.toLowerCase() !== trimmed);
    this.expenses.forEach(e => {
      e.participants = e.participants.filter(p => p.toLowerCase() !== trimmed);
    });
    this.expenses = this.expenses.filter(e => e.participants.length > 0);
    this.saveToStorage();
    return of({ success: true, people: [...this.people], expenses: [...this.expenses] });
  }

  addExpense(expense: Expense): Observable<Expense> {
    const trimmedDesc = (expense.description || '').trim();
    if (!trimmedDesc) {
      return throwError(() => ({ error: { error: 'Please enter a description.' } }));
    }
    const numAmount = Number(expense.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return throwError(() => ({ error: { error: 'Please enter an amount greater than zero.' } }));
    }
    if (!expense.paid_by || !this.people.includes(expense.paid_by)) {
      return throwError(() => ({ error: { error: `Please choose one of the listed people: ${this.people.join(', ')}` } }));
    }
    if (!Array.isArray(expense.participants) || expense.participants.length === 0) {
      return throwError(() => ({ error: { error: 'Please select at least one participant.' } }));
    }

    const newExp: Expense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      description: trimmedDesc,
      amount: Number(numAmount.toFixed(2)),
      paid_by: expense.paid_by,
      participants: [...expense.participants]
    };

    this.expenses.push(newExp);
    this.saveToStorage();
    return of(newExp);
  }

  deleteExpense(id: string): Observable<any> {
    this.expenses = this.expenses.filter(e => e.id !== id);
    this.saveToStorage();
    return of({ success: true });
  }

  getSettlements(): Observable<SettlementSummaryResponse> {
    const totalCents = (amt: number) => Math.round(Number(amt) * 100);
    const toRupees = (paise: number) => Number((paise / 100).toFixed(2));

    // split_equally
    const splitEqually = (amount: number, count: number): number[] => {
      if (count <= 0) return [];
      const cents = totalCents(amount);
      const base = Math.floor(cents / count);
      const rem = cents % count;
      const shares: number[] = [];
      for (let i = 0; i < count; i++) {
        shares.push(toRupees(base + (i < rem ? 1 : 0)));
      }
      return shares;
    };

    // total_paid
    const paid: Record<string, number> = {};
    for (const p of this.people) paid[p] = 0;
    for (const exp of this.expenses) {
      if (paid[exp.paid_by] !== undefined) {
        paid[exp.paid_by] = toRupees(totalCents(paid[exp.paid_by]) + totalCents(exp.amount));
      } else {
        paid[exp.paid_by] = Number(exp.amount);
      }
    }

    // total_owed
    const owed: Record<string, number> = {};
    for (const p of this.people) owed[p] = 0;
    for (const exp of this.expenses) {
      const shares = splitEqually(exp.amount, exp.participants.length);
      exp.participants.forEach((p, idx) => {
        if (owed[p] !== undefined) {
          owed[p] = toRupees(totalCents(owed[p]) + totalCents(shares[idx]));
        } else {
          owed[p] = shares[idx];
        }
      });
    }

    // net_balances
    const balances: Record<string, number> = {};
    for (const p of this.people) {
      balances[p] = toRupees(totalCents(paid[p] || 0) - totalCents(owed[p] || 0));
    }

    // suggested_settlements (Greedy)
    const creditors = Object.entries(balances)
      .filter(([_, amt]) => amt > 0)
      .map(([person, amt]) => ({ person, amountPaise: totalCents(amt) }))
      .sort((a, b) => b.amountPaise - a.amountPaise || a.person.localeCompare(b.person));

    const debtors = Object.entries(balances)
      .filter(([_, amt]) => amt < 0)
      .map(([person, amt]) => ({ person, amountPaise: -totalCents(amt) }))
      .sort((a, b) => b.amountPaise - a.amountPaise || a.person.localeCompare(b.person));

    const payments: SuggestedPayment[] = [];
    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];
      const amt = Math.min(creditor.amountPaise, debtor.amountPaise);

      if (amt > 0) {
        payments.push({
          payer: debtor.person,
          payee: creditor.person,
          amount: toRupees(amt)
        });
      }

      creditor.amountPaise -= amt;
      debtor.amountPaise -= amt;

      if (creditor.amountPaise === 0) cIdx++;
      if (debtor.amountPaise === 0) dIdx++;
    }

    const summary = this.people.map(person => {
      const p = paid[person] || 0;
      const o = owed[person] || 0;
      const b = balances[person] || 0;
      return {
        person,
        paid: p,
        owed: o,
        balance: b,
        status: (b > 0 ? 'receives' : b < 0 ? 'owes' : 'settled') as 'receives' | 'owes' | 'settled'
      };
    });

    const totalExpense = this.expenses.reduce((sum, e) => toRupees(totalCents(sum) + totalCents(e.amount)), 0);

    return of({
      people: [...this.people],
      expenses: [...this.expenses],
      totalExpense,
      summary,
      payments
    });
  }

  clearTrip(): Observable<any> {
    this.people = [];
    this.expenses = [];
    this.saveToStorage();
    return of({ success: true });
  }
}
