
export default function Table({
  columns = [],
  data = [],
  actions
}) {
  return (
    <div className="table-responsive">
      <table className="table crm-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key}>{column.label}</th>
            ))}
            {actions && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)}>
                No records found
              </td>
            </tr>
          ) : (
            data.map((record, index) => (
              <tr key={record.id ?? index}>
                {columns.map(column => (
                  <td key={column.key}>
                    {record[column.key] ?? "—"}
                  </td>
                ))}
                {actions && <td>{actions(record)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
