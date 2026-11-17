import type { Catalog } from "@/lib/character/types";

let pending: Promise<Catalog> | null = null;

export function loadCatalog(): Promise<Catalog> {
  if (!pending) {
    pending = fetch("/lpc/catalog.json").then((response) => {
      if (!response.ok) throw new Error("Não foi possível carregar os sprites.");
      return response.json() as Promise<Catalog>;
    });
  }
  return pending;
}
