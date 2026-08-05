/** Small on-screen build marker so it's obvious whether a change actually reached production. */
export default function AppVersion({ className }: { className?: string }) {
  return <span className={className}>v{process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}</span>;
}
