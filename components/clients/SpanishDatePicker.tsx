"use client";

import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/public/Input";

interface SpanishDatePickerProps {
  value: string; // ISO string YYYY-MM-DD
  onChange: (isoDate: string) => void;
}

// Convert YYYY-MM-DD to DD-MM-YYYY for display
function formatIsoToDisplay(isoStr: string) {
  if (!isoStr) return "";
  const clean = isoStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year.length === 4) {
      return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
    }
  }
  return isoStr;
}

export default function SpanishDatePicker({
  value,
  onChange,
}: SpanishDatePickerProps) {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const [displayText, setDisplayText] = useState(() =>
    formatIsoToDisplay(value),
  );

  useEffect(() => {
    setDisplayText(formatIsoToDisplay(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setDisplayText(rawVal);

    // If user typed DD-MM-YYYY or DD/MM/YYYY or 8 digits
    const cleanDigits = rawVal.replace(/[^0-9]/g, "");
    if (cleanDigits.length === 8) {
      const day = cleanDigits.slice(0, 2);
      const month = cleanDigits.slice(2, 4);
      const year = cleanDigits.slice(4, 8);

      const dNum = parseInt(day, 10);
      const mNum = parseInt(month, 10);
      const yNum = parseInt(year, 10);

      if (
        dNum >= 1 &&
        dNum <= 31 &&
        mNum >= 1 &&
        mNum <= 12 &&
        yNum >= 2000 &&
        yNum <= 2100
      ) {
        const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        onChange(iso);
      }
    }
  };

  const handleOpenPicker = () => {
    if (hiddenInputRef.current) {
      if ("showPicker" in hiddenInputRef.current) {
        try {
          (
            hiddenInputRef.current as HTMLInputElement & {
              showPicker: () => void;
            }
          ).showPicker();
        } catch {
          hiddenInputRef.current.click();
        }
      } else {
        hiddenInputRef.current.click();
      }
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <Input
        type="text"
        placeholder="DD-MM-AAAA"
        value={displayText}
        onChange={handleInputChange}
        className="font-mono pr-9 text-xs"
      />
      <button
        type="button"
        onClick={handleOpenPicker}
        className="absolute right-2 text-grayscale-9 hover:text-grayscale-12 cursor-pointer p-1"
        title="Seleccionar fecha (DD-MM-AAAA)"
      >
        <CalendarDotsIcon size={16} />
      </button>
      <input
        ref={hiddenInputRef}
        type="date"
        value={value}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
            setDisplayText(formatIsoToDisplay(e.target.value));
          }
        }}
        className="sr-only opacity-0 pointer-events-none absolute size-0"
      />
    </div>
  );
}
