"use client";

import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Field, inputClasses } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  const selected = options.find((o) => o.value === value);

  return (
    <Field label={label}>
      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className={cn(inputClasses, "relative flex w-full items-center text-left")}>
            <span className="block truncate">{selected?.label ?? value}</span>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-ink-muted" />
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="glass-card absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl py-1 text-sm shadow-lg shadow-black/10 focus:outline-none dark:shadow-black/40">
              {options.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active, selected }) =>
                    cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-2",
                      active && "bg-gold-500/10",
                      selected && "text-accent",
                    )
                  }
                >
                  {({ selected }) => (
                    <>
                      <Check className={cn("size-3.5", selected ? "opacity-100" : "opacity-0")} />
                      {option.label}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </Field>
  );
}
