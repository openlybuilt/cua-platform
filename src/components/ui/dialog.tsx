"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
};

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="dialog-content">
          <div className="dialog-heading">
            <div><DialogPrimitive.Title className="dialog-title">{title}</DialogPrimitive.Title><DialogPrimitive.Description className="dialog-description">{description}</DialogPrimitive.Description></div>
            <DialogPrimitive.Close className="dialog-close" aria-label="Close"><X size={18} aria-hidden="true" /></DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
