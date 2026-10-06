"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}
type InjectedTabsProps = { activeTab?:string; setActiveTab?:(value:string)=>void };
type TabChild = React.ReactElement<InjectedTabsProps>;

export function Tabs({ defaultValue, className, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div className={cn("w-full", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as TabChild, {
            activeTab,
            setActiveTab,
          });
        }
        return child;
      })}
    </div>
  );
}

export function TabsList({ className, children, activeTab, setActiveTab }: {className?:string;children:React.ReactNode;activeTab?:string;setActiveTab?:(value:string)=>void}) {
  return (
    <div
      className={cn(
        "flex space-x-1 rounded-lg bg-[var(--color-bss-surface)] p-1",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as TabChild, {
            activeTab,
            setActiveTab,
          });
        }
        return child;
      })}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  activeTab,
  setActiveTab,
}: {value:string;className?:string;children:React.ReactNode;activeTab?:string;setActiveTab?:(value:string)=>void}) {
  const isActive = activeTab === value;
  return (
    <button
      className={cn(
        "flex-1 flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-[var(--color-bss-card)] text-[var(--color-bss-text-primary)] shadow-sm"
          : "text-[var(--color-bss-text-secondary)] hover:text-[var(--color-bss-text-primary)] hover:bg-[var(--color-bss-blue-tint)]",
        className
      )}
      onClick={() => setActiveTab?.(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children, activeTab }: {value:string;className?:string;children:React.ReactNode;activeTab?:string}) {
  if (activeTab !== value) return null;
  return (
    <div
      className={cn(
        "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </div>
  );
}
