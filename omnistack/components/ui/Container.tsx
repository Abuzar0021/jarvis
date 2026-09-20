import { createElement } from "react";
import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return createElement(
    Tag,
    { className: cn("mx-auto w-full max-w-[1240px] px-5 sm:px-8", className) },
    children,
  );
}
