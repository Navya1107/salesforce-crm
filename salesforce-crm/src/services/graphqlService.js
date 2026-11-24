import { apiRequest } from "./api";

export async function executeGraphQL(query, variables = {}) {
  const response = await apiRequest("/graphql", {
    method: "POST",
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (response.errors?.length) {
    throw new Error(
      response.errors
        .map(error => error.message)
        .join(", ")
    );
  }

  return response.data;
}

export function transformGraphQLResponse(connection) {
  if (!Array.isArray(connection?.edges)) {
    throw new Error("Invalid GraphQL response");
  }

  return connection.edges.map(({ node }) => {
    const record = {};

    Object.entries(node).forEach(([key, field]) => {
      record[key] =
        field !== null &&
        typeof field === "object" &&
        Object.hasOwn(field, "value")
          ? field.value
          : field;
    });

    return record;
  });
}