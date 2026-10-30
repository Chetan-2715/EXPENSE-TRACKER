/**
 * In-Memory & Local JSON Store for Smart Expense Splitter
 * Direct clean implementation of the Trip model from the Python specification.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

class ExpenseStore {
  constructor() {
    this.members = [];
    this.expenses = [];
    this.loadFromFile();
  }

  loadFromFile() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.members)) this.members = data.members;
        if (Array.isArray(data.expenses)) this.expenses = data.expenses;
      }
    } catch (err) {
      this.members = [];
      this.expenses = [];
    }
  }

  saveToFile() {
    try {
      const data = {
        members: this.members,
        expenses: this.expenses
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not write to data.json', err.message);
    }
  }

  clearAll() {
    this.members = [];
    this.expenses = [];
    this.saveToFile();
    return { members: [], expenses: [] };
  }

  getMembers() {
    return [...this.members];
  }

  setMembers(list) {
    if (!Array.isArray(list)) list = [];
    this.members = list.map(n => (n || '').trim()).filter(Boolean);
    this.saveToFile();
    return [...this.members];
  }

  addMember(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Please enter a name.');
    }
    if (this.members.some(m => m.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`That name is already in the group.`);
    }
    this.members.push(trimmed);
    this.saveToFile();
    return trimmed;
  }

  removeMember(name) {
    const trimmed = (name || '').trim();
    this.members = this.members.filter(m => m.toLowerCase() !== trimmed.toLowerCase());
    // Also remove from expenses participants if any
    this.expenses = this.expenses.filter(e => e.paid_by.toLowerCase() !== trimmed.toLowerCase());
    this.expenses.forEach(e => {
      e.participants = e.participants.filter(p => p.toLowerCase() !== trimmed.toLowerCase());
    });
    this.expenses = this.expenses.filter(e => e.participants.length > 0);
    this.saveToFile();
    return trimmed;
  }

  getExpenses() {
    return [...this.expenses];
  }

  addExpense({ description, amount, paid_by, participants }) {
    const trimmedDesc = (description || '').trim();
    if (!trimmedDesc) {
      throw new Error('Please enter a description.');
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Please enter an amount greater than zero.');
    }

    if (!paid_by || !this.members.includes(paid_by)) {
      throw new Error(`Please choose one of the listed people: ${this.members.join(', ')}`);
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      throw new Error('Please enter at least one participant.');
    }

    // Validate participants
    for (const p of participants) {
      if (!this.members.includes(p)) {
        throw new Error(`Unknown participant: ${p}`);
      }
    }

    const newExpense = {
      id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      description: trimmedDesc,
      amount: Number(numAmount.toFixed(2)),
      paid_by,
      participants
    };

    this.expenses.push(newExpense);
    this.saveToFile();
    return newExpense;
  }

  deleteExpense(id) {
    const idx = this.expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      const removed = this.expenses.splice(idx, 1)[0];
      this.saveToFile();
      return removed;
    }
    return null;
  }
}

const store = new ExpenseStore();
module.exports = store;
