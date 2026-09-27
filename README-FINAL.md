# PACE — Complete Personal Finance System

> **Spend with intention. Save with purpose.**

High-performance, secure personal finance platform built with React 19, Vite, Node.js, Express, and MongoDB. Engineered with banking-grade security, verified Google Identity Services (GIS) OAuth 2.0, automated Nodemailer notifications, month-aware financial calculations, milestone event tracking, and loan prepayment amortization simulations.

---

## 🌟 What's New in PACE (Master Architecture)

### 1. 🏷️ 7-Transaction-Type Classification Architecture
Transactions are strictly segregated to maintain pristine accounting integrity:
- **`income`**: Regular salary, freelance, dividends, interest, rental income.
- **`expense`**: Everyday living expenses (Groceries, Dining, Rent, Utilities, Transport, Shopping).
- **`savings`**: Emergency fund, fixed deposits, liquid savings.
- **`investment`**: SIPs, Mutual Funds, Stocks, Gold, Crypto, EPF/PPF.
- **`debt_repayment`**: Loan EMIs, Credit card bill settlements, Personal loan payments.
- **`transfer`**: Neutral self-transfers between personal bank accounts / wallets.
- **`cash_withdrawal`**: Neutral ATM withdrawals (liquid cash conversion).

> **Rule 1 (Living Spending Isolation):**  
> `Actual Living Spending` strictly includes only `expense` transactions. Money routed to savings, investments, loan debt repayments, or internal transfers is never treated as lifestyle spending.

---

### 2. 🗓️ Monthly Financial Engine & Net Available Cash Flow Formula
- Seamless month-to-month switcher (`[ ‹ ] [ September 2026 ] [ › ]` + "Jump to Current Month").
- Transparent, audit-proof Net Available Cash Flow equation displayed directly on the dashboard:
$$\text{Net Available Cash Flow} = \text{Total Income} - (\text{Actual Living Spending} + \text{Savings} + \text{Investments} + \text{Debt Repayments})$$
- Internal transfers and ATM withdrawals are tracked as neutral movements and do not reduce cash flow.
- 5 Financial Pillars Grid:
  1. 💵 **Total Inflow (Income)**
  2. 🛒 **Actual Living Spending**
  3. 🛡️ **Savings**
  4. 📈 **Investments**
  5. 💳 **Debt Repayments**

---

### 3. 🏛️ Major Head Hierarchy
Transactions are aggregated across 5 top-level financial heads:
1. **Essentials**: Rent, Groceries, Utilities, Health, Transportation.
2. **Lifestyle**: Dining Out, Entertainment, Subscriptions, Shopping, Travel.
3. **Financial Commitments**: Home Loan EMI, Car Loan, Insurance Premiums, Debt Paydown.
4. **Wealth & Future**: Index Funds, SIPs, Stocks, Emergency Reserve, Retirement.
5. **Internal Transfers**: Self Account transfers, ATM Cash withdrawals.

---

### 4. 💍 Milestone Events Module
Dedicated lifecycle tracking for major financial events (e.g. *Rohan & Priya Wedding*, *Europe Summer Vacation*, *Home Renovation*):
- Total budget, total spent, remaining funds, and % utilization progress bar.
- Category-level breakdown (e.g., Venue & Catering, Outfits & Jewelry, Photography, Travel).
- Monthly timeline showing exactly when event expenses occurred.
- Linked transaction list with tag badges.
- **Zero-Redundancy Principle**: Transactions link dynamically via `eventId`; totals and distributions are aggregated on-the-fly without data duplication.

---

### 5. 💳 Loans, EMIs & "What If I Pay Extra?" Simulator
Comprehensive debt tracking and proactive debt-freedom simulations:
- Tracks Principal, Outstanding Balance, Interest Rate (% p.a.), Tenure, Monthly EMI, and Due Day.
- **Dynamic Amortization Engine**: Breaks each monthly payment into Principal vs. Interest components.
- **"What if I pay extra?" Prepayment Simulator**:
  - Interactive slider + quick preset chips (+₹1,000, +₹2,000, +₹5,000, +₹10,000).
  - Calculates exact months shaved off tenure and total interest saved in ₹.
  - Compares original payoff date vs accelerated payoff date.
  - **Smart Surplus Recommender**: Analyzes user's net available cash flow for the month and recommends an optimal, safe prepayment amount without stressing living liquidity.

---

### 6. 📊 Reports & Month-to-Month Insights
- Side-by-side month comparison (e.g., September 2026 vs August 2026).
- 5-Pillar comparative delta table with percentage shifts.
- Major Head comparison with visual variance indicators.
- Category-by-category shift audit highlighting lifestyle creep and savings improvements.

---

## 🛡️ Total Security Architecture

1. **Helmet HTTP Security Headers**:
   - Strict Content Security Policy (CSP) tailored for Google Identity Services & inline assets.
   - HSTS (`Strict-Transport-Security` with 1-year max-age & includeSubDomains).
   - Anti-clickjacking (`X-Frame-Options: SAMEORIGIN`).
   - MIME sniffing prevention (`X-Content-Type-Options: nosniff`).
   - Cross-Origin Resource Policy & Referrer Policy.

2. **Multi-Tier Rate Limiting (`express-rate-limit`)**:
   - **Auth Limiter**: Max 20 attempts / 15 minutes on `/login` & `/register` to stop brute-force attacks.
   - **OTP Limiter**: Max 6 requests / 15 minutes to prevent email flooding.
   - **Global API Limiter**: 400 requests / 15 minutes for DDoS defense.

3. **NoSQL Injection & XSS Sanitization**:
   - Deep recursive sanitizer strips MongoDB query operators (`$gt`, `$ne`, `$where`, etc.) and dot-notation keys.
   - Strips malicious `<script>` tags from incoming payload strings.

4. **BOLA / IDOR Defense**:
   - All transactions, budgets, goals, events, and loans require a valid signed JWT bearer token.
   - All database updates and deletions verify `userId === req.user.id`.

5. **Timing-Safe Password & OTP Security**:
   - Password hashing with `bcryptjs` using 12 salt rounds.
   - User enumeration mitigation on `/forgot-password`.
   - 6-digit OTP codes hashed with SHA-256 with 10-minute expiry and invalidation after 5 failed attempts.

---

## 🔑 Google OAuth 2.0 & Automated Email Notifications

### Google Identity Services (GIS)
- Official GIS client button in `GoogleSignInButton.jsx`.
- Backend verification using `google-auth-library` (verifies token integrity, audience, and email verification status).
- Auto-provisions user accounts and fires automated welcome alerts.

### Automated Email Notifications (`nodemailer`)
- 🎉 **Welcome Email**: New account registration onboarding.
- 🛡️ **Sign-in Security Alert Email**: Timestamp, IP address, and device metadata upon successful login.
- 🔑 **Password Reset OTP Email**: High-priority security PIN with expiry countdown.
- ✅ **Password Changed Confirmation**: Instant notification when credentials change.
- 🚨 **Budget Guard Alert Email**: Automated warning when month expenses exceed 80% or 100% threshold.

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally on port 27017, or MongoDB Atlas URI)

### 1. Setup Backend
```bash
cd server
npm install
npm start
```
*Backend server runs on `http://localhost:5000`.*

### 2. Verify Security & Email Suite
```bash
cd server
npm run test:security
```

### 3. Setup Frontend
```bash
# In the root project directory:
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

### 4. Build for Production
```bash
npm run build
```
*Creates optimized production bundle in `/dist`.*

---

## ⚙️ Environment Variables

### Backend (`server/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pace
JWT_SECRET=your_jwt_secret_key_2026
JWT_EXPIRES_IN=30d
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# SMTP Email Configuration (e.g. Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_digit_app_password
EMAIL_FROM="PACE Finance" <no-reply@pace.finance>

FRONTEND_URL=http://localhost:5173
```

### Frontend (`.env`):
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## 📂 Project Structure

```
Pace/
├── public/                 # Static assets, PWA icons, manifest
├── server/
│   ├── config/             # MongoDB connection configuration
│   ├── middleware/         # Helmet, JWT auth, rate-limiters, NoSQL sanitizer
│   ├── models/             # User, Transaction, Budget, Goal, Event, Loan schemas
│   ├── routes/             # Auth, Transactions, Budgets, Goals, Events, Loans, Notifications
│   ├── services/           # Nodemailer email service, security logger
│   ├── index.js            # Express application entry point
│   ├── package.json
│   └── test-security-email.js
├── src/
│   ├── components/         # MonthSwitcher, EventsPage, LoansPage, ReportsPage,
│   │                       # TransactionModal, GoogleSignInButton, OCR scanner
│   ├── services/           # Axios API client (auth, transactions, events, loans)
│   ├── utils/              # FinancialEngine (5 pillars, amortization, cash flow, simulator)
│   ├── App.jsx             # PACE Core App & multi-page navigation
│   ├── App.css             # Fintech dark theme & responsive UI
│   └── main.jsx            # React root mount & PWA service worker registration
├── index.html
├── package.json
├── vite.config.js
└── README.md
```
