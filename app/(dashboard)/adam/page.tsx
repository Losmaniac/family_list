/**
 * "Adam" — embeds the standalone "Velká garáž" toddler vehicle-playground
 * game (a separate self-contained HTML/CSS/JS project, no build step, no
 * dependencies — see public/adam-garage/) via an iframe, rather than
 * porting it into this app's React/Tailwind stack. It's a from-scratch,
 * fully independent little app already built and working on its own; an
 * iframe keeps it that way without dragging its own DOM/canvas-heavy game
 * loop into this app's component tree.
 */
export default function AdamPage() {
  return (
    <div className="h-[calc(100dvh-9rem)] overflow-hidden rounded-xl border border-border">
      <iframe src="/adam-garage/index.html" title="Velká garáž" className="h-full w-full border-0" allow="autoplay" />
    </div>
  );
}
