# VaultX

**VaultX** is a next-generation DeFi borrowing application built on **Arbitrum**, offering a seamless, **gasless user experience** powered by Account Abstraction. Users can sign up with just an email, deposit USDT, and instantly access liquidity by borrowing against Gold (XAUt) without ever managing distinct gas tokens or complex wallet approvals.

---

## 🚀 Key Features

### 🔐 Seamless Authentication & Smart Wallets

- **Email-Based Login**: Powered by **[Privy](https://www.privy.io/)**, allowing users to onboard instantly without needing a pre-existing Web3 wallet.
- **Smart Accounts**: Integrates **[Biconomy Nexus](https://biconomy.io/)** (EIP-7702) to upgrade user accounts into smart wallets.
- **Gasless Transactions**: All interactions are gas-sponsored via a custom backend relay, removing the barrier of holding ETH for fees.

### 💰 Core DeFi Capabilities

- **One-Click Swaps**: Integrated **Uniswap V3** Universal Router for efficient, atomic swaps between USDT and XAUt0.
- **Lending & Borrowing**: Direct integration with **[Morpho Blue](https://morpho.org/)** on Arbitrum (XAUt0/USDT0 market).
- **Precision Management**:
  - **Risk-Aware LTV**: Real-time Loan-to-Value monitoring with dynamic color-coding (Safe/Warning/Danger).
  - **Auto-Calculated Max**: Smart "MAX" buttons for Repay and Withdraw that handle collateral precision (6 decimals) and prevent dust.
  - **Safety Guards**: Prevents over-repayment and under-collateralized borrowing attempts.

### ⚡ Real-Time Data through Oracles

- **Pyth Network**: Fetches sub-second price updates for XAUt and USDT to ensure accurate portfolio valuation and liquidation risk assessment.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript / React 19
- **Styling**: Tailwind CSS 4, Framer Motion (Glassmorphism UI)
- **Blockchain Interaction**: [Viem](https://viem.sh/) (with Experimental Account Abstraction features)
- **Auth**: @privy-io/react-auth
- **DeFi Integrations**:
  - Uniswap V3 SDK / Quoter
  - Morpho Blue Contracts
  - Pyth Hermes API

---

## 🏗 Architecture

The application uses a hybrid architecture to ensure a Web2-like experience on Web3 rails:

1.  **Frontend**: Constructs `UserOperations` (UserOps) for batch transactions (e.g., Approve + Swap, or Approve + Supply + Borrow).
2.  **Signing**: Users sign these ops via their embedded Privy signer (Passkey/Email).
3.  **Backend Relay**: A protected API route (`/api/aa/execute`) receives the signed UserOp and executes it on-chain and relaying makes it gasless for user.

---

## 📦 Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/yourusername/vaultx.git
    cd vaultx
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory:

    ```bash
    cp .env.example .env
    ```

    Ensure you have the following variables set:

    ```env
    NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
    ```

4.  **Run the development server:**

    ```bash
    pnpm dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📄 License

This project is licensed under the MIT License.
