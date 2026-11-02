"use client";
import { Crown } from "lucide-react";

export default function PremiumPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <Crown className="mb-4 h-10 w-10 text-amber-500" />
      <div className="text-[15px] font-semibold text-gray-900">Premium images</div>
      <div className="mt-1 text-[13px] text-gray-600">Licensed stock photos and illustrations, billed per use. Connect a stock provider (e.g. Getty / Shutterstock API) to enable this library.</div>
    </div>
  );
}
