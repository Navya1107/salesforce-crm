import { apiRequest } from "./api";

import {
  executeGraphQL,
  transformGraphQLResponse
} from "./graphqlService";

import * as mockService from "../mock-salesforce-sdk/sdk/crmService";

const useMock =
  import.meta.env.VITE_USE_MOCK_SALESFORCE === "true";

// GraphQL object names
const objectNames = {
  leads: "Lead",
  accounts: "Account",
  contacts: "Contact",
  opportunities: "Opportunity",
  cases: "Case",
  tasks: "Task"
};

// Common backend fields
const commonFields = {
  id: "Id",
  ownerId: "OwnerId",
  createdDate: "CreatedDate",
  lastModifiedDate: "LastModifiedDate"
};

// Frontend and backend field mappings
const fieldMappings = {
  leads: {
    ...commonFields,
    firstName: "FirstName",
    lastName: "LastName",
    company: "Company",
    email: "Email",
    phone: "Phone",
    status: "Status",
    leadSource: "LeadSource",
    rating: "Rating",
    industry: "Industry",
    convertedAccountId: "ConvertedAccountId",
    convertedContactId: "ConvertedContactId",
    convertedOpportunityId: "ConvertedOpportunityId"
  },

  accounts: {
    ...commonFields,
    name: "Name",
    industry: "Industry",
    phone: "Phone",
    website: "Website",
    billingCity: "BillingCity",
    annualRevenue: "AnnualRevenue"
  },

  contacts: {
    ...commonFields,
    firstName: "FirstName",
    lastName: "LastName",
    email: "Email",
    phone: "Phone",
    title: "Title",
    accountId: "AccountId"
  },

  opportunities: {
    ...commonFields,
    name: "Name",
    amount: "Amount",
    stage: "StageName",
    closeDate: "CloseDate",
    probability: "Probability",
    accountId: "AccountId"
  },

  cases: {
    ...commonFields,
    caseNumber: "CaseNumber",
    subject: "Subject",
    description: "Description",
    accountId: "AccountId",
    contactId: "ContactId",
    priority: "Priority",
    status: "Status",
    origin: "Origin"
  },

  tasks: {
    ...commonFields,
    subject: "Subject",
    dueDate: "ActivityDate",
    priority: "Priority",
    status: "Status",
    relatedToId: "RelatedToId"
  }
};

// Fields requested through GraphQL
const graphqlFields = {
  leads: [
    "FirstName",
    "LastName",
    "Company",
    "Email",
    "Phone",
    "Status",
    "LeadSource",
    "Rating",
    "Industry"
  ],

  accounts: [
    "Name",
    "Industry",
    "Phone",
    "Website",
    "BillingCity"
  ],

  contacts: [
    "FirstName",
    "LastName",
    "Email",
    "Phone",
    "Title",
    "AccountId"
  ],

  opportunities: [
    "Name",
    "Amount",
    "StageName",
    "CloseDate",
    "Probability",
    "AccountId"
  ],

  cases: [
    "CaseNumber",
    "Subject",
    "Description",
    "AccountId",
    "ContactId",
    "Priority",
    "Status",
    "Origin"
  ],

  tasks: [
    "Subject",
    "ActivityDate",
    "Priority",
    "Status",
    "RelatedToId"
  ]
};

const readOnlyFields = new Set([
  "id",
  "createdDate",
  "lastModifiedDate",
  "caseNumber",
  "convertedAccountId",
  "convertedContactId",
  "convertedOpportunityId"
]);

const numericFields = new Set([
  "amount",
  "probability",
  "annualRevenue"
]);

const dateFields = new Set([
  "closeDate",
  "dueDate"
]);

// Validate CRM object
function validateObject(object) {
  if (!Object.hasOwn(objectNames, object)) {
    throw new Error(`Invalid CRM object: ${object}`);
  }
}

// Convert backend fields into frontend fields
function normalizeRecord(object, record) {
  if (!record) return record;

  const mapping = fieldMappings[object] || {};

  const reverseMapping = Object.fromEntries(
    Object.entries(mapping).map(
      ([frontend, backend]) => [
        backend,
        frontend
      ]
    )
  );

  const normalized = {};

  for (const [key, value] of Object.entries(record)) {
    const frontendKey = reverseMapping[key] || key;

    let normalizedValue = value;

    if (
      numericFields.has(frontendKey) &&
      value !== null &&
      value !== ""
    ) {
      normalizedValue = Number(value);
    }

    if (
      dateFields.has(frontendKey) &&
      typeof value === "string"
    ) {
      normalizedValue = value.slice(0, 10);
    }

    normalized[frontendKey] = normalizedValue;
  }

  return normalized;
}

// Convert frontend data into backend format
function preparePayload(object, data) {
  const mapping = fieldMappings[object] || {};
  const payload = {};

  for (const [key, value] of Object.entries(data)) {
    if (readOnlyFields.has(key)) continue;

    if (!Object.hasOwn(mapping, key)) continue;

    if (value === undefined) continue;

    let preparedValue = value;

    if (numericFields.has(key)) {
      preparedValue =
        value === "" || value === null
          ? null
          : Number(value);

      if (
        preparedValue !== null &&
        !Number.isFinite(preparedValue)
      ) {
        throw new Error(
          `${key} must be a valid number`
        );
      }
    }

    if (
      dateFields.has(key) ||
      key.endsWith("Id")
    ) {
      preparedValue =
        value === "" ? null : value;
    }

    payload[mapping[key]] = preparedValue;
  }

  return payload;
}

// Generate GraphQL query dynamically
function buildGraphQLQuery(object, fields) {
  validateObject(object);

  const objectName = objectNames[object];

  const selections = fields
    .map(field => `${field} { value }`)
    .join("\n");

  return `
    query GetRecords {
      uiapi {
        query {
          ${objectName}(first: 200) {
            totalCount

            edges {
              cursor

              node {
                Id
                ${selections}
              }
            }

            pageInfo {
              hasNextPage
            }
          }
        }
      }
    }
  `;
}

// Retrieve records through GraphQL
async function getGraphQLRecords(object) {
  validateObject(object);

  const objectName = objectNames[object];

  let fields = [...graphqlFields[object]];

  while (true) {
    try {
      const query = buildGraphQLQuery(
        object,
        fields
      );

      const data = await executeGraphQL(query);

      const connection =
        data?.uiapi?.query?.[objectName];

      if (!connection) {
        throw new Error(
          "Invalid GraphQL connection response"
        );
      }

      // The current GraphQL backend supports
      // a maximum of 200 records per query.
      // Use REST to avoid missing records.
      if (connection.pageInfo?.hasNextPage) {
        const records = await apiRequest(
          `/${object}`
        );

        if (!Array.isArray(records)) {
          throw new Error(
            "Invalid records received from server"
          );
        }

        return records.map(record =>
          normalizeRecord(object, record)
        );
      }

      // Convert edges -> node -> value
      const records =
        transformGraphQLResponse(connection);

      // Convert Salesforce fields to React fields
      return records.map(record =>
        normalizeRecord(object, record)
      );

    } catch (error) {
      // Handle field-level security restrictions
      const match = error.message.match(
        /Field-level security: '([^']+)' is not accessible/
      );

      if (match && fields.includes(match[1])) {
        const restrictedField = match[1];

        fields = fields.filter(
          field => field !== restrictedField
        );

        continue;
      }

      throw error;
    }
  }
}

// Main CRM service
export const crmService = {

  // READ ALL - GraphQL
  getAll: async object => {
    validateObject(object);

    if (useMock) {
      return mockService.getAll(object);
    }

    return getGraphQLRecords(object);
  },

  // READ SINGLE RECORD - REST
  getById: async (object, id) => {
    validateObject(object);

    if (useMock) {
      return mockService.getById(object, id);
    }

    const result = await apiRequest(
      `/${object}/${encodeURIComponent(id)}`
    );

    return normalizeRecord(object, result);
  },

  // CREATE - REST
  create: async (object, data) => {
    validateObject(object);

    if (useMock) {
      return mockService.create(object, data);
    }

    const result = await apiRequest(
      `/${object}`,
      {
        method: "POST",
        body: JSON.stringify(
          preparePayload(object, data)
        )
      }
    );

    return normalizeRecord(object, result);
  },

  // UPDATE - REST
  update: async (object, id, data) => {
    validateObject(object);

    if (useMock) {
      return mockService.update(
        object,
        id,
        data
      );
    }

    const result = await apiRequest(
      `/${object}/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          preparePayload(object, data)
        )
      }
    );

    return normalizeRecord(object, result);
  },

  // DELETE - REST
  delete: async (object, id) => {
    validateObject(object);

    if (useMock) {
      return mockService.remove(object, id);
    }

    return apiRequest(
      `/${object}/${encodeURIComponent(id)}`,
      {
        method: "DELETE"
      }
    );
  }
};