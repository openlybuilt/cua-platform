"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";

type Item = { label: string; onSelect: () => void; disabled?: boolean };

export function Dropdown({ label, items, disabled }: { label: string; items: Item[]; disabled?: boolean }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="dropdown-trigger" disabled={disabled}>{label}<ChevronDown size={16} aria-hidden="true" /></Menu.Trigger>
      <Menu.Portal><Menu.Content className="dropdown-content" align="start" sideOffset={6} collisionPadding={12}>
        {items.map((item) => <Menu.Item key={item.label} className="dropdown-item" disabled={item.disabled} onSelect={item.onSelect}>{item.label}</Menu.Item>)}
      </Menu.Content></Menu.Portal>
    </Menu.Root>
  );
}
