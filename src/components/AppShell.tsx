import { useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

export function AppShell({ children, sidebar }: AppShellProps) {
  const aboutDialogRef = useRef<HTMLDialogElement | null>(null);

  const closeFromBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  };

  return (
    <>
      <main className="app-shell">
        <section className="map-region" aria-label="Las Vegas guessing map">
          <header className="atlas-masthead">
            <div>
              <p className="atlas-kicker">Las Vegas Valley · Road Atlas No. 01</p>
              <div className="atlas-title-row">
                <span className="atlas-route-shield" aria-hidden="true">LV</span>
                <p className="atlas-title">Learning Las Vegas</p>
              </div>
            </div>
            <div className="atlas-meta">
              <p className="atlas-edition">Street &amp; intersection atlas<br />2026 edition</p>
              <button
                type="button"
                className="atlas-about-link"
                onClick={() => aboutDialogRef.current?.showModal()}
              >
                About
              </button>
            </div>
          </header>
          <div className="map-frame">{children}</div>
        </section>
        <aside className="game-sidebar" aria-label="Game controls">
          {sidebar}
        </aside>
      </main>
      <dialog
        ref={aboutDialogRef}
        className="about-dialog"
        aria-labelledby="about-dialog-title"
        onClick={closeFromBackdrop}
      >
        <form method="dialog" className="about-dialog-card">
          <p className="panel-kicker">About</p>
          <h2 id="about-dialog-title">Why I built this</h2>
          <p>
            I moved to Las Vegas several years ago. One of our friends, Melissa, is a native and whenever we talk about any place in the city, she inevitably says, “oh you mean the one at {"<specific intersection>"}?”... to which the rest of us always respond with a shrug because outside of a few major streets, we have no idea where anything is.
          </p>
          <p className="about-dialog-punchline">
            <strong>WELL NO LONGER.</strong> Now you too can learn to be like Melissa.
          </p>
          <section className="about-dialog-tech" aria-labelledby="about-tech-title">
            <h3 id="about-tech-title">Learning Las Vegas is built with...</h3>
            <p>
              React, TypeScript, and Vite power the game. MapLibre renders OpenFreeMap’s OpenStreetMap-based vector map. Street mode uses simplified OpenStreetMap road geometry that is checked into the project, so guesses can be scored against the full shape of each road rather than a single point.
            </p>
          </section>
          <button type="submit" className="button button-primary">Close</button>
        </form>
      </dialog>
    </>
  );
}
