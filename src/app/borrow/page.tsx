"use client";

import { BorrowDashboard } from "@/components/borrow/BorrowDashboard";
import { AuthPageWrapper } from "@/components/layout/AuthPageWrapper";

export default function BorrowPage() {
  return (
    <AuthPageWrapper>
      <BorrowDashboard />
    </AuthPageWrapper>
  );
}
