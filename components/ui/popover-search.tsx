// components/ui/popover-search.tsx (Searchable popover)
"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PopoverSearchOption {
  label: string;
  value: string;
  description?: string;
  icon?: React.ElementType;
}

interface PopoverSearchProps {
  options: PopoverSearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  onSelect: (value: string) => void;
  selectedValue?: string;
  trigger?: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

export function PopoverSearch({
  options,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  onSelect,
  selectedValue,
  trigger,
  className,
  align = "start",
  side = "bottom",
}: PopoverSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()) ||
    option.description?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" role="combobox" className="w-full justify-between">
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className={cn("w-80 p-0", className)} align={align} side={side}>
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedValue === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSelect(option.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{option.label}</p>
                      {option.description && (
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}