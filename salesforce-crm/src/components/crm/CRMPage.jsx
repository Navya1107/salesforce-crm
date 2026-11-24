
import { useCallback, useEffect, useMemo, useState } from "react";
import { CRM_OBJECTS } from "../../config/objects";
import { crmService } from "../../services/crmService";
import { usePermissions } from "../../hooks/usePermissions";
import CRMTable from "./CRMTable";
import DynamicForm from "./DynamicForm";
import Modal from "../common/Modal";
import Button from "../common/Button";

export default function CRMPage({ object }) {
  const config = CRM_OBJECTS[object];
  const {
    canView,
    canCreate,
    canUpdate,
    canDelete
  } = usePermissions();

  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [view, setView] = useState("table");

  const loadRecords = useCallback(async () => {
    if (!canView(object)) return;

    try {
      setLoading(true);
      setError("");

      const result = await crmService.getAll(object);
      setRecords(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message || "Unable to load records");
    } finally {
      setLoading(false);
    }
  }, [object, canView]);

  useEffect(() => {
    setRecords([]);
    setSearch("");
    setModalOpen(false);
    setEditingRecord(null);
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const query = search.toLowerCase();

    return records.filter(record =>
      Object.values(record).some(value =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [records, search]);

  const columns = config.fields.map(field => ({
    key: field.name,
    label: field.label
  }));

  const handleSave = async data => {
    try {
      setError("");

      if (editingRecord) {
        await crmService.update(object, editingRecord.id, data);
      } else {
        await crmService.create(object, data);
      }

      setModalOpen(false);
      setEditingRecord(null);
      await loadRecords();
    } catch (err) {
      setError(err.message || "Unable to save record");
    }
  };

  const handleDelete = async record => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    try {
      setError("");
      await crmService.delete(object, record.id);
      await loadRecords();
    } catch (err) {
      setError(err.message || "Unable to delete record");
    }
  };

  const openCreate = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const openEdit = record => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  if (!canView(object)) {
    return <div className="alert alert-danger">Access denied</div>;
  }

  return (
    <section className="crm-content">
      <div className="crm-heading">
        <div>
          <h2>{config.label}</h2>
          <p>Manage and view your {config.label.toLowerCase()}</p>
        </div>

        {canCreate(object) && (
          <Button onClick={openCreate}>
            + New {config.singular}
          </Button>
        )}
      </div>

      <div className="crm-toolbar">
        <input
          className="form-control search-input"
          placeholder={`Search ${config.label}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="view-switcher">
          {["table", "list", "card"].map(item => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading">Loading records...</div>
      ) : view === "table" ? (
        <CRMTable
          columns={columns}
          data={filteredRecords}
          canUpdate={canUpdate(object)}
          canDelete={canDelete(object)}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : view === "list" ? (
        <div className="record-list">
          {filteredRecords.map(record => (
            <div className="record-list-item" key={record.id}>
              <div>
                <strong>
                  {record.name ||
                    [record.firstName, record.lastName].filter(Boolean).join(" ") ||
                    record.subject ||
                    record.id}
                </strong>
                <p>
                  {config.fields
                    .filter(field => field.name !== "name")
                    .slice(0, 2)
                    .map(field => `${field.label}: ${record[field.name] ?? "—"}`)
                    .join(" · ")}
                </p>
              </div>
              <div className="table-actions">
                {canUpdate(object) && (
                  <Button variant="outline-primary" onClick={() => openEdit(record)}>
                    Edit
                  </Button>
                )}
                {canDelete(object) && (
                  <Button variant="outline-danger" onClick={() => handleDelete(record)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
          {filteredRecords.length === 0 && <p>No records found</p>}
        </div>
      ) : (
        <div className="record-cards">
          {filteredRecords.map(record => (
            <div className="record-card" key={record.id}>
              <h4>
                {record.name ||
                  [record.firstName, record.lastName].filter(Boolean).join(" ") ||
                  record.subject ||
                  record.id}
              </h4>
              {config.fields.slice(0, 4).map(field => (
                <p key={field.name}>
                  <strong>{field.label}:</strong> {record[field.name] ?? "—"}
                </p>
              ))}
              <div className="table-actions">
                {canUpdate(object) && (
                  <Button variant="outline-primary" onClick={() => openEdit(record)}>
                    Edit
                  </Button>
                )}
                {canDelete(object) && (
                  <Button variant="outline-danger" onClick={() => handleDelete(record)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
          {filteredRecords.length === 0 && <p>No records found</p>}
        </div>
      )}

      <div className="record-count">
        Showing {filteredRecords.length} of {records.length} records
      </div>

      {modalOpen && (
        <Modal
          title={`${editingRecord ? "Edit" : "Create"} ${config.singular}`}
          onClose={() => {
            setModalOpen(false);
            setEditingRecord(null);
          }}
        >
          <DynamicForm
            key={`${object}-${editingRecord?.id ?? "new"}`}
            object={object}
            initialData={editingRecord}
            onSubmit={handleSave}
            onCancel={() => {
              setModalOpen(false);
              setEditingRecord(null);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
