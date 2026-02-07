"use client";

import { SwapCard } from "@/components/swap";
import { AuthPageWrapper } from "@/components/layout/AuthPageWrapper";

export default function SwapPage() {
  return (
    <AuthPageWrapper horizontalCenter>
      <div className="flex justify-center w-full">
        <SwapCard />
      </div>
    </AuthPageWrapper>
  );
}
