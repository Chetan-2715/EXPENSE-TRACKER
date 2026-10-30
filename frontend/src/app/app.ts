import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api.service';
import { JqueryService } from './services/jquery.service';
import { Expense, SummaryRow, SuggestedPayment, SettlementSummaryResponse } from './models/expense.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // People & Expenses (starts completely empty)
  people = signal<string[]>([]);
  expenses = signal<Expense[]>([]);

  // Settlement Results
  settlementData = signal<SettlementSummaryResponse | null>(null);

  // Form Inputs
  newPersonName = '';
  expenseForm = {
    description: '',
    amount: null as number | null,
    paid_by: '',
    participants: [] as string[]
  };

  loading = signal<boolean>(false);

  constructor(
    private api: ApiService,
    private jq: JqueryService
  ) {}

  ngOnInit(): void {
    this.loadTripData();
  }

  loadTripData(): void {
    this.api.getTrip().subscribe({
      next: (trip) => {
        this.people.set(trip.people || []);
        this.expenses.set(trip.expenses || []);
        this.calculateSettlements();
      },
      error: (err) => {
        console.error('Error fetching trip data', err);
      }
    });
  }

  calculateSettlements(): void {
    if (this.people().length === 0 || this.expenses().length === 0) {
      this.settlementData.set(null);
      return;
    }

    this.api.getSettlements().subscribe({
      next: (data) => {
        this.settlementData.set(data);
        // jQuery pulse on settlement results
        setTimeout(() => {
          this.jq.pulseElement('#settlement-results-card');
        }, 50);
      },
      error: (err) => {
        console.error('Error computing settlements', err);
      }
    });
  }

  // 1. Add Person
  onAddPerson(): void {
    const trimmed = this.newPersonName.trim();
    if (!trimmed) {
      this.jq.shakeElement('#input-person');
      this.jq.showToast('Validation', 'Please enter a name.', 'warning');
      return;
    }

    if (this.people().some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      this.jq.shakeElement('#input-person');
      this.jq.showToast('Duplicate', 'That name is already in the group.', 'warning');
      return;
    }

    this.api.addPerson(trimmed).subscribe({
      next: (added) => {
        this.people.update(list => [...list, added]);
        this.newPersonName = '';
        this.jq.showToast('Person Added', `"${added}" added to the group.`, 'success');
        
        // Auto-select in expense form
        if (!this.expenseForm.paid_by) {
          this.expenseForm.paid_by = added;
        }
        if (!this.expenseForm.participants.includes(added)) {
          this.expenseForm.participants.push(added);
        }
        this.calculateSettlements();
      },
      error: (err) => {
        this.jq.showToast('Error', err.error?.error || 'Could not add person', 'error');
      }
    });
  }

  // Remove Person
  onRemovePerson(person: string): void {
    this.api.removePerson(person).subscribe({
      next: () => {
        this.people.update(list => list.filter(p => p !== person));
        this.expenses.update(list => list.filter(e => e.paid_by !== person && e.participants.includes(person) === false));
        this.expenseForm.participants = this.expenseForm.participants.filter(p => p !== person);
        if (this.expenseForm.paid_by === person) {
          this.expenseForm.paid_by = this.people()[0] || '';
        }
        this.jq.showToast('Removed', `"${person}" removed.`, 'info');
        this.calculateSettlements();
      },
      error: (err) => {
        this.jq.showToast('Error', err.error?.error || 'Could not remove person', 'error');
      }
    });
  }

  // Toggle participant checkbox
  toggleParticipant(person: string): void {
    const idx = this.expenseForm.participants.indexOf(person);
    if (idx > -1) {
      this.expenseForm.participants.splice(idx, 1);
    } else {
      this.expenseForm.participants.push(person);
    }
  }

  selectAllParticipants(): void {
    this.expenseForm.participants = [...this.people()];
  }

  clearParticipants(): void {
    this.expenseForm.participants = [];
  }

  // Add Expense
  onAddExpense(): void {
    const { description, amount, paid_by, participants } = this.expenseForm;

    if (!description.trim()) {
      this.jq.shakeElement('#input-desc');
      this.jq.showToast('Validation', 'Please enter a description.', 'warning');
      return;
    }

    if (!amount || amount <= 0 || isNaN(amount)) {
      this.jq.shakeElement('#input-amount');
      this.jq.showToast('Validation', 'Please enter an amount greater than zero.', 'warning');
      return;
    }

    if (!paid_by) {
      this.jq.shakeElement('#select-payer');
      this.jq.showToast('Validation', 'Please select who paid.', 'warning');
      return;
    }

    if (!participants || participants.length === 0) {
      this.jq.shakeElement('#participants-box');
      this.jq.showToast('Validation', 'Please select at least one participant.', 'warning');
      return;
    }

    this.api.addExpense({
      description: description.trim(),
      amount: Number(amount),
      paid_by,
      participants
    }).subscribe({
      next: (exp) => {
        this.expenses.update(list => [...list, exp]);
        this.jq.showToast('Expense Added', `"${exp.description}" of ₹${exp.amount.toFixed(2)} recorded.`, 'success');
        
        // Reset expense form fields
        this.expenseForm.description = '';
        this.expenseForm.amount = null;
        this.expenseForm.participants = [...this.people()];

        this.calculateSettlements();
      },
      error: (err) => {
        this.jq.showToast('Error', err.error?.error || 'Could not record expense.', 'error');
      }
    });
  }

  // Delete Expense
  onDeleteExpense(id?: string): void {
    if (!id) return;
    this.api.deleteExpense(id).subscribe({
      next: () => {
        this.expenses.update(list => list.filter(e => e.id !== id));
        this.jq.showToast('Deleted', 'Expense removed.', 'info');
        this.calculateSettlements();
      },
      error: (err) => {
        this.jq.showToast('Error', err.error?.error || 'Failed to delete expense.', 'error');
      }
    });
  }

  // Clear Trip / Reset to 0
  onClearTrip(): void {
    if (!confirm('Clear all people and expenses for this trip?')) return;
    this.api.clearTrip().subscribe({
      next: () => {
        this.people.set([]);
        this.expenses.set([]);
        this.settlementData.set(null);
        this.expenseForm = {
          description: '',
          amount: null,
          paid_by: '',
          participants: []
        };
        this.jq.showToast('Trip Cleared', 'All data reset. Ready for a new trip!', 'info');
      }
    });
  }

  // Load Prompt Example (Chetan ₹600, Rahul ₹300, Akash ₹0)
  loadPromptExample(): void {
    this.api.clearTrip().subscribe(() => {
      this.api.addPerson('Chetan').subscribe(() => {
        this.api.addPerson('Rahul').subscribe(() => {
          this.api.addPerson('Akash').subscribe(() => {
            this.people.set(['Chetan', 'Rahul', 'Akash']);
            this.api.addExpense({
              description: 'Dinner',
              amount: 600,
              paid_by: 'Chetan',
              participants: ['Chetan', 'Rahul', 'Akash']
            }).subscribe((exp1) => {
              this.api.addExpense({
                description: 'Cabs',
                amount: 300,
                paid_by: 'Rahul',
                participants: ['Chetan', 'Rahul', 'Akash']
              }).subscribe((exp2) => {
                this.expenses.set([exp1, exp2]);
                this.calculateSettlements();
                this.jq.showToast(
                  'Case Study Loaded',
                  'Loaded Chetan (₹600), Rahul (₹300), Akash (₹0) example.',
                  'success'
                );
              });
            });
          });
        });
      });
    });
  }

  // Copy Summary formatted exactly like Python print_settlement_summary
  copyTextSummary(): void {
    const data = this.settlementData();
    if (!data) return;

    const lines = [
      'Trip input recorded',
      '==================',
      `People: ${data.people.join(', ')}`,
      `Expenses: ${data.expenses.length}`,
      ...data.expenses.map((e, idx) => 
        `${idx + 1}. ${e.description} - ${e.amount.toFixed(2)} (paid by ${e.paid_by}; shared by ${e.participants.join(', ')})`
      ),
      '',
      'Settlement summary',
      '==================',
      'Person         Paid       Share     Balance',
      '-------------------------------------------',
      ...data.summary.map(s => 
        `${s.person.padEnd(12)} ${s.paid.toFixed(2).padStart(8)}   ${s.owed.toFixed(2).padStart(8)}   ${(s.balance >= 0 ? '+' : '') + s.balance.toFixed(2).padStart(8)}`
      ),
      '',
      `Suggested payments (${data.payments.length}):`,
      ...(data.payments.length === 0 ? ['  Everyone is settled up - no payments needed.'] : 
        data.payments.map(p => `  ${p.payer} pays ${p.payee} ${p.amount.toFixed(2)}`))
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      this.jq.showToast('Copied', 'CLI formatted summary copied to clipboard.', 'success');
    });
  }

  // Initials for avatar
  getInitials(name: string): string {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  }
}
