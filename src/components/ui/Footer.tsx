// Site footer, rendered inside Layout so it appears on every real page (Home, Quiz,
// Results, Legal). Its links are hash anchors — App turns #impressum / #privacy / #terms
// into the Legal overlay — so the Impressum is reachable in one click from every page
// (German § 5 DDG). No JS needed here; the browser sets the hash, App reacts to it.
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <nav className="site-footer__links" aria-label="Legal">
        <a href="#privacy">Imprint &amp; Privacy</a>
        <a href="#terms">Terms</a>
      </nav>
      <p className="site-footer__brand">© {year} anyma</p>
    </footer>
  );
}
