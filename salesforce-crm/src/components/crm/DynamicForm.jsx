import { useEffect, useState } from "react";

import { CRM_OBJECTS } from "../../config/objects";
import { crmService } from "../../services/crmService";
import { usePermissions } from "../../hooks/usePermissions";

import Input from "../common/Input";
import Dropdown from "../common/Dropdown";
import Button from "../common/Button";

// Generate display name for related records
function getRecordLabel(object, record) {
  switch (object) {
    case "accounts":
      return record.name || record.id;

    case "contacts":
    case "leads":
      return (
        [record.firstName, record.lastName]
          .filter(Boolean)
          .join(" ") || record.id
      );

    case "opportunities":
      return record.name || record.id;

    case "cases":
    case "tasks":
      return record.subject || record.id;

    default:
      return record.name || record.id;
  }
}

export default function DynamicForm({
  object,
  initialData,
  onSubmit,
  onCancel
}) {
  const config = CRM_OBJECTS[object];
  const { canView } = usePermissions();

  const [formData, setFormData] = useState(
    initialData || {}
  );

  const [relationshipOptions, setRelationshipOptions] =
    useState({});

  const [relationshipErrors, setRelationshipErrors] =
    useState({});

  const [loadingRelationships, setLoadingRelationships] =
    useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState("");

  // Initialize form data
  useEffect(() => {
    setFormData(initialData || {});
    setFormError("");
  }, [initialData, object]);

  // Load dynamic relationship options
  useEffect(() => {
    let active = true;

    const loadRelationships = async () => {
      setLoadingRelationships(true);
      setRelationshipOptions({});
      setRelationshipErrors({});

      const relationshipFields =
        config?.fields.filter(
          field => field.type === "relationship"
        ) || [];

      const relatedObjects = [
        ...new Set(
          relationshipFields.map(
            field => field.relatedObject
          )
        )
      ];

      const results = await Promise.allSettled(
        relatedObjects.map(async relatedObject => {
          if (!canView(relatedObject)) {
            throw new Error(
              `You do not have access to ${relatedObject}`
            );
          }

          const records =
            await crmService.getAll(relatedObject);

          if (!Array.isArray(records)) {
            throw new Error("Invalid records response");
          }

          return records
            .filter(record => record.id != null)
            .map(record => ({
              value: String(record.id),
              label: String(
                getRecordLabel(relatedObject, record)
              )
            }))
            .sort((a, b) =>
              a.label.localeCompare(b.label)
            );
        })
      );

      const options = {};
      const errors = {};

      results.forEach((result, index) => {
        const relatedObject = relatedObjects[index];

        if (result.status === "fulfilled") {
          options[relatedObject] = result.value;
        } else {
          errors[relatedObject] =
            result.reason?.message ||
            "Unable to load related records";
        }
      });

      if (active) {
        setRelationshipOptions(options);
        setRelationshipErrors(errors);
        setLoadingRelationships(false);
      }
    };

    loadRelationships();

    return () => {
      active = false;
    };
  }, [config, canView]);

  // Update individual form field
  const updateField = (name, value) => {
    setFormData(previous => ({
      ...previous,
      [name]: value
    }));

    setFormError("");
  };

  // Prepare options for a relationship dropdown
  const getRelationshipOptions = field => {
    const options = [
      ...(relationshipOptions[field.relatedObject] || [])
    ];

    const currentValue = formData[field.name];

    // Preserve an existing relationship if the related
    // record is no longer accessible to this user.
    if (
      currentValue != null &&
      currentValue !== "" &&
      !options.some(
        option =>
          String(option.value) === String(currentValue)
      )
    ) {
      options.unshift({
        value: String(currentValue),
        label: `Current record (${currentValue})`
      });
    }

    return options;
  };

  // Preserve existing static dropdown values
  const getStaticOptions = field => {
    const options = [...(field.options || [])];
    const currentValue = formData[field.name];

    if (
      currentValue &&
      !options.includes(currentValue)
    ) {
      options.unshift(currentValue);
    }

    return options;
  };

  // Validate and submit form
  const handleSubmit = async e => {
    e.preventDefault();

    if (submitting || loadingRelationships) {
      return;
    }

    setFormError("");

    for (const field of config.fields) {
      const value = formData[field.name];

      if (
        field.required &&
        (
          value === undefined ||
          value === null ||
          String(value).trim() === ""
        )
      ) {
        setFormError(`${field.label} is required`);
        return;
      }

      if (
        field.type === "relationship" &&
        value != null &&
        value !== ""
      ) {
        const options =
          relationshipOptions[field.relatedObject] || [];

        const validSelection = options.some(
          option =>
            String(option.value) === String(value)
        );

        const unchangedRelationship =
          initialData?.[field.name] != null &&
          String(initialData[field.name]) ===
            String(value);

        if (
          !validSelection &&
          !unchangedRelationship
        ) {
          setFormError(
            `Please select a valid ${field.label}`
          );

          return;
        }
      }
    }

    try {
      setSubmitting(true);

      await onSubmit(formData);
    } catch (error) {
      setFormError(
        error.message || "Unable to save record"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!config) return null;

  return (
    <form onSubmit={handleSubmit}>

      {formError && (
        <div className="alert alert-danger">
          {formError}
        </div>
      )}

      <div className="dynamic-form-grid">
        {config.fields.map(field => (
          <div key={field.name}>

            {/* Dynamic relationship dropdown */}
            {field.type === "relationship" ? (
              <>
                <Dropdown
                  label={field.label}
                  value={formData[field.name] ?? ""}
                  options={getRelationshipOptions(field)}
                  required={field.required}
                  disabled={
                    loadingRelationships ||
                    Boolean(
                      relationshipErrors[
                        field.relatedObject
                      ]
                    )
                  }
                  placeholder={
                    loadingRelationships
                      ? "Loading records..."
                      : relationshipErrors[
                          field.relatedObject
                        ]
                      ? "Records unavailable"
                      : `Select ${field.label}`
                  }
                  onChange={value =>
                    updateField(field.name, value)
                  }
                />

                {relationshipErrors[
                  field.relatedObject
                ] && (
                  <small className="text-danger">
                    {
                      relationshipErrors[
                        field.relatedObject
                      ]
                    }
                  </small>
                )}

                {!loadingRelationships &&
                  !relationshipErrors[
                    field.relatedObject
                  ] &&
                  (
                    relationshipOptions[
                      field.relatedObject
                    ] || []
                  ).length === 0 && (
                    <small className="text-muted">
                      No related records available.
                    </small>
                  )}
              </>

            /* Static dropdown */
            ) : field.type === "select" ? (
              <Dropdown
                label={field.label}
                value={formData[field.name] ?? ""}
                options={getStaticOptions(field)}
                required={field.required}
                onChange={value =>
                  updateField(field.name, value)
                }
              />

            /* Textarea */
            ) : field.type === "textarea" ? (
              <div className="form-group">
                <label>
                  {field.label}
                  {field.required && (
                    <span style={{ color: "red" }}>
                      {" *"}
                    </span>
                  )}
                </label>

                <textarea
                  className="form-control"
                  value={formData[field.name] ?? ""}
                  required={field.required}
                  onChange={e =>
                    updateField(
                      field.name,
                      e.target.value
                    )
                  }
                />
              </div>

            /* Normal input */
            ) : (
              <Input
                label={field.label}
                type={field.type}
                value={formData[field.name] ?? ""}
                required={field.required}
                onChange={value =>
                  updateField(field.name, value)
                }
              />
            )}

          </div>
        ))}
      </div>

      <div className="form-actions">
        <Button
          type="submit"
          disabled={
            submitting || loadingRelationships
          }
        >
          {submitting ? "Saving..." : "Save"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}