
import "dotenv/config";
import { readFile } from "node:fs/promises";
import pool from "./db.mjs";

const filePath = new URL("./data/crm.json", import.meta.url);

const dateValue = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 23).replace("T", " ");
};

async function migrate() {
  const connection = await pool.getConnection();

  try {
    const raw = await readFile(filePath, "utf8");
    const data = JSON.parse(raw);

    await connection.beginTransaction();

    const objects = [
      "accounts",
      "contacts",
      "leads",
      "opportunities",
      "cases",
      "tasks"
    ];

    for (const objectType of objects) {
      const records = data[objectType] || [];

      for (const record of records) {
        await connection.execute(
          `INSERT INTO crm_records
          (object_type, id, owner_id, created_date, last_modified_date, data)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          owner_id = VALUES(owner_id),
          created_date = VALUES(created_date),
          last_modified_date = VALUES(last_modified_date),
          data = VALUES(data)`,
          [
            objectType,
            record.Id,
            record.OwnerId || null,
            dateValue(record.CreatedDate),
            dateValue(record.LastModifiedDate),
            JSON.stringify(record)
          ]
        );
      }

      console.log(`${objectType}: ${records.length} records migrated`);
    }

    for (const item of data.audit || []) {
      await connection.execute(
        `INSERT INTO crm_audit
        (id, at, actor_id, actor_name, object_type, operation,
         record_id, label, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        at = VALUES(at),
        actor_id = VALUES(actor_id),
        actor_name = VALUES(actor_name),
        object_type = VALUES(object_type),
        operation = VALUES(operation),
        record_id = VALUES(record_id),
        label = VALUES(label),
        details = VALUES(details)`,
        [
          item.id,
          dateValue(item.at),
          item.actorId || null,
          item.actorName || null,
          item.object || null,
          item.operation || null,
          item.recordId || null,
          item.label || null,
          item.details || ""
        ]
      );
    }

    for (const item of data.workflowRuns || []) {
      await connection.execute(
        `INSERT INTO crm_workflow_runs
        (id, name, trigger_id, action_description, at)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        trigger_id = VALUES(trigger_id),
        action_description = VALUES(action_description),
        at = VALUES(at)`,
        [
          item.Id,
          item.name,
          item.triggerId || null,
          item.actionDescription || "",
          dateValue(item.at)
        ]
      );
    }

    if (data.lastResetAt) {
      await connection.execute(
        `INSERT INTO crm_settings (setting_key, setting_value)
         VALUES ('lastResetAt', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [data.lastResetAt]
      );
    }

    await connection.commit();

    console.log("CRM JSON data successfully migrated to MySQL.");
  } catch (error) {
    await connection.rollback();
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
