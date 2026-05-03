export type PropRow = {
  name: string;
  type: string;
  default?: string;
  description: string;
};

export default function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-4 font-semibold">Name</th>
            <th className="py-2 pr-4 font-semibold">Type</th>
            <th className="py-2 pr-4 font-semibold">Default</th>
            <th className="py-2 pr-4 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-border align-top">
              <td className="py-2 pr-4 font-mono text-xs">{row.name}</td>
              <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{row.type}</td>
              <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                {row.default ?? "—"}
              </td>
              <td className="py-2 pr-4">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
