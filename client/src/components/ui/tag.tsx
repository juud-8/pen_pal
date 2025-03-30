import { ClassValue } from "clsx";
import { cn } from "@/lib/utils";

interface TagProps {
  text: string;
  color?: "blue" | "green" | "orange" | "purple" | "gray";
  className?: ClassValue;
  onClick?: () => void;
}

/**
 * Tag component for displaying metadata tags in Scribe style
 */
export function Tag({ text, color = "blue", className, onClick }: TagProps) {
  // Color variants
  const colorVariants = {
    blue: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    green: "bg-green-100 text-green-800 hover:bg-green-200",
    orange: "bg-orange-100 text-orange-800 hover:bg-orange-200",
    purple: "bg-purple-100 text-purple-800 hover:bg-purple-200",
    gray: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
        colorVariants[color],
        onClick ? "cursor-pointer" : "",
        className
      )}
      onClick={onClick}
    >
      {text}
    </span>
  );
}

/**
 * TagGroup component for displaying a group of tags with consistent spacing
 */
export function TagGroup({ children, className }: { children: React.ReactNode, className?: ClassValue }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  );
}