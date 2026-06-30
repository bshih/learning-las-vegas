import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

export function AppShell({ children, sidebar }: AppShellProps) {
  return (
    <main className="app-shell">
      <section className="map-region" aria-label="Las Vegas guessing map">
        {children}
      </section>
      <aside className="game-sidebar" aria-label="Game controls">
        {sidebar}
      </aside>
    </main>
  );
}
