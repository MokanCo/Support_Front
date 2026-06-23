"use client";

import { useEffect, useRef, useState } from "react";

export type AddressSuggestion = {
  displayName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

type NominatimResult = {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
};

function toSuggestion(r: NominatimResult): AddressSuggestion {
  const a = r.address;
  const houseNumber = a.house_number ? `${a.house_number} ` : "";
  const street = a.road ? `${houseNumber}${a.road}` : "";
  const city = a.city ?? a.town ?? a.village ?? a.county ?? "";
  return {
    displayName: r.display_name,
    street,
    city,
    state: a.state ?? "",
    zip: a.postcode ?? "",
  };
}

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  required?: boolean;
};

export function AddressAutocomplete({
  label,
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address…",
  required,
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fetching, setFetching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 4) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setFetching(true);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          format: "json",
          addressdetails: "1",
          limit: "6",
          countrycodes: "us",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { "Accept-Language": "en", "User-Agent": "MokancoDesk/1.0" } },
        );
        if (!res.ok) return;
        const data = (await res.json()) as NominatimResult[];
        const mapped = data.map(toSuggestion);
        setSuggestions(mapped);
        setOpen(mapped.length > 0);
        setActiveIndex(-1);
      } catch {
        /* ignore network errors */
      } finally {
        setFetching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function pick(s: AddressSuggestion) {
    onSelect(s);
    setOpen(false);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const inputId = `addr-auto-${label?.replace(/\s+/g, "-").toLowerCase() ?? "field"}`;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative pb-1">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          required={required}
          value={value}
          placeholder=" "
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className="peer block w-full rounded-none border-x-0 border-t-0 border-b border-slate-300 bg-transparent pb-2 pt-6 text-sm text-slate-900 caret-primary-700 placeholder-transparent outline-none transition-colors duration-150 focus:border-primary-600 focus:ring-0"
        />
        {label ? (
          <label
            htmlFor={inputId}
            className="pointer-events-none absolute left-0 top-[1.375rem] origin-[0] text-sm font-medium text-slate-600 transition-[top,font-size,color] duration-200 ease-out motion-reduce:transition-none peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary-700 peer-[&:not(:placeholder-shown)]:top-1 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:text-slate-800"
          >
            {label}
            {required ? <span aria-hidden className="text-red-500"> *</span> : null}
          </label>
        ) : null}
        {fetching ? (
          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            …
          </span>
        ) : null}
      </div>

      {open && suggestions.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.displayName}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`cursor-pointer px-3 py-2.5 text-sm ${
                i === activeIndex ? "bg-primary-50 text-primary-900" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="block font-medium leading-snug">
                {s.street || s.displayName.split(",")[0]}
              </span>
              <span className="block text-xs text-slate-400">
                {[s.city, s.state, s.zip].filter(Boolean).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
