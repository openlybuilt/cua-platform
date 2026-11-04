"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string; disabled?: boolean };
type SelectProps = {
  id?: string;
  label: string;
  value: string;
  options: Option[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function Select({ id, label, value, options, disabled, onChange }: SelectProps) {
  const encode = (item: string) => `option:${item}`;
  return (
    <SelectPrimitive.Root value={encode(value)} onValueChange={(next) => onChange(next.slice(7))} disabled={disabled}>
      <SelectPrimitive.Trigger id={id} aria-label={label} className="select-trigger">
        <SelectPrimitive.Value /><SelectPrimitive.Icon><ChevronDown size={16} aria-hidden="true" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal><SelectPrimitive.Content className="select-content" position="popper" sideOffset={6} collisionPadding={12}>
        <SelectPrimitive.Viewport>{options.map((option) => (
          <SelectPrimitive.Item key={option.value} value={encode(option.value)} disabled={option.disabled} className="select-item">
            <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator className="select-indicator"><Check size={15} aria-hidden="true" /></SelectPrimitive.ItemIndicator>
          </SelectPrimitive.Item>
        ))}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content></SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
