"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";
import { useShape } from "@/lib/shape-context";
import { fontWeights } from "@/lib/font-weight";

function Input({
  className,
  type = "text",
  style,
  ...props
}: React.ComponentProps<"input">) {
  const shape = useShape();

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 px-3 py-2 text-[13px] text-foreground outline-none transition-[box-shadow,background-color,border-color] duration-80",
        "bg-card ring-1 ring-border",
        "placeholder:text-muted-foreground",
        "focus-visible:ring-[color:var(--focus-ring,#6B97FF)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-destructive/50",
        shape.input,
        className,
      )}
      style={{
        fontVariationSettings: fontWeights.normal,
        ...style,
      }}
      {...props}
    />
  );
}

export { Input };
