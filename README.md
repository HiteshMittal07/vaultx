# VaultX

VaultX is a professional-grade secure vault for digital assets, built with modern web technologies and a focus on security and user experience.

## 🚀 Features

- **Secure Authentication**: Powered by Privy with support for social logins and embedded wallets.
- **Blockchain Ready**: Integrated with Wagmi and Viem for seamless On-chain interactions.
- **Professional UI**: Clean, responsive design using Tailwind CSS.
- **Modern Tech Stack**: Next.js 16 (App Router), React 19, and TypeScript.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Auth/Embedded Wallets**: [Privy](https://www.privy.io/)
- **Ethereum/Chain Interaction**: [Wagmi](https://wagmi.sh/) & [Viem](https://viem.sh/)
- **State Management**: [TanStack Query](https://tanstack.com/query)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

## 📦 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd vaultx
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and add your `NEXT_PUBLIC_PRIVY_APP_ID`.*

4. Run the development server:
   ```bash
   pnpm dev
   ```

## 🏗 Project Structure

```text
src/
├── app/          # Next.js App Router components, pages, and layouts
├── components/   # Reusable UI components
├── config/       # Third-party service configurations (Privy, Wagmi, etc.)
├── providers/    # Context providers (Auth, QueryClient, etc.)
└── lib/          # Utility functions and shared logic
```

## 📄 License

This project is licensed under the MIT License.
