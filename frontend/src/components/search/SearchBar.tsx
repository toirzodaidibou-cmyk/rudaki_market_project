"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ClockIcon, SearchIcon, XIcon } from "@/components/ui/icons";
import { format, localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import {
  addRecentSearch,
  clearRecentSearches,
  loadRecentSearches,
  removeRecentSearch,
} from "@/lib/recentSearches";

export function SearchBar() {
  const router = useRouter();
  const { locale, dict } = useI18n();
  const t = dict.search;
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);

  // Тугмаи "/" аз ҳар ҷои саҳифа курсорро ба search мебарад.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return;
      }
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const trimmed = query.trim();
  const suggestions = trimmed
    ? recent.filter((r) => r.toLowerCase().includes(trimmed.toLowerCase()))
    : recent;
  const showDropdown = open && suggestions.length > 0;

  function search(term: string) {
    const q = term.trim();
    if (!q) {
      inputRef.current?.focus();
      return;
    }
    setRecent(addRecentSearch(q));
    setQuery(q);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(`${localizePath(locale, "/search")}?q=${encodeURIComponent(q)}`);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!showDropdown) {
        setOpen(true);
        return;
      }
      e.preventDefault();
      const n = suggestions.length;
      setActive((i) =>
        e.key === "ArrowDown" ? (i + 1) % n : i <= 0 ? n - 1 : i - 1,
      );
    } else if (e.key === "Escape") {
      if (open) {
        setOpen(false);
        setActive(-1);
      } else {
        inputRef.current?.blur();
      }
    } else if (e.key === "Enter" && showDropdown && active >= 0) {
      e.preventDefault();
      search(suggestions[active]);
    }
  }

  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        search(query);
      }}
    >
      <div className="flex rounded-2xl bg-accent p-[3px] transition-shadow duration-200 focus-within:shadow-[0_0_0_5px_var(--accent-glow)]">
        <div className="flex min-w-0 flex-1 items-center rounded-[13px] bg-background pr-2 pl-4">
          <input
            ref={inputRef}
            name="q"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showDropdown && active >= 0 ? `${listId}-${active}` : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => {
              setRecent(loadRecentSearches());
              setOpen(true);
            }}
            onBlur={() => {
              setOpen(false);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            className="h-11 w-full min-w-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted sm:h-12 sm:text-base"
          />

          {query ? (
            <button
              type="button"
              aria-label={t.clear}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery("");
                setActive(-1);
                inputRef.current?.focus();
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <XIcon width={16} height={16} />
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="hidden h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-1.5 font-sans text-xs text-muted md:flex"
            >
              /
            </kbd>
          )}
        </div>

        <button
          type="submit"
          aria-label={t.submit}
          className="group flex w-12 shrink-0 items-center justify-center rounded-r-[13px] text-on-accent sm:w-14"
        >
          <SearchIcon
            width={24}
            height={24}
            strokeWidth={2.2}
            className="transition-transform duration-200 group-hover:scale-110 group-active:scale-90"
          />
        </button>
      </div>

      {showDropdown && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-background py-2 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]"
        >
          <div className="flex items-center justify-between px-4 pt-1 pb-2">
            <span className="text-xs font-medium tracking-wide text-muted uppercase">
              {t.recent}
            </span>
            {!trimmed && (
              <button
                type="button"
                onClick={() => {
                  setRecent(clearRecentSearches());
                  setActive(-1);
                }}
                className="text-xs font-medium text-muted transition-colors hover:text-foreground"
              >
                {t.clearAll}
              </button>
            )}
          </div>

          <ul id={listId} role="listbox" aria-label={t.recent}>
            {suggestions.map((term, i) => (
              <li
                key={term}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onClick={() => search(term)}
                onMouseEnter={() => setActive(i)}
                className={`group flex cursor-pointer items-center gap-3 px-4 py-2.5 text-[15px] text-foreground transition-colors ${
                  i === active ? "bg-surface" : ""
                }`}
              >
                <ClockIcon width={16} height={16} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={term} query={trimmed} />
                </span>
                <button
                  type="button"
                  aria-label={format(t.remove, { term })}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRecent(removeRecentSearch(term));
                    setActive(-1);
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted opacity-60 transition hover:bg-surface-hover hover:text-foreground hover:opacity-100"
                >
                  <XIcon width={14} height={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-foreground">
        {text.slice(i, i + query.length)}
      </mark>
      {text.slice(i + query.length)}
    </>
  );
}
