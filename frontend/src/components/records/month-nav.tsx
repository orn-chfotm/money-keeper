"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shiftMonth, type YearMonth } from "@/lib/date";

type MonthNavProps = {
  month: YearMonth;
  onChange: (month: YearMonth) => void;
};

export function MonthNav({ month, onChange }: MonthNavProps) {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="icon"
        aria-label="이전 달"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft />
      </Button>
      <h2 className="text-lg font-semibold">
        {month.year}년 {month.month}월
      </h2>
      <Button
        variant="outline"
        size="icon"
        aria-label="다음 달"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
