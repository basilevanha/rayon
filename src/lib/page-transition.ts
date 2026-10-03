export type PageTransition = "push" | "pop";

type Page = { key: string; depth: number };

// Pages de la navigation entre listes : l'accueil (0), puis une liste (1).
// Les réglages s'affichent par-dessus leur liste : même page.
function pageOf(pathname: string): Page | null {
  const path = pathname.replace(/\/+$/, "");
  if (path === "/listes") return { key: path, depth: 0 };
  const list = /^\/listes\/[^/]+/.exec(path);
  return list ? { key: list[0], depth: 1 } : null;
}

// Animation entre deux pages : push en avançant, pop en revenant, rien sinon.
export function pageTransition(
  fromPathname: string | undefined,
  toPathname: string,
): PageTransition | null {
  const from = fromPathname === undefined ? null : pageOf(fromPathname);
  const to = pageOf(toPathname);
  if (!from || !to || from.key === to.key || from.depth === to.depth) return null;
  return to.depth > from.depth ? "push" : "pop";
}
