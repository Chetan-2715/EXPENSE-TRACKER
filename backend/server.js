const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const store = require('./data/store');
const { calculate_settlement_summary } = require('./services/calculator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Smart Expense Splitter API',
    peopleCount: store.getMembers().length,
    expensesCount: store.getExpenses().length
  });
});

// GET /api/trip - Get current people & expenses
app.get('/api/trip', (req, res) => {
  res.json({
    success: true,
    people: store.getMembers(),
    expenses: store.getExpenses()
  });
});

// POST /api/members - Add a person
app.post('/api/members', (req, res) => {
  try {
    const { name } = req.body;
    const added = store.addMember(name);
    res.status(201).json({ success: true, person: added, people: store.getMembers() });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/members/:name - Remove a person
app.delete('/api/members/:name', (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    store.removeMember(name);
    res.json({ success: true, people: store.getMembers(), expenses: store.getExpenses() });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/expenses - Add an expense
app.post('/api/expenses', (req, res) => {
  try {
    const { description, amount, paid_by, participants } = req.body;
    const expense = store.addExpense({ description, amount, paid_by, participants });
    res.status(201).json({ success: true, expense, expenses: store.getExpenses() });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/expenses/:id - Remove an expense
app.delete('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    store.deleteExpense(id);
    res.json({ success: true, expenses: store.getExpenses() });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/settlements - Calculate and return settlements summary
app.get('/api/settlements', (req, res) => {
  try {
    const people = store.getMembers();
    const expenses = store.getExpenses();
    const data = calculate_settlement_summary(people, expenses);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/clear - Clear the entire trip to start fresh
app.post('/api/clear', (req, res) => {
  try {
    store.clearAll();
    res.json({ success: true, message: 'Trip cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve frontend build if available
const staticDistPath = path.join(__dirname, '../frontend/dist/frontend/browser');
if (fs.existsSync(staticDistPath)) {
  app.use(express.static(staticDistPath));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(staticDistPath, 'index.html'));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Smart Expense Splitter Backend listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
