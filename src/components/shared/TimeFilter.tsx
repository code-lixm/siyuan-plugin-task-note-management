/*
 * Copyright (c) 2025 by [author]. All Rights Reserved.
 * @Author       : [author]
 * @Date         : 2025-03-19
 * @FilePath     : /src/components/shared/TimeFilter.tsx
 * @Description  : Task time filter component
 */

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimeFilterOption {
  value: string
  label: string
}

interface TimeFilterProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

const timeFilterOptions: TimeFilterOption[] = [
  { value: "all", label: "全部" },
  { value: "today", label: "今天" },
  { value: "tomorrow", label: "明天" },
  { value: "next7days", label: "未来7天" },
  { value: "next30days", label: "未来30天" },
  { value: "overdue", label: "已过期" },
  { value: "completed", label: "已完成" },
  { value: "noDate", label: "无日期" },
]

export function TimeFilter({ value, onChange, className }: TimeFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  const selectedOption = timeFilterOptions.find(opt => opt.value === value) || timeFilterOptions[0]
  
  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }
  
  return (
    <div ref={containerRef} className={cn("relative inline-block w-[180px]", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
      </button>
      
      {/* Dropdown Content */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            "max-h-[300px] overflow-auto"
          )}
          role="listbox"
        >
          {timeFilterOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              )}
              role="option"
              aria-selected={option.value === value}
            >
              {option.value === value && (
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Check className="h-4 w-4" />
                </span>
              )}
              <span className="truncate">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TimeFilter
