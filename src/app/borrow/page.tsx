"use client";

import { BorrowDashboard } from "@/components/borrow/BorrowDashboard";
import { AuthPageWrapper } from "@/components/layout/AuthPageWrapper";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function BorrowPage() {
  return (
    <AuthPageWrapper>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        }
      >
        <BorrowDashboard />
      </Suspense>
    </AuthPageWrapper>
  );
}
