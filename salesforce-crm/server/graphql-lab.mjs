
import { OBJECTS } from "./model.mjs";
import {
  getAll,
  create,
  update,
  remove,
  fieldAllowed,
  CRMError
} from "./engine.mjs";

const names = Object.fromEntries(
  Object.entries(OBJECTS).map(([key, value]) => [value.singular, key])
);

const whites = /\s|,/;

function scan(input) {
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const c = input[i];

    if (whites.test(c)) {
      i++;
      continue;
    }

    if (c === "#") {
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;

      while (j < input.length && /[A-Za-z0-9_]/.test(input[j])) j++;

      tokens.push({
        type: "name",
        value: input.slice(i, j)
      });

      i = j;
      continue;
    }

    if (c === '"') {
      let j = i + 1;
      let escape = false;

      for (; j < input.length; j++) {
        if (!escape && input[j] === '"') break;

        if (input[j] === "\\" && !escape) {
          escape = true;
        } else {
          escape = false;
        }
      }

      if (j === input.length) {
        throw Error("Unterminated string");
      }

      tokens.push({
        type: "string",
        value: JSON.parse(input.slice(i, j + 1))
      });

      i = j + 1;
      continue;
    }

    if (/[0-9-]/.test(c)) {
      let j = i + 1;

      while (j < input.length && /[0-9.]/.test(input[j])) j++;

      tokens.push({
        type: "number",
        value: Number(input.slice(i, j))
      });

      i = j;
      continue;
    }

    if ("{}():$![]=|".includes(c)) {
      tokens.push({
        type: c,
        value: c
      });

      i++;
      continue;
    }

    throw Error(
      `Unsupported GraphQL token '${c}'. This is an educational subset.`
    );
  }

  return tokens;
}

function parse(doc, variables = {}) {
  const tokens = scan(doc);
  const idx = { i: 0 };

  const peek = () => tokens[idx.i];

  const eat = (value) => {
    const token = tokens[idx.i++];

    if (!token || token.value !== value) {
      throw Error(
        `Expected ${value}; found ${token?.value ?? "end of input"}`
      );
    }

    return token;
  };

  function value() {
    const token = peek();

    if (!token) throw Error("Expected value");

    if (token.value === "$") {
      idx.i++;
      const name = peek()?.value;
      idx.i++;
      return variables[name];
    }

    if (token.value === "{") {
      eat("{");
      const result = {};

      while (peek() && peek().value !== "}") {
        const name = peek().value;
        idx.i++;
        eat(":");
        result[name] = value();
      }

      eat("}");
      return result;
    }

    if (token.value === "[") {
      eat("[");
      const result = [];

      while (peek() && peek().value !== "]") {
        result.push(value());
      }

      eat("]");
      return result;
    }

    idx.i++;

    return token.value === "true"
      ? true
      : token.value === "false"
        ? false
        : token.value === "null"
          ? null
          : token.value;
  }

  function args() {
    const result = {};

    if (peek()?.value !== "(") return result;

    eat("(");

    while (peek() && peek().value !== ")") {
      const key = peek().value;
      idx.i++;
      eat(":");
      result[key] = value();
    }

    eat(")");

    return result;
  }

  function fields() {
    eat("{");
    const result = [];

    while (peek() && peek().value !== "}") {
      const name = peek().value;
      idx.i++;

      const argumentsList = args();
      const select = peek()?.value === "{" ? fields() : null;

      result.push({
        name,
        args: argumentsList,
        select
      });
    }

    eat("}");

    return result;
  }

  let operation = "query";

  if (["query", "mutation"].includes(peek()?.value)) {
    operation = peek().value;
    idx.i++;

    if (peek()?.type === "name") {
      idx.i++;
    }

    if (peek()?.value === "(") {
      let depth = 0;

      do {
        const token = peek();
        idx.i++;

        if (token.value === "(") depth++;
        if (token.value === ")") depth--;
      } while (depth > 0 && peek());
    }
  }

  return {
    operation,
    fields: fields()
  };
}

function nodeProjection(user, obj, row, fields) {
  const result = {};

  for (const field of fields || []) {
    const name = field.name;

    if (name === "Id") {
      result.Id = row.Id;
      continue;
    }

    if (
      !OBJECTS[obj].fields[name] &&
      !["CreatedDate", "LastModifiedDate", "CaseNumber"].includes(name)
    ) {
      throw Error(
        `FieldUndefined: Field '${name}' is not defined on ${OBJECTS[obj].singular}`
      );
    }

    if (!fieldAllowed(user, obj, name)) {
      throw Error(`Field-level security: '${name}' is not accessible`);
    }

    const value = row[name] ?? null;

    if (!field.select) {
      throw Error(
        `Field '${name}' requires a { value } selection in this teaching schema`
      );
    }

    const detail = {};

    for (const selection of field.select) {
      if (selection.name === "value") {
        detail.value = value;
      } else if (selection.name === "displayValue") {
        detail.displayValue = String(value ?? "");
      } else {
        throw Error(
          "Unknown field-value attribute: " + selection.name
        );
      }
    }

    result[name] = detail;
  }

  return result;
}

async function execQuery(user, fields) {
  const output = {};

  for (const field of fields) {
    if (field.name !== "uiapi") {
      throw Error("Only uiapi root field is supported");
    }

    const body = {};

    for (const segment of field.select || []) {
      if (segment.name !== "query") {
        throw Error("For reads use uiapi { query { ... } }");
      }

      const collection = {};

      for (const objectField of segment.select || []) {
        const obj = names[objectField.name];

        if (!obj) {
          throw Error(
            "FieldUndefined: unknown object " + objectField.name
          );
        }

        const records = await getAll(user, obj);

        const first = Math.min(
          200,
          Math.max(0, Number(objectField.args.first ?? 20))
        );

        const entries = records
          .slice(0, first)
          .map((record) => ({
            node: record,
            cursor: record.Id
          }));

        const connection = {};

        for (const selection of objectField.select || []) {
          if (selection.name === "totalCount") {
            connection.totalCount = records.length;
          } else if (selection.name === "edges") {
            connection.edges = entries.map((entry) => {
              const edge = {};

              for (const sub of selection.select || []) {
                if (sub.name === "cursor") {
                  edge.cursor = entry.cursor;
                } else if (sub.name === "node") {
                  edge.node = nodeProjection(
                    user,
                    obj,
                    entry.node,
                    sub.select
                  );
                } else {
                  throw Error("Unknown Edge field " + sub.name);
                }
              }

              return edge;
            });
          } else if (selection.name === "pageInfo") {
            connection.pageInfo = {};

            for (const item of selection.select || []) {
              if (item.name === "hasNextPage") {
                connection.pageInfo.hasNextPage =
                  records.length > first;
              } else {
                throw Error("Unknown pageInfo field");
              }
            }
          } else {
            throw Error(
              "Unknown connection field: " + selection.name
            );
          }
        }

        collection[objectField.name] = connection;
      }

      body.query = collection;
    }

    output.uiapi = body;
  }

  return output;
}

async function execMutation(user, fields) {
  const output = {};

  for (const root of fields) {
    if (root.name !== "uiapi") {
      throw Error("For writes use uiapi mutation root");
    }

    const result = {};

    for (const mutation of root.select || []) {
      const match =
        /^(Account|Contact|Lead|Opportunity|Case|Task)(Create|Update|Delete)$/.exec(
          mutation.name
        );

      if (!match) {
        throw Error("Mutation not supported: " + mutation.name);
      }

      const obj = names[match[1]];
      const kind = match[2];
      const input = mutation.args.input || {};

      let record = null;
      let deletedId = null;

      if (kind === "Create") {
        record = await create(
          user,
          obj,
          input[match[1]] || input
        );
      } else if (kind === "Update") {
        record = await update(
          user,
          obj,
          input.Id || input.id,
          input[match[1]] || input
        );
      } else {
        const deleted = await remove(
          user,
          obj,
          input.Id || input.id
        );

        deletedId = deleted.deletedId;
      }

      const response = {};

      for (const selection of mutation.select || []) {
        if (selection.name === "Record") {
          response.Record = record
            ? nodeProjection(
                user,
                obj,
                record,
                selection.select
              )
            : null;
        } else if (selection.name === "success") {
          response.success = true;
        } else if (selection.name === "deletedId") {
          response.deletedId = deletedId;
        } else {
          throw Error(
            "Unsupported mutation response field: " +
              selection.name
          );
        }
      }

      result[mutation.name] = response;
    }

    output.uiapi = result;
  }

  return output;
}

export async function handleGraphQL(user, body) {
  try {
    const { operation, fields } = parse(
      String(body.query || ""),
      body.variables || {}
    );

    const data =
      operation === "mutation"
        ? await execMutation(user, fields)
        : await execQuery(user, fields);

    return { data };
  } catch (error) {
    return {
      data: null,
      errors: [
        {
          message: error.message,
          extensions: {
            code:
              error instanceof CRMError
                ? "PERMISSION_OR_VALIDATION"
                : "GRAPHQL_SUBSET_ERROR"
          }
        }
      ]
    };
  }
}

export const EXAMPLES = {
  ListContacts: `query ListContacts {
  uiapi { query { Contact(first: 10) {
    totalCount
    edges { node { Id FirstName { value } LastName { value } Email { value } Phone { value } } }
  } } }
}`,
  ListOpportunities: `query OpportunityPipeline {
  uiapi { query { Opportunity(first: 20) {
    totalCount
    edges { node { Id Name { value } StageName { value } Amount { value } Probability { value } } }
  } } }
}`,
  ListCases: `query CustomerSupport {
  uiapi { query { Case(first: 20) {
    totalCount
    edges { node { Id Subject { value } Status { value } Priority { value } } }
  } } }
}`,
  CreateContact: `mutation CreateContact($input: ContactCreateInput!) {
  uiapi { ContactCreate(input: $input) {
    Record { Id FirstName { value } LastName { value } Email { value } }
    success
  } }
}`
};
