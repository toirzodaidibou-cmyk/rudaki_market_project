// template (на layout) ҳангоми ҳар гузариш ба саҳифаи дигар аз нав сохта мешавад —
// аз ин рӯ аниматсияи CSS-и "page-enter" ҳар дафъа аз нав иҷро мешавад.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex flex-1 flex-col">{children}</div>;
}
