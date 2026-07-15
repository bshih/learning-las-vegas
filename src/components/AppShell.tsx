import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

export function AppShell({ children, sidebar }: AppShellProps) {
  return (
    <main className="app-shell">
      <section className="map-region" aria-label="Las Vegas guessing map">
        <header className="atlas-masthead">
          <div>
            <p className="atlas-kicker">Las Vegas Valley · Road Atlas No. 01</p>
            <div className="atlas-title-row">
              <span className="atlas-route-shield" aria-hidden="true">LV</span>
              <p className="atlas-title">Melissa Map</p>
            </div>
          </div>
          <p className="atlas-edition">Street &amp; intersection atlas<br />2026 edition</p>
        </header>
        <div className="map-frame">{children}</div>
      </section>
      <aside className="game-sidebar" aria-label="Game controls">
        {sidebar}
      </aside>
    </main>
  );
}
