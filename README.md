# Smart Expense Splitter

Direct Full-Stack Web Implementation of the Python Smart Expense Splitter in **Angular + Node.js/Express + jQuery**.

---

## 1. What It Does (1-to-1 Python Port)

The web app directly implements the interactive trip expense collection and greedy settlement algorithm from the Python code:

1. **Trip People (`people: List[str]`):**
   - Starts completely clean (0 pre-loaded members).
   - Enter group members dynamically (e.g., Chetan, Rahul, Akash).
   - Instant chips with delete (`×`) option.

2. **Trip Expenses (`expenses: List[Expense]`):**
   - **Description:** What was bought (e.g. `Dinner`, `Cabs`).
   - **Amount:** Validated positive amount in ₹.
   - **Paid by:** Pick from the added group members.
   - **Participants:** Checkbox selection of who shared the expense.

3. **Calculations (`split_equally`, `total_paid`, `total_owed`, `net_balances`):**
   - Equal cent/paise split with remainder distribution.
   - Net Balance = Total Paid − Share Owed.
   - Positive balance = receives money.
   - Negative balance = owes money.

4. **Greedy Settlements (`suggested_settlements`):**
   - Pairs largest debtor with largest creditor repeatedly until every balance reaches 0.
   - **Example:**
     - Chetan pays ₹600 (Share = ₹300, Balance = +₹300)
     - Rahul pays ₹300 (Share = ₹300, Balance = ₹0)
     - Akash pays ₹0 (Share = ₹300, Balance = -₹300)
     - **Result:** **Akash pays Chetan ₹300.00**.

---

## 2. Servers & Localhost Links

Both servers are running:

- **Frontend (Angular App):** 👉 **[http://localhost:4200/](http://localhost:4200/)**
- **Backend (Express REST API):** 👉 **[http://localhost:3000/api/trip](http://localhost:3000/api/trip)**

---

## 3. How to Run Manually

```bash
# Terminal 1: Backend
cd backend
npm start
# Runs on http://localhost:3000

# Terminal 2: Frontend
cd frontend
npm start
# Runs on http://localhost:4200
```
