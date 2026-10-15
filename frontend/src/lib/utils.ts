import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// shadcn convention: variadic class values, merged so later Tailwind classes win.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
