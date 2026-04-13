"use client";

// Simple native select wrapper component
// For filtering/dropdowns - uses native HTML select

import { createContext, useContext } from "react";

type SelectContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a Select provider");
  }
  return context;
}

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
};

export function Select({ value, onValueChange, className, children }: SelectProps) {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { value, onValueChange } = useSelectContext();
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={className}
    >
      {children}
    </select>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useSelectContext();
  return value ? <option value={value}>{value}</option> : <option value="">{placeholder || "Select"}</option>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>;
}