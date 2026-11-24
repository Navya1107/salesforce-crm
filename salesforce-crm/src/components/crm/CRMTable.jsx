import Table from "../common/Table";
import { Pencil, Trash2 } from "lucide-react";

export default function CRMTable({
  columns,
  data,
  canUpdate,
  canDelete,
  onEdit,
  onDelete
}) {
  return (
    <Table
      columns={columns}
      data={data}
      actions={record => (
        <div className="table-actions">

          {canUpdate && (
            <button
              type="button"
              className="action-icon edit-icon"
              title="Edit Record"
              aria-label="Edit Record"
              onClick={() => onEdit(record)}
            >
              <Pencil size={16} />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              className="action-icon delete-icon"
              title="Delete Record"
              aria-label="Delete Record"
              onClick={() => onDelete(record)}
            >
              <Trash2 size={16} />
            </button>
          )}

        </div>
      )}
    />
  );
}