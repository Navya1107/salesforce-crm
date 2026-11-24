const API_URL = "http://127.0.0.1:4100/api/contacts";

export const getContacts = async () => {
  const response = await fetch(API_URL, {
    headers: {
      "x-demo-user": "u1",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch contacts");
  }

  return response.json();
};

export const createContact = async (contact) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-demo-user": "u1",
    },
    body: JSON.stringify(contact),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to create contact");
  }

  return data;
};