import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let colorClass = "";

  switch (normalized) {
    case "active":
    case "paid":
    case "present":
      variant = "default";
      colorClass = "bg-green-100 text-green-800 hover:bg-green-100 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
      break;
    case "inactive":
    case "absent":
      variant = "secondary";
      colorClass = "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
      break;
    case "pending":
    case "partial":
    case "late":
      variant = "secondary";
      colorClass = "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      break;
    case "failed":
      variant = "destructive";
      break;
    default:
      variant = "outline";
  }

  return (
    <Badge variant={variant} className={cn("capitalize px-2.5 py-0.5 font-medium border", colorClass, className)}>
      {status}
    </Badge>
  );
}
