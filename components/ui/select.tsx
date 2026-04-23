"use client";

import * as React from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
};

export function Select({
  id,
  value,
  onValueChange,
  className,
  placeholder = "Select",
  disabled = false,
  options,
  children,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  options?: SelectOption[];
  children?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const optionsList: SelectOption[] = React.useMemo(() => {
    if (options && options.length > 0) {
      return options;
    }
    if (children) {
      const items: SelectOption[] = [];
      React.Children.forEach(children, (child) => {
        const isSelectItem =
          React.isValidElement(child) &&
          typeof child.type !== "string" &&
          child.type.name === "SelectItem";

        if (isSelectItem) {
          const childProps = child.props as { value: string; children: React.ReactNode };
          const label = React.Children.toArray(childProps.children).join("");
          items.push({ value: childProps.value, label });
        }
      });
      return items;
    }
    return [];
  }, [options, children]);

  const selectedOption = optionsList.find((opt) => opt.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)} onMouseDown={(e) => e.stopPropagation()}>
      <button
        id={id}
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors",
          "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
          disabled && "opacity-50 cursor-not-allowed",
          !selectedOption && "text-muted-foreground"
        )}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className="absolute z-[60] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-background p-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {optionsList.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onValueChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                option.value === value
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted"
              )}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <CheckIcon className="size-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SelectTrigger({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>;
}

export function SelectContent({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <div data-value={value}>{children}</div>;
}
