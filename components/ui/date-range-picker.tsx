// components/ui/date-range-picker.tsx
"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar as CalendarIcon, AlertTriangle } from "lucide-react";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export function DateRangePicker() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange>({ from: undefined, to: undefined });

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (range) {
      setPendingRange(range);
      setShowConfirmDialog(true);
    }
  };

  const confirmRange = () => {
    setDateRange(pendingRange);
    setShowConfirmDialog(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Date Range Selector
        </CardTitle>
        <CardDescription>
          Select a date range for your report or analytics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={(range) => handleRangeSelect(range as DateRange | undefined)}
          numberOfMonths={2}
          className="rounded-md border"
        />
        
        <div className="flex justify-between items-center text-sm">
          <div className="text-muted-foreground">
            Selected Range:
          </div>
          <div className="font-medium">
            {dateRange.from ? format(dateRange.from, "PPP") : "Start date"} - 
            {dateRange.to ? format(dateRange.to, "PPP") : "End date"}
          </div>
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Date Range
              </AlertDialogTitle>
              <AlertDialogDescription>
                You have selected the following date range:
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p><strong>From:</strong> {pendingRange.from ? format(pendingRange.from, "PPP") : "Not selected"}</p>
                  <p><strong>To:</strong> {pendingRange.to ? format(pendingRange.to, "PPP") : "Not selected"}</p>
                  <p className="mt-2 text-xs">
                    This will generate a report for {pendingRange.from && pendingRange.to 
                      ? Math.ceil((pendingRange.to.getTime() - pendingRange.from.getTime()) / (1000 * 60 * 60 * 24)) 
                      : 0} days
                  </p>
                </div>
                <br />
                This action will update your analytics data. Do you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRange}>
                Confirm Selection
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}