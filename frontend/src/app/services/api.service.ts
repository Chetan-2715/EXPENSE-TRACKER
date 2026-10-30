import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Expense, SettlementSummaryResponse, SuggestedPayment } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly STORAGE_PEOPLE = 'smartsplit_people';
  private readonly STORAGE_EXPENSES = 'smartsplit_expenses';
  private readonly API_PREFIX = '/api';

  private people: string[] = [];
  private expenses: Expense[] = [];

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const savedPeople = localStorage.getItem(this.STORAGE_PEOPLE);
      if (savedPeople) this.people = JSON.parse(savedPeople);
      const savedExpenses = localStorage.getItem(this.STORAGE_EXPENSES);
      if (savedExpenses) this.expenses = JSON.parse(savedExpenses);
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
    return this.http.get<{ success: boolean; people: string[]; expenses: Expense[] }>(`${this.API_PREFIX}/trip`).pipe(
      map(res => {
        this.people = res.people || [];
        this.expenses = res.expenses || [];
        this.saveToStorage();
        return { people: [...this.people], expenses: [...this.expenses] };
      }),
      catchError(() => {
        return of({ people: [...this.people], expenses: [...this.expenses] });
      })
    );
  }

  addPerson(name: string): Observable<string> {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return throwError(() => ({ error: { error: 'Please enter a name.' } }));
    }

    return this.http.post<{ success: boolean; person: string; people: string[] }>(`${this.API_PREFIX}/members`, { name: trimmed }).pipe(
      map(res => {
        this.people = res.people || [...this.people, res.person];
        this.saveToStorage();
        return res.person;
      }),
      catchError(err => {
        if (err.status === 400 && err.error?.error) {
          return throwError(() => err);
        }
        if (this.people.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
          return throwError(() => ({ error: { error: 'That name is already in the group.' } }));
        }
        this.people.push(trimmed);
        this.saveToStorage();
        return of(trimmed);
      })
    );
  }

  removePerson(name: string): Observable<any> {
    const trimmed = (name || '').trim();
    const enc = encodeURIComponent(trimmed);
    return this.http.delete<any>(`${this.API_PREFIX}/members/${enc}`).pipe(
      tap(res => {
        if (res?.people) this.people = res.people;
        if (res?.expenses) this.expenses = res.expenses;
        this.saveToStorage();
      }),
      catchError(() => {
        const lower = trimmed.toLowerCase();
        this.people = this.people.filter(p => p.toLowerCase() !== lower);
        this.expenses = this.expenses.filter(e => e.paid_by.toLowerCase() !== lower);
        this.expenses.forEach(e => {
          e.participants = e.participants.filter(p => p.toLowerCase() !== lower);
        });
        this.expenses = this.expenses.filter(e => e.participants.length > 0);
        this.saveToStorage();
        return of({ success: true });
      })
    );
  }

  addExpense(expense: Expense): Observable<Expense> {
    return this.http.post<{ success: boolean; expense: Expense }>(`${this.API_PREFIX}/expenses`, expense).pipe(
      map(res => {
        this.expenses.push(res.expense);
        this.saveToStorage();
        return res.expense;
      }),
      catchError(err => {
        if (err.status === 400 && err.error?.error) {
          return throwError(() => err);
        }
        const newExp: Expense = {
          id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          description: expense.description.trim(),
          amount: Number(Number(expense.amount).toFixed(2)),
          paid_by: expense.paid_by,
          participants: [...expense.participants]
        };
        this.expenses.push(newExp);
        this.saveToStorage();
        return of(newExp);
      })
    );
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_PREFIX}/expenses/${id}`).pipe(
      tap(() => {
        this.expenses = this.expenses.filter(e => e.id !== id);
        this.saveToStorage();
      }),
      catchError(() => {
        this.expenses = this.expenses.filter(e => e.id !== id);
        this.saveToStorage();
        return of({ success: true });
      })
    );
  }

  getSettlements(): Observable<SettlementSummaryResponse> {
    return this.http.get<{ success: boolean; data: SettlementSummaryResponse }>(`${this.API_PREFIX}/settlements`).pipe(
      map(res => res.data),
      catchError(() => {
        return of(this.computeLocalSettlements());
      })
    );
  }

  private computeLocalSettlements(): SettlementSummaryResponse {
    const totalCents = (amt: number) => Math.round(Number(amt) * 100);
    const toRupees = (paise: number) => Number((paise / 100).toFixed(2));

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

    const paid: Record<string, number> = {};
    for (const p of this.people) paid[p] = 0;
    for (const exp of this.expenses) {
      if (paid[exp.paid_by] !== undefined) {
        paid[exp.paid_by] = toRupees(totalCents(paid[exp.paid_by]) + totalCents(exp.amount));
      } else {
        paid[exp.paid_by] = Number(exp.amount);
      }
    }

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

    const balances: Record<string, number> = {};
    for (const p of this.people) {
      balances[p] = toRupees(totalCents(paid[p] || 0) - totalCents(owed[p] || 0));
    }

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

    return {
      people: [...this.people],
      expenses: [...this.expenses],
      totalExpense,
      summary,
      payments
    };
  }

  clearTrip(): Observable<any> {
    return this.http.post<any>(`${this.API_PREFIX}/clear`, {}).pipe(
      tap(() => {
        this.people = [];
        this.expenses = [];
        this.saveToStorage();
      }),
      catchError(() => {
        this.people = [];
        this.expenses = [];
        this.saveToStorage();
        return of({ success: true });
      })
    );
  }
}
