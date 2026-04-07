export default function SourceList({ sources }) {
  return (
    <div className="sources">
      <strong>Sources:</strong>
      <ul>
        {sources.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}
