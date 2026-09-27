"use client"

import { useQuery } from "@tanstack/react-query"
import { Building2Icon, SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { useMe } from "@/components/app/me-context"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { bffFetch } from "@/lib/api/client"
import { visibleNavigation } from "@/lib/navigation"
import type { SearchResult } from "@/types/api"

/**
 * Global Cmd/Ctrl+K search. Navigation today; clients, tax periods,
 * calculations, forms, documents and exceptions are added as their APIs land
 * (a server-side search endpoint, never client-side filtering of tenant data).
 */
export function CommandMenu() {
  const me = useMe()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState("")
  const q = useDebounced(term.trim(), 200)
  const results = useQuery({
    queryKey: ["search", q],
    queryFn: async () => (await bffFetch<{ data: SearchResult[] }>(`search?q=${encodeURIComponent(q)}`)).data,
    enabled: open && q.length >= 2,
    staleTime: 10_000,
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  return (
    <>
      <Button
        variant="outline"
        className="text-muted-foreground h-8 w-8 justify-center gap-2 px-0 font-normal sm:w-64 sm:justify-start sm:px-2.5"
        onClick={() => setOpen(true)}
        aria-label="Search (Ctrl+K)"
      >
        <SearchIcon className="size-4" aria-hidden />
        <span className="hidden flex-1 text-left sm:inline">Search…</span>
        <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search pages, clients and records">
        <Command>
          <CommandInput placeholder="Search pages, clients, periods, forms…" value={term} onValueChange={setTerm} />
          <CommandList>
            <CommandEmpty>{results.isFetching ? "Searching…" : "No results."}</CommandEmpty>
            {results.data?.length ? (
              <CommandGroup heading="Clients">
                {results.data.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={`client ${result.title} ${result.subtitle ?? ""} ${q}`}
                    onSelect={() => go(result.href)}
                  >
                    <Building2Icon aria-hidden />
                    <span className="flex-1 truncate">{result.title}</span>
                    {result.subtitle ? (
                      <span className="text-muted-foreground truncate text-xs">{result.subtitle}</span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {visibleNavigation(me.permissions).map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`${item.title} ${(item.keywords ?? []).join(" ")}`}
                    onSelect={() => go(item.href)}
                  >
                    <item.icon aria-hidden />
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
