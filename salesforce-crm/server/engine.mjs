
import { randomBytes } from "node:crypto";
import pool from "./db.mjs";
import {
  OBJECTS,
  USERS,
  ROLE_PERMISSIONS,
  STAGE_PROBABILITIES,
  WORKFLOWS
} from "./model.mjs";


const TABLES = {
  leads: "leads",
  accounts: "accounts",
  contacts: "contacts",
  opportunities: "opportunities",
  cases: "cases",
  tasks: "tasks"
};

const FIELDS = {
  leads: {
    Id: "id",
    OwnerId: "owner_id",
    FirstName: "first_name",
    LastName: "last_name",
    Company: "company",
    Email: "email",
    Phone: "phone",
    Status: "status",
    LeadSource: "lead_source",
    Rating: "rating",
    Industry: "industry",
    ConvertedAccountId: "converted_account_id",
    ConvertedContactId: "converted_contact_id",
    ConvertedOpportunityId: "converted_opportunity_id",
    CreatedDate: "created_date",
    LastModifiedDate: "last_modified_date"
  },
  accounts: {
    Id: "id",
    OwnerId: "owner_id",
    Name: "name",
    Industry: "industry",
    Website: "website",
    Phone: "phone",
    AnnualRevenue: "annual_revenue",
    BillingCity: "billing_city",
    CreatedDate: "created_date",
    LastModifiedDate: "last_modified_date"
  },
  contacts: {
    Id: "id",
    OwnerId: "owner_id",
    AccountId: "account_id",
    FirstName: "first_name",
    LastName: "last_name",
    Email: "email",
    Phone: "phone",
    Title: "title",
    CreatedDate: "created_date",
    LastModifiedDate: "last_modified_date"
  },
  opportunities: {
    Id: "id",
    OwnerId: "owner_id",
    AccountId: "account_id",
    Name: "name",
    StageName: "stage_name",
    Amount: "amount",
    CloseDate: "close_date",
    Probability: "probability",
    CreatedDate: "created_date",
    LastModifiedDate: "last_modified_date"
  },
  cases: {
    Id: "id",
    OwnerId: "owner_id",
    AccountId: "account_id",
    ContactId: "contact_id",
    CaseNumber: "case_number",
    Subject: "subject",
    Description: "description",
    Status: "status",
    Priority: "priority",
    Origin: "origin",
    CreatedDate: "created_date",
    LastModifiedDate: "last_modified_date"
  },
  tasks: {
    Id: "id",
    OwnerId: "owner_id",
    Subject: "subject",
    Status: "status",
    Priority: "priority",
    ActivityDate: "activity_date",
    CreatedDate: "created_date",
    LastModifiedDate: "last_modified_date"
  }
};

const HIDDEN_FIELDS = {
  "Sales Representative": { accounts: ["AnnualRevenue"] },
  "Support Agent": { accounts: ["AnnualRevenue"] }
};

export class CRMError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const err = (message, status = 400) => {
  throw new CRMError(message, status);
};

const stamp = () => new Date().toISOString();

const makeId = (obj) =>
  OBJECTS[obj].prefix +
  randomBytes(8).toString("hex").slice(0, 15).toUpperCase();

const sqlDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 23).replace("T", " ");
  }
  return String(value).replace("T", " ").replace("Z", "").slice(0, 23);
};

async function transaction(callback) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export const userById = (id) => USERS.find((x) => x.Id === id);

export function currentUser(id) {
  const user = userById(id);
  if (!user) err("Unknown classroom persona", 400);
  return user;
}

export function can(user, obj, verb) {
  return !!ROLE_PERMISSIONS[user.Role]?.[obj]?.includes(verb);
}

export function checkObject(user, obj, verb) {
  if (!OBJECTS[obj]) {
    err("Unknown Salesforce-style object: " + obj, 404);
  }

  if (!can(user, obj, verb)) {
    err(
      `${user.Role} does not have ${verb} permission on ${OBJECTS[obj].singular}`,
      403
    );
  }
}

function checkOwner(user, obj, row, verb) {
  if (user.Role === "Administrator" || user.Role === "Sales Manager") {
    return;
  }

  if (user.Role === "Sales Representative") {
    if (
      (obj === "leads" || obj === "opportunities") &&
      row.OwnerId !== user.Id
    ) {
      err("Record sharing: this record is not owned by you", 403);
    }

    if (verb !== "R" && row.OwnerId !== user.Id) {
      err("Record edit access denied: another owner", 403);
    }
  }

  if (
    user.Role === "Support Agent" &&
    obj === "cases" &&
    row.OwnerId !== user.Id
  ) {
    err("Case queue sharing denied", 403);
  }

  if (
    user.Role === "Support Agent" &&
    obj === "tasks" &&
    verb !== "R" &&
    row.OwnerId !== user.Id
  ) {
    err("Task ownership restriction", 403);
  }
}

function visible(user, obj, row) {
  try {
    checkOwner(user, obj, row, "R");
    return true;
  } catch {
    return false;
  }
}

export function fieldAllowed(user, obj, field) {
  return !(HIDDEN_FIELDS[user.Role]?.[obj] || []).includes(field);
}

export function sanitize(user, obj, row) {
  if (!row) return null;

  const output = {};

  for (const [key, value] of Object.entries(row)) {
    if (fieldAllowed(user, obj, key)) {
      output[key] = value;
    }
  }

  return output;
}

function convertRow(obj, row) {
  const result = {};

  for (const [field, column] of Object.entries(FIELDS[obj])) {
    let value = row[column];

    if (
      value instanceof Date &&
      ["CreatedDate", "LastModifiedDate"].includes(field)
    ) {
      value = value.toISOString();
    } else if (
      value instanceof Date &&
      field === "ActivityDate"
    ) {
      value = value.toISOString().slice(0, 10);
    } else if (
      typeof value === "string" &&
      ["CreatedDate", "LastModifiedDate"].includes(field) &&
      value.includes("T") === false
    ) {
      value = value.replace(" ", "T") + (value.length === 19 ? ".000Z" : "Z");
    }

    result[field] = value ?? null;
  }

  return result;
}

async function getTaskRelations(connection, taskIds) {
  if (!taskIds.length) return {};

  const placeholders = taskIds.map(() => "?").join(",");

  const [rows] = await connection.query(
    `SELECT * FROM task_relations WHERE task_id IN (${placeholders})`,
    taskIds
  );

  const relations = {};

  for (const row of rows) {
    const relation =
      row.account_id ||
      row.contact_id ||
      row.lead_id ||
      row.opportunity_id ||
      row.case_id;

    if (relation) {
      relations[row.task_id] = relation;
    }
  }

  return relations;
}

async function loadRecords(connection, obj) {
  const [rows] = await connection.query(
    `SELECT * FROM ${TABLES[obj]}`
  );

  const records = rows.map((row) => convertRow(obj, row));

  if (obj === "tasks") {
    const relations = await getTaskRelations(
      connection,
      records.map((row) => row.Id)
    );

    for (const record of records) {
      record.RelatedToId = relations[record.Id] || null;
    }
  }

  return records;
}

export async function getAll(user, obj, opts = {}) {
  checkObject(user, obj, "R");

  const connection = await pool.getConnection();

  try {
    let records = await loadRecords(connection, obj);

    records = records
      .filter((row) => visible(user, obj, row))
      .map((row) => sanitize(user, obj, row));

    const q = String(opts.q || "").trim().toLowerCase();

    if (q) {
      records = records.filter((row) =>
        Object.values(row).some((value) =>
          String(value ?? "").toLowerCase().includes(q)
        )
      );
    }

    const sort = opts.sort || "LastModifiedDate";
    const direction = opts.dir === "asc" ? 1 : -1;

    if (records.length && Object.hasOwn(records[0], sort)) {
      records.sort(
        (a, b) =>
          String(a[sort] ?? "").localeCompare(String(b[sort] ?? "")) *
          direction
      );
    }

    return records;
  } finally {
    connection.release();
  }
}

export async function getOne(user, obj, id) {
  checkObject(user, obj, "R");

  const records = await getAll(user, obj);
  const record = records.find((row) => row.Id === id);

  if (!record) err("Record not found", 404);

  return record;
}

function defaults(obj, input) {
  const values = {
    leads: {
      Status: "New",
      Rating: "Warm",
      LeadSource: "Website"
    },
    opportunities: {
      StageName: "Prospecting",
      Amount: 0
    },
    cases: {
      Status: "New",
      Priority: "Medium",
      Origin: "Web"
    },
    tasks: {
      Status: "Not Started",
      Priority: "Normal"
    }
  }[obj] || {};

  return { ...values, ...input };
}

async function recordExists(connection, obj, id) {
  if (!id) return false;

  const [rows] = await connection.query(
    `SELECT id FROM ${TABLES[obj]} WHERE id = ? LIMIT 1`,
    [id]
  );

  return rows.length > 0;
}

async function validate(connection, user, obj, input, existing = {}) {
  const model = OBJECTS[obj];

  if (!model) err("Unknown object", 404);

  const allowed = Object.keys(model.fields);
  const values = {};

  for (const [key, value] of Object.entries(input || {})) {
    if (
      [
        "Id",
        "CreatedDate",
        "LastModifiedDate",
        "CaseNumber",
        "ConvertedAccountId",
        "ConvertedContactId",
        "ConvertedOpportunityId"
      ].includes(key)
    ) {
      err(`${key} is a system-managed field`, 400);
    }

    if (!allowed.includes(key)) {
      err(`Invalid field ${key} on ${model.singular}`, 400);
    }

    if (!fieldAllowed(user, obj, key)) {
      err(`Field-level security: ${key} is not writable`, 403);
    }

    if (
      key === "OwnerId" &&
      user.Role !== "Administrator" &&
      user.Role !== "Sales Manager" &&
      value !== user.Id
    ) {
      err("Only managers can assign records to another user", 403);
    }

    values[key] = typeof value === "string" ? value.trim() : value;
  }

  const row = {
    ...defaults(obj, {}),
    ...existing,
    ...values
  };

  for (const [key, meta] of Object.entries(model.fields)) {
    if (
      meta.required &&
      (row[key] === undefined ||
        row[key] === null ||
        String(row[key]).trim() === "")
    ) {
      err(`${meta.label} is required`);
    }

    if (
      meta.type === "select" &&
      row[key] !== undefined &&
      row[key] !== "" &&
      !meta.options.includes(row[key])
    ) {
      err(`Invalid ${key}: must be ${meta.options.join(", ")}`);
    }

    if (
      (meta.type === "money" || meta.type === "number") &&
      row[key] !== undefined &&
      row[key] !== null &&
      row[key] !== ""
    ) {
      const number = Number(row[key]);

      if (!Number.isFinite(number) || number < 0) {
        err(`${meta.label} must be a non-negative number`);
      }

      row[key] = number;
      values[key] = number;
    }

    if (
      meta.type === "email" &&
      row[key] &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[key])
    ) {
      err(`Invalid email address for ${key}`);
    }

    if (
      meta.type === "date" &&
      row[key] &&
      !/^\d{4}-\d{2}-\d{2}$/.test(row[key])
    ) {
      err(`Invalid ${key}; use YYYY-MM-DD`);
    }
  }

  if (obj === "opportunities") {
    if ("StageName" in values || !existing.Id) {
      values.Probability =
        STAGE_PROBABILITIES[row.StageName] ?? 10;
    }
  }

  if (
    obj === "leads" &&
    values.Status === "Converted" &&
    existing.Status !== "Converted"
  ) {
    err("Use the Convert Lead action instead of setting Converted manually");
  }

  if (
    obj === "leads" &&
    existing.Status === "Converted" &&
    values.Status !== undefined &&
    values.Status !== "Converted"
  ) {
    err("Converted leads cannot return to an open status");
  }

  for (const [field, target] of [
    ["AccountId", "accounts"],
    ["ContactId", "contacts"]
  ]) {
    if (
      row[field] &&
      model.fields[field] &&
      !(await recordExists(connection, target, row[field]))
    ) {
      err(`${field} references a nonexistent record`);
    }
  }

  if (obj === "contacts" && row.Email) {
    const [duplicates] = await connection.query(
      `SELECT id FROM contacts WHERE LOWER(email) = LOWER(?) AND id <> ? LIMIT 1`,
      [row.Email, existing.Id || ""]
    );

    if (duplicates.length) {
      err("Duplicate rule: a contact with this email already exists");
    }
  }

  if (obj === "tasks" && row.RelatedToId) {
    const prefix = row.RelatedToId.slice(0, 3);
    const target = {
      "001": "accounts",
      "003": "contacts",
      "00Q": "leads",
      "006": "opportunities",
      "500": "cases"
    }[prefix];

    if (!target || !(await recordExists(connection, target, row.RelatedToId))) {
      err("RelatedToId references a nonexistent CRM record");
    }
  }

  return values;
}

async function insertRecord(connection, obj, row) {
  const columns = [];
  const values = [];

  for (const [field, column] of Object.entries(FIELDS[obj])) {
    if (row[field] === undefined) continue;

    columns.push(column);

    const value = row[field];

    values.push(
      ["CreatedDate", "LastModifiedDate"].includes(field)
        ? sqlDateTime(value)
        : value
    );
  }

  const placeholders = columns.map(() => "?").join(", ");

  await connection.query(
    `INSERT INTO ${TABLES[obj]} (${columns.join(", ")}) VALUES (${placeholders})`,
    values
  );

  if (obj === "tasks") {
    await saveTaskRelation(connection, row.Id, row.RelatedToId);
  }
}

async function updateRecord(connection, obj, id, values) {
  const assignments = [];
  const parameters = [];

  for (const [field, value] of Object.entries(values)) {
    const column = FIELDS[obj][field];

    if (!column) continue;

    assignments.push(`${column} = ?`);

    parameters.push(
      ["CreatedDate", "LastModifiedDate"].includes(field)
        ? sqlDateTime(value)
        : value
    );
  }

  if (assignments.length) {
    await connection.query(
      `UPDATE ${TABLES[obj]}
       SET ${assignments.join(", ")}
       WHERE id = ?`,
      [...parameters, id]
    );
  }

  if (obj === "tasks" && "RelatedToId" in values) {
    await saveTaskRelation(
      connection,
      id,
      values.RelatedToId
    );
  }
}

async function saveTaskRelation(connection, taskId, relatedToId) {
  await connection.query(
    "DELETE FROM task_relations WHERE task_id = ?",
    [taskId]
  );

  if (!relatedToId) return;

  const prefix = relatedToId.slice(0, 3);

  const column = {
    "001": "account_id",
    "003": "contact_id",
    "00Q": "lead_id",
    "006": "opportunity_id",
    "500": "case_id"
  }[prefix];

  if (!column) {
    err("Unsupported task relationship");
  }

  await connection.query(
    `INSERT INTO task_relations (task_id, ${column}) VALUES (?, ?)`,
    [taskId, relatedToId]
  );
}

async function audit(connection, user, obj, operation, row, details = "") {
  await connection.query(
    `INSERT INTO audit_logs
      (id, actor_id, actor_name, object_type, operation, record_id, label, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      randomBytes(5).toString("hex"),
      user.Id,
      user.Name,
      obj,
      operation,
      row?.Id || "",
      row?.Name ||
        row?.Subject ||
        [row?.FirstName, row?.LastName].filter(Boolean).join(" "),
      details,
      sqlDateTime(stamp())
    ]
  );
}

async function taskFromFlow(
  connection,
  ownerId,
  Subject,
  RelatedToId,
  priority = "Normal",
  days = 3
) {
  const row = {
    Id: makeId("tasks"),
    OwnerId: ownerId,
    Subject,
    Status: "Not Started",
    Priority: priority,
    ActivityDate: new Date(
      Date.now() + days * 86400000
    ).toISOString().slice(0, 10),
    CreatedDate: stamp(),
    LastModifiedDate: stamp(),
    RelatedToId
  };

  await insertRecord(connection, "tasks", row);
  return row;
}

async function flow(connection, name, triggerId, actionDescription) {
  await connection.query(
    `INSERT INTO workflow_runs
      (id, name, trigger_id, action_description, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      randomBytes(7).toString("hex"),
      name,
      triggerId,
      actionDescription,
      sqlDateTime(stamp())
    ]
  );
}

async function fireFlow(connection, obj, operation, row, previous) {
  if (obj === "opportunities" && operation === "CREATE") {
    await taskFromFlow(
      connection,
      row.OwnerId,
      "Follow up: " + row.Name,
      row.Id,
      "Normal",
      3
    );

    await flow(
      connection,
      "New opportunity follow-up",
      row.Id,
      "Created a follow-up task automatically"
    );
  }

  if (
    obj === "opportunities" &&
    row.StageName === "Closed Won" &&
    previous?.StageName !== "Closed Won"
  ) {
    await taskFromFlow(
      connection,
      row.OwnerId,
      "Begin onboarding: " + row.Name,
      row.Id,
      "High",
      1
    );

    await flow(
      connection,
      "Closed Won onboarding",
      row.Id,
      "Created a customer onboarding task"
    );
  }

  if (
    obj === "cases" &&
    ["High", "Critical"].includes(row.Priority) &&
    (!previous || !["High", "Critical"].includes(previous.Priority))
  ) {
    await taskFromFlow(
      connection,
      row.OwnerId,
      "Escalate case: " + row.Subject,
      row.Id,
      "High",
      0
    );

    await flow(
      connection,
      "High-priority case escalation",
      row.Id,
      "Created an urgent support task"
    );
  }
}

export async function create(user, obj, input) {
  checkObject(user, obj, "C");

  return transaction(async (connection) => {
    const values = await validate(
      connection,
      user,
      obj,
      {
        ...input,
        OwnerId: input?.OwnerId || user.Id
      }
    );

    const row = {
      Id: makeId(obj),
      CreatedDate: stamp(),
      LastModifiedDate: stamp(),
      ...defaults(obj, values)
    };

    if (obj === "cases") {
      const [result] = await connection.query(
        "SELECT COUNT(*) AS total FROM cases"
      );

      row.CaseNumber = String(100000 + Number(result[0].total) + 1);
    }

    await insertRecord(connection, obj, row);
    await audit(connection, user, obj, "CREATE", row);
    await fireFlow(connection, obj, "CREATE", row);

    return sanitize(user, obj, row);
  });
}

export async function update(user, obj, id, input) {
  checkObject(user, obj, "U");

  return transaction(async (connection) => {
    const [rows] = await connection.query(
      `SELECT * FROM ${TABLES[obj]} WHERE id = ?`,
      [id]
    );

    if (!rows.length) err("Record not found", 404);

    const row = convertRow(obj, rows[0]);

    if (obj === "tasks") {
      const relations = await getTaskRelations(connection, [id]);
      row.RelatedToId = relations[id] || null;
    }

    checkOwner(user, obj, row, "U");

    const previous = { ...row };
    const values = await validate(connection, user, obj, input, row);

    values.LastModifiedDate = stamp();

    await updateRecord(connection, obj, id, values);

    const updated = { ...row, ...values };

    await audit(
      connection,
      user,
      obj,
      "UPDATE",
      updated,
      "Fields: " + Object.keys(values).join(", ")
    );

    await fireFlow(connection, obj, "UPDATE", updated, previous);

    return sanitize(user, obj, updated);
  });
}

export async function remove(user, obj, id) {
  checkObject(user, obj, "D");

  return transaction(async (connection) => {
    const [rows] = await connection.query(
      `SELECT * FROM ${TABLES[obj]} WHERE id = ?`,
      [id]
    );

    if (!rows.length) err("Record not found", 404);

    const row = convertRow(obj, rows[0]);

    checkOwner(user, obj, row, "D");

    if (obj === "accounts") {
      const [related] = await connection.query(
        `SELECT
          (SELECT COUNT(*) FROM contacts WHERE account_id = ?) +
          (SELECT COUNT(*) FROM opportunities WHERE account_id = ?) +
          (SELECT COUNT(*) FROM cases WHERE account_id = ?) AS total`,
        [id, id, id]
      );

      if (Number(related[0].total)) {
        err("Relationship rule: cannot delete an Account with related records");
      }
    }

    if (obj === "contacts") {
      const [related] = await connection.query(
        "SELECT COUNT(*) AS total FROM cases WHERE contact_id = ?",
        [id]
      );

      if (Number(related[0].total)) {
        err("Relationship rule: cannot delete a Contact linked to Cases");
      }
    }

    await audit(connection, user, obj, "DELETE", row);

    if (obj === "tasks") {
      await connection.query(
        "DELETE FROM task_relations WHERE task_id = ?",
        [id]
      );
    }

    await connection.query(
      `DELETE FROM ${TABLES[obj]} WHERE id = ?`,
      [id]
    );

    return { success: true, deletedId: id };
  });
}

async function createInternal(connection, obj, OwnerId, values) {
  const row = {
    Id: makeId(obj),
    OwnerId,
    CreatedDate: stamp(),
    LastModifiedDate: stamp(),
    ...values
  };

  await insertRecord(connection, obj, row);

  return row;
}

export async function convertLead(user, id, { createOpportunity = true } = {}) {
  checkObject(user, "leads", "U");
  checkObject(user, "accounts", "C");
  checkObject(user, "contacts", "C");

  if (createOpportunity) {
    checkObject(user, "opportunities", "C");
  }

  return transaction(async (connection) => {
    const [rows] = await connection.query(
      "SELECT * FROM leads WHERE id = ?",
      [id]
    );

    if (!rows.length) err("Lead not found", 404);

    const lead = convertRow("leads", rows[0]);

    checkOwner(user, "leads", lead, "U");

    if (lead.Status === "Converted") {
      err("Lead has already been converted");
    }

    if (lead.Status !== "Qualified") {
      err("Lead must be Qualified before conversion");
    }

    const [accounts] = await connection.query(
      "SELECT * FROM accounts WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [lead.Company]
    );

   const account = accounts.length
  ? convertRow("accounts", accounts[0])
  : await createInternal(
      connection,
      "accounts",
      lead.OwnerId,
      {
        Name: lead.Company,
        Industry: lead.Industry || "Other"
      }
    );

    const contact = await createInternal(
      connection,
      "contacts",
      lead.OwnerId,
      {
        FirstName: lead.FirstName || "",
        LastName: lead.LastName,
        Email: lead.Email || "",
        Phone: lead.Phone || "",
        AccountId: account.Id
      }
    );

    let opportunity = null;

    if (createOpportunity) {
      opportunity = await createInternal(
        connection,
        "opportunities",
        lead.OwnerId,
        {
          Name: lead.Company + " – Initial Opportunity",
          AccountId: account.Id,
          StageName: "Qualification",
          Amount: 0,
          CloseDate: new Date(
            Date.now() + 30 * 86400000
          ).toISOString().slice(0, 10),
          Probability: 25
        }
      );
    }

    const converted = {
      Status: "Converted",
      ConvertedAccountId: account.Id,
      ConvertedContactId: contact.Id,
      ConvertedOpportunityId: opportunity?.Id || null,
      LastModifiedDate: stamp()
    };

    await updateRecord(connection, "leads", id, converted);

    Object.assign(lead, converted);

    await audit(
      connection,
      user,
      "leads",
      "CONVERT",
      lead,
      `Account ${account.Id}; Contact ${contact.Id}; Opportunity ${opportunity?.Id || "none"}`
    );

    await taskFromFlow(
      connection,
      lead.OwnerId,
      `Welcome call: ${lead.FirstName || ""} ${lead.LastName}`,
      contact.Id,
      "Normal",
      1
    );

    await flow(
      connection,
      "Lead qualification follow-up",
      lead.Id,
      "Created Account, Contact" +
        (opportunity ? ", Opportunity" : "") +
        " and welcome-call task"
    );

    return {
      Lead: sanitize(user, "leads", lead),
      Account: sanitize(user, "accounts", account),
      Contact: sanitize(user, "contacts", contact),
      Opportunity: opportunity
        ? sanitize(user, "opportunities", opportunity)
        : null
    };
  });
}

export async function stats(user) {
  const objects = Object.keys(OBJECTS);

  const entries = await Promise.all(
    objects.map(async (obj) => [
      obj,
      can(user, obj, "R") ? await getAll(user, obj) : []
    ])
  );

  const all = Object.fromEntries(entries);

  const active = all.opportunities.filter(
    (opportunity) =>
      !["Closed Won", "Closed Lost"].includes(opportunity.StageName)
  );

  const pipeline = active.reduce(
    (sum, opportunity) => sum + Number(opportunity.Amount || 0),
    0
  );

  const weighted = active.reduce(
    (sum, opportunity) =>
      sum +
      (Number(opportunity.Amount || 0) *
        Number(opportunity.Probability || 0)) /
        100,
    0
  );

  const won = all.opportunities
    .filter((opportunity) => opportunity.StageName === "Closed Won")
    .reduce(
      (sum, opportunity) => sum + Number(opportunity.Amount || 0),
      0
    );

  const breakdown = Object.keys(STAGE_PROBABILITIES).map((stage) => {
    const records = all.opportunities.filter(
      (opportunity) => opportunity.StageName === stage
    );

    return {
      stage,
      count: records.length,
      amount: records.reduce(
        (sum, opportunity) => sum + Number(opportunity.Amount || 0),
        0
      )
    };
  });

  const [auditRows] = await pool.query(
    "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 7"
  );

  const [workflowRows] = await pool.query(
    "SELECT * FROM workflow_runs ORDER BY created_at DESC LIMIT 6"
  );

  return {
    totalLeads: all.leads.length,
    unconvertedLeads: all.leads.filter(
      (lead) => lead.Status !== "Converted"
    ).length,
    totalAccounts: all.accounts.length,
    totalContacts: all.contacts.length,
    openCases: all.cases.filter((item) => item.Status !== "Closed").length,
    overdueTasks: all.tasks.filter(
      (task) =>
        task.Status !== "Completed" &&
        task.ActivityDate < new Date().toISOString().slice(0, 10)
    ).length,
    pipeline,
    weighted,
    won,
    breakdown,
    recentActivities: auditRows.map((row) => ({
      id: row.id,
      at: row.created_at,
      actorId: row.actor_id,
      actorName: row.actor_name,
      object: row.object_type,
      operation: row.operation,
      recordId: row.record_id,
      label: row.label,
      details: row.details
    })),
    recentFlows: workflowRows.map((row) => ({
      Id: row.id,
      name: row.name,
      triggerId: row.trigger_id,
      actionDescription: row.action_description,
      at: row.created_at
    }))
  };
}

export async function getAudit(user) {
  if (!["Administrator", "Sales Manager"].includes(user.Role)) {
    err("Only managers and administrators can inspect audit history", 403);
  }

  const [rows] = await pool.query(
    "SELECT * FROM audit_logs ORDER BY created_at DESC"
  );

  return rows.map((row) => ({
    id: row.id,
    at: row.created_at,
    actorId: row.actor_id,
    actorName: row.actor_name,
    object: row.object_type,
    operation: row.operation,
    recordId: row.record_id,
    label: row.label,
    details: row.details
  }));
}

export async function getFlows(user) {
  const [rows] = await pool.query(
    "SELECT * FROM workflow_runs ORDER BY created_at DESC"
  );

  return {
    definitions: WORKFLOWS,
    runs: rows
      .slice(
        0,
        ["Administrator", "Sales Manager"].includes(user.Role)
          ? rows.length
          : 10
      )
      .map((row) => ({
        Id: row.id,
        name: row.name,
        triggerId: row.trigger_id,
        actionDescription: row.action_description,
        at: row.created_at
      }))
  };
}

export function getSecurity(user) {
  return {
    user,
    roles: USERS,
    permissions: ROLE_PERMISSIONS[user.Role],
    allPermissions: ROLE_PERMISSIONS,
    hiddenFields: HIDDEN_FIELDS[user.Role] || {},
    notes:
      "ROLE SIMULATION ONLY: x-demo-user is a trusted classroom selector, NOT real authentication."
  };
}

export function getMeta() {
  return {
    objects: OBJECTS,
    users: USERS,
    stages: STAGE_PROBABILITIES
  };
}

export async function reset(user) {
  if (user.Role !== "Administrator") {
    err("Administrator role required for reset", 403);
  }

  return {
    success: false,
    message: "Reset is disabled to protect existing MySQL records."
  };
}

export async function dbHealth() {
  const counts = {};

  for (const obj of Object.keys(TABLES)) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM ${TABLES[obj]}`
    );

    counts[obj] = Number(rows[0].total);
  }

  return {
    status: "ok",
    storage: "MySQL",
    database: process.env.DB_NAME,
    objects: counts
  };
}
