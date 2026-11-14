import type { ComponentType, ReactNode } from "react";
import {
  Calendar,
  ChevronDown,
  CircleDot,
  Clock,
  FileText,
  FileUp,
  Gauge,
  Hash,
  Heading,
  Link,
  ListChecks,
  Mail,
  Minus,
  Phone,
  SquareCheck,
  Star,
  TextAlignStart,
  ToggleLeft,
  Type,
} from "lucide-react";
import type { FieldType } from "@/lib/forms/schema";

export const typeIcons: Record<FieldType, ComponentType<{ className?: string }>> = {
  short_text: Type,
  long_text: TextAlignStart,
  email: Mail,
  phone: Phone,
  number: Hash,
  url: Link,
  date: Calendar,
  multiple_choice: CircleDot,
  checkboxes: ListChecks,
  dropdown: ChevronDown,
  rating: Star,
  statement: FileText,
  file: FileUp,
  time: Clock,
  yes_no: ToggleLeft,
  nps: Gauge,
  consent: SquareCheck,
  heading: Heading,
  divider: Minus,
};

export const statusClass: Record<"draft" | "published" | "archived", string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green/10 text-green",
  archived: "bg-border text-muted-foreground",
};

export function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-grey disabled:opacity-30"
    >
      {children}
    </button>
  );
}
