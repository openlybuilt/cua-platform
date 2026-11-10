"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  compact?: boolean;
  className?: string;
  children: ReactNode;
  returnFocus?: () => boolean;
};

export function Dialog({ open, onOpenChange, title, description, compact = false, className = "", children, returnFocus }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content onCloseAutoFocus={(event) => { if (returnFocus?.()) event.preventDefault(); }} className={`dialog-content${compact ? " dialog-content--compact" : ""}${className ? ` ${className}` : ""}`} {...(!description ? { "aria-describedby": undefined } : {})}>
          <div className="dialog-heading">
            <div><DialogPrimitive.Title className="dialog-title">{title}</DialogPrimitive.Title>{description && <DialogPrimitive.Description className="dialog-description">{description}</DialogPrimitive.Description>}</div>
            <DialogPrimitive.Close className="dialog-close" aria-label="Close"><X size={18} aria-hidden="true" /></DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
