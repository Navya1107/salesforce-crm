export const CRM_OBJECTS = {
  leads: {
    label: "Leads",
    singular: "Lead",

    fields: [
      {
        name: "firstName",
        label: "First Name",
        type: "text"
      },
      {
        name: "lastName",
        label: "Last Name",
        type: "text",
        required: true
      },
      {
        name: "company",
        label: "Company",
        type: "text",
        required: true
      },
      {
        name: "email",
        label: "Email",
        type: "email"
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel"
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          "New",
          "Working",
          "Qualified",
          "Unqualified"
        ]
      },
      {
        name: "leadSource",
        label: "Lead Source",
        type: "select",
        options: [
          "Website",
          "Referral",
          "Webinar",
          "Partner",
          "Outbound"
        ]
      },
      {
        name: "rating",
        label: "Rating",
        type: "select",
        options: ["Hot", "Warm", "Cold"]
      },
      {
        name: "industry",
        label: "Industry",
        type: "text"
      }
    ]
  },

  accounts: {
    label: "Accounts",
    singular: "Account",

    fields: [
      {
        name: "name",
        label: "Account Name",
        type: "text",
        required: true
      },
      {
        name: "industry",
        label: "Industry",
        type: "text"
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel"
      },
      {
        name: "website",
        label: "Website",
        type: "url"
      },
      {
        name: "billingCity",
        label: "Billing City",
        type: "text"
      }
    ]
  },

  contacts: {
    label: "Contacts",
    singular: "Contact",

    fields: [
      {
        name: "firstName",
        label: "First Name",
        type: "text"
      },
      {
        name: "lastName",
        label: "Last Name",
        type: "text",
        required: true
      },
      {
        name: "email",
        label: "Email",
        type: "email"
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel"
      },
      {
        name: "title",
        label: "Job Title",
        type: "text"
      },
      {
        name: "accountId",
        label: "Account",
        type: "relationship",
        relatedObject: "accounts"
      }
    ]
  },

  opportunities: {
    label: "Opportunities",
    singular: "Opportunity",

    fields: [
      {
        name: "name",
        label: "Opportunity Name",
        type: "text",
        required: true
      },
      {
        name: "accountId",
        label: "Account",
        type: "relationship",
        relatedObject: "accounts",
        required: true
      },
      {
        name: "amount",
        label: "Amount",
        type: "number"
      },
      {
        name: "stage",
        label: "Stage",
        type: "select",
        options: [
          "Prospecting",
          "Qualification",
          "Proposal",
          "Negotiation",
          "Closed Won",
          "Closed Lost"
        ]
      },
      {
        name: "closeDate",
        label: "Close Date",
        type: "date",
        required: true
      },
      {
        name: "probability",
        label: "Probability",
        type: "number"
      }
    ]
  },

  cases: {
    label: "Cases",
    singular: "Case",

    fields: [
      {
        name: "subject",
        label: "Subject",
        type: "text",
        required: true
      },
      {
        name: "description",
        label: "Description",
        type: "textarea"
      },
      {
        name: "accountId",
        label: "Account",
        type: "relationship",
        relatedObject: "accounts"
      },
      {
        name: "contactId",
        label: "Contact",
        type: "relationship",
        relatedObject: "contacts"
      },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        options: [
          "Low",
          "Medium",
          "High",
          "Critical"
        ]
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          "New",
          "Working",
          "Escalated",
          "Closed"
        ]
      },
      {
        name: "origin",
        label: "Origin",
        type: "select",
        options: [
          "Phone",
          "Email",
          "Web",
          "Chat"
        ]
      }
    ]
  },

  tasks: {
    label: "Tasks",
    singular: "Task",

    fields: [
      {
        name: "subject",
        label: "Subject",
        type: "text",
        required: true
      },
      {
        name: "dueDate",
        label: "Due Date",
        type: "date"
      },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        options: [
          "Low",
          "Normal",
          "High"
        ]
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          "Not Started",
          "In Progress",
          "Completed"
        ]
      },
      {
        name: "relatedToId",
        label: "Related Record ID",
        type: "text"
      }
    ]
  }
};