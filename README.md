# Smart Expense Splitter 💸

A modern, interactive, and mathematically accurate **Full Stack Web Application** designed for fair shared expense splitting and transaction minimization among friends, roommates, and travel groups.

Built with **HTML5, CSS3, Angular, TypeScript, Node.js + Express.js, and jQuery**.

---

## 🌟 Live Demo & Deployment

This application is fully optimized for **single-click Vercel deployment** with zero configuration required.

- **Vercel Ready:** Self-contained client-side calculation engine with `localStorage` persistence.
- **Zero Cold Starts / Network Failures:** Works seamlessly online, offline, on mobile, and on desktop.
- **Optional Express REST API:** Included in the `backend/` folder for local full-stack server execution.

---

## 🚀 Key Features

### 1. Dynamic Member & Trip Management
- Start with a clean slate (0 pre-loaded members or expenses).
- Add group members dynamically with real-time validation and deduplication.
- Interactive avatar chips with initials and one-click removal.

### 2. Fair Shared Expense Entry
- Enter expense description and amount in Indian Rupees (`₹`).
- Select the payer from the active group members.
- Select sharing participants using intuitive checkbox toggles with quick helpers (**All** / **Clear**).
- Support for asymmetric participation (e.g., payer is not a participant, or only a subset of members join an activity).

### 3. Exact Balance Calculation (Integer Paise Arithmetic)
- Every expense is divided equally among its selected participants.
- The person who paid receives credit for the full out-of-pocket amount.
- **Net Balance Formula:**
  $$\text{Net Balance} = \text{Total Paid Out-of-Pocket} - \text{Total Fair Share Owed}$$
- **Zero Floating-Point Drift:** Uses integer paise (`1 INR = 100 paise`) internally. Any leftover remainder paise from uneven splits are distributed one each to the first participants so total shares sum back to the exact bill amount.
- **Zero-Sum Ledger Guarantee:** The sum of all net balances always equals ₹0.00.

### 4. Greedy Settlement Minimizer
- Uses a greedy two-pointer creditor/debtor matching algorithm.
- Reduces pairwise debts from $O(N^2)$ bilateral transfers down to at most **$(N - 1)$ transactions**.
- **Case Study Example:**
  - Chetan pays ₹600 (Fair share: ₹300, Net Balance: +₹300)
  - Rahul pays ₹300 (Fair share: ₹300, Net Balance: ₹0)
  - Akash pays ₹0 (Fair share: ₹300, Net Balance: -₹300)
  - **Settlement Result:** **Akash pays Chetan ₹300.00** (exactly 1 transaction!).

### 5. Interactive jQuery Polish
- **Animated Notification Toasts:** Floating slide-down/fade-out alert messages (`.slideDown(250)` and `.fadeOut(300)`).
- **DOM Glow Pulse:** Smooth highlight animations when calculations update.
- **Input Error Shake:** Visual vibration feedback when invalid input is submitted.
- **Copy Output Summary:** Exports a clean CLI-formatted settlement summary to the clipboard with one click.

---

## 🛠️ Technology Stack

| Layer | Technology | Role & Implementation Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **Angular** (v21) | Standalone components, reactive Signals, Form handling, TypeScript |
| **Structure & Styling** | **HTML5 & CSS3** | Custom SaaS light theme, CSS variables, Flexbox & CSS Grid, responsive layout |
| **DOM Interactions** | **jQuery** | Floating toast notifications, input shake animations, glowing highlight pulses |
| **Logic & Calculations**| **JavaScript / TypeScript** | Direct port of Python expense splitting and greedy settlement algorithms |
| **Backend & REST API** | **Node.js & Express.js** | In-memory & JSON store, REST endpoints, unified production static hosting |
| **Hosting & CI/CD** | **Vercel** | Automated zero-config deployment via `vercel.json` |

---

## 📁 Project Structure

```
EXPENSE-TRACKER/
├── vercel.json                      # Vercel deployment & SPA rewrite routing
├── package.json                     # Root orchestrator build script
├── .gitignore                       # Ignored node_modules, dist, logs, caches
├── README.md                        # Documentation & project guide
│
├── frontend/                        # Angular Web Application
│   ├── vercel.json                  # Frontend-specific Vercel fallback configuration
│   ├── angular.json                 # Angular build & budget configuration
│   ├── package.json                 # Angular 21, jQuery, RxJS, TypeScript
│   └── src/
│       ├── index.html               # HTML5 shell with Google Fonts & Bootstrap Icons
│       ├── styles.css               # Global theme & jQuery notification styles
│       └── app/
│           ├── app.ts               # Component controller with reactive Signals
│           ├── app.html             # Clean 2-column interactive UI template
│           ├── app.css              # Responsive layout & component styles
│           ├── app.config.ts        # Angular providers & HttpClient setup
│           ├── models/
│           │   └── expense.model.ts # TypeScript interfaces (Expense, Settlement, etc.)
│           └── services/
│               ├── api.service.ts   # Client calculation engine & storage service
│               └── jquery.service.ts# jQuery DOM interactions & toast alerts
│
└── backend/                         # Node.js & Express.js REST API
    ├── server.js                    # Express REST endpoints & static delivery
    ├── package.json                 # Express & CORS dependencies
    ├── services/
    │   └── calculator.js            # Ported Python calculation & settlement logic
    ├── data/
    │   └── store.js                 # In-memory data store
    ├── test-calc.js                 # Algorithm unit tests
    └── verify-api.js                # Automated backend integration test suite
```

---

## ⚙️ How It Works (Step-by-Step)

```
[1. User enters Group Members]
               │
               ▼
[2. User enters Expenses (Payer & Sharing Participants)]
               │
               ▼
[3. Real-Time Calculation Engine]
    ├── Calculate Total Paid (Out-of-Pocket)
    ├── Split each expense equally among selected participants (Integer Paise)
    ├── Calculate Total Owed per member
    └── Net Balance = Paid - Owed
               │
               ▼
[4. Greedy Settlement Matching]
    ├── Sort Creditors (Net Balance > 0) descending
    ├── Sort Debtors (Net Balance < 0) descending
    └── Iteratively match largest debtor with largest creditor
               │
               ▼
[5. Interactive UI Display]
    ├── Settlement Summary Table (Paid | Share | Balance)
    └── Suggested Minimal Payments (Debtor ➔ Creditor)
```

---

## 💻 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` (bundled with Node.js)

### Option 1: Run Frontend (Recommended)
```bash
# Navigate to frontend and install dependencies
cd frontend
npm install

# Start development server
npm start
```
Open **[http://localhost:4200/](http://localhost:4200/)** in your browser.

### Option 2: Run Express Backend
```bash
# Navigate to backend and install dependencies
cd backend
npm install

# Start Express server
npm start
```
Express server runs on **[http://localhost:3000/](http://localhost:3000/)**.

---

## 🌐 Deploy to Vercel (1-Click)

1. Fork or push this repository to your GitHub account (`https://github.com/Chetan-2715/EXPENSE-TRACKER`).
2. Log in to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import the `EXPENSE-TRACKER` repository.
4. Keep the default settings (Framework: *Other* or *Angular*, Root Directory: `./`).
5. Click **"Deploy"**.
6. Vercel will run `cd frontend && npm install && npm run build` and publish your live app in under 60 seconds!

---

## 📄 License

This project is created for educational and Full Stack Development case study evaluation. Feel free to use and adapt!
