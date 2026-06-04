import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, MapPin, Search } from "lucide-react";
import { useGeocodeLocation, type GeocodeMatch } from "@/hooks/useGeocodeLocation";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function LocationAutocomplete({ label, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(value);
  const [skipNext, setSkipNext] = useState(false);

  // 300ms debounce — only query after user pauses typing
  useEffect(() => {
    if (skipNext) {
      setSkipNext(false);
      setDebounced("");
      return;
    }
    const t = setTimeout(() => setDebounced(value), 300);
    return () => clearTimeout(t);
  }, [value, skipNext]);

  const { data: suggestions = [], isFetching } = useGeocodeLocation(debounced);

  const handleSelect = (s: GeocodeMatch) => {
    setSkipNext(true);
    onChange(s.displayName);
    setOpen(false);
  };

  const showPopover = open && debounced.trim().length >= 3;

  return (
    <div>
      <label className="block text-xs font-bold text-foreground uppercase mb-1.5">{label}</label>
      <Popover open={showPopover} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              autoComplete="off"
              className="h-11 bg-surface text-sm font-medium pl-9 pr-9"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="p-0 w-[--radix-popover-trigger-width] min-w-[var(--radix-popover-trigger-width)]"
          style={{ width: "var(--radix-popover-trigger-width)" }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {suggestions.length === 0 && !isFetching && (
                <CommandEmpty>No matches found.</CommandEmpty>
              )}
              {suggestions.length > 0 && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((s, i) => (
                    <CommandItem
                      key={`${s.lat},${s.lng},${i}`}
                      value={`${s.displayName}-${i}`}
                      onSelect={() => handleSelect(s)}
                      className="flex items-start gap-2 cursor-pointer"
                    >
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="leading-snug text-sm">{s.displayName}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
