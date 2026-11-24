

export const USERS = [
  {
    Id: "u1",
    Name: "Morgan Admin",
    Role: "Administrator",
    Initials: "MA",
    Color: "#7367e8"
  },
  {
    Id: "u2",
    Name: "Riya Sales",
    Role: "Sales Representative",
    Initials: "RS",
    Color: "#1583bb"
  },
  {
    Id: "u3",
    Name: "Daniel Manager",
    Role: "Sales Manager",
    Initials: "DM",
    Color: "#b36e17"
  },
  {
    Id: "u4",
    Name: "Sam Support",
    Role: "Support Agent",
    Initials: "SS",
    Color: "#15957e"
  }
];


export const OBJECTS = {
  leads: {
    label: "Leads",
    singular: "Lead",
    prefix: "00Q",
    fields: {
      FirstName: { type: "text", label: "First Name" },
      LastName: { type: "text", label: "Last Name", required: true },
      Company: { type: "text", label: "Company", required: true },
      Email: { type: "email", label: "Email" },
      Phone: { type: "phone", label: "Phone" },
      Status: {
        type: "select",
        label: "Status",
        options: ["New", "Working", "Qualified", "Unqualified", "Converted"]
      },
      LeadSource: {
        type: "select",
        label: "Lead Source",
        options: ["Website", "Referral", "Webinar", "Partner", "Outbound"]
      },
      Rating: {
        type: "select",
        label: "Rating",
        options: ["Hot", "Warm", "Cold"]
      },
      Industry: { type: "text", label: "Industry" },
      OwnerId: { type: "reference", label: "Owner" }
    }
  },

  accounts: {
    label: "Accounts",
    singular: "Account",
    prefix: "001",
    fields: {
      Name: { type: "text", label: "Account Name", required: true },
      Industry: { type: "text", label: "Industry" },
      Website: { type: "url", label: "Website" },
      Phone: { type: "phone", label: "Phone" },
      AnnualRevenue: { type: "number", label: "Annual Revenue" },
      BillingCity: { type: "text", label: "Billing City" },
      OwnerId: { type: "reference", label: "Owner" }
    }
  },

  contacts: {
    label: "Contacts",
    singular: "Contact",
    prefix: "003",
    fields: {
      FirstName: { type: "text", label: "First Name" },
      LastName: { type: "text", label: "Last Name", required: true },
      Email: { type: "email", label: "Email" },
      Phone: { type: "phone", label: "Phone" },
      Title: { type: "text", label: "Title" },
      AccountId: { type: "reference", label: "Account" },
      OwnerId: { type: "reference", label: "Owner" }
    }
  },

  opportunities: {
    label: "Opportunities",
    singular: "Opportunity",
    prefix: "006",
    fields: {
      Name: { type: "text", label: "Opportunity Name", required: true },
      AccountId: {
        type: "reference",
        label: "Account",
        required: true
      },
      StageName: {
        type: "select",
        label: "Stage",
        options: [
          "Prospecting",
          "Qualification",
          "Proposal",
          "Negotiation",
          "Closed Won",
          "Closed Lost"
        ]
      },
      Amount: { type: "number", label: "Amount" },
      CloseDate: { type: "date", label: "Close Date", required: true },
      Probability: { type: "number", label: "Probability" },
      OwnerId: { type: "reference", label: "Owner" }
    }
  },

  cases: {
    label: "Cases",
    singular: "Case",
    prefix: "500",
    fields: {
      Subject: { type: "text", label: "Subject", required: true },
      Description: { type: "textarea", label: "Description" },
      AccountId: { type: "reference", label: "Account" },
      ContactId: { type: "reference", label: "Contact" },
      Status: {
        type: "select",
        label: "Status",
        options: ["New", "Working", "Escalated", "Closed"]
      },
      Priority: {
        type: "select",
        label: "Priority",
        options: ["Low", "Medium", "High", "Critical"]
      },
      Origin: {
        type: "select",
        label: "Origin",
        options: ["Phone", "Email", "Web", "Chat"]
      },
      OwnerId: { type: "reference", label: "Owner" }
    }
  },

  tasks: {
    label: "Tasks",
    singular: "Task",
    prefix: "00T",
    fields: {
      Subject: { type: "text", label: "Subject", required: true },
      Status: {
        type: "select",
        label: "Status",
        options: ["Not Started", "In Progress", "Completed"]
      },
      Priority: {
        type: "select",
        label: "Priority",
        options: ["Low", "Normal", "High"]
      },
      ActivityDate: { type: "date", label: "Due Date" },
      RelatedToId: { type: "reference", label: "Related To" },
      OwnerId: { type: "reference", label: "Owner" }
    }
  }
};

export const ROLE_PERMISSIONS = {
  Administrator: {
    leads: "CRUD",
    accounts: "CRUD",
    contacts: "CRUD",
    opportunities: "CRUD",
    cases: "CRUD",
    tasks: "CRUD"
  },

  "Sales Manager": {
    leads: "CRUD",
    accounts: "CRUD",
    contacts: "CRUD",
    opportunities: "CRUD",
    cases: "R",
    tasks: "CRU"
  },

  "Sales Representative": {
    leads: "CRU",
    accounts: "CR",
    contacts: "CRU",
    opportunities: "CRU",
    cases: "R",
    tasks: "CRU"
  },

  "Support Agent": {
    leads: "",
    accounts: "R",
    contacts: "R",
    opportunities: "",
    cases: "CRUD",
    tasks: "CRUD"
  }
};

export const STAGE_PROBABILITIES = {
  Prospecting: 10,
  Qualification: 25,
  Proposal: 50,
  Negotiation: 75,
  "Closed Won": 100,
  "Closed Lost": 0
};

export const WORKFLOWS = [
  {
    id: "WF001",
    name: "Lead Qualification Follow-up",
    trigger: "Lead converted",
    action: "Create a welcome-call task"
  },
  {
    id: "WF002",
    name: "New Opportunity Follow-up",
    trigger: "Opportunity created",
    action: "Create a follow-up task due in 3 days"
  },
  {
    id: "WF003",
    name: "High-Priority Case Escalation",
    trigger: "Case created or updated with High or Critical priority",
    action: "Create a priority escalation task"
  },
  {
    id: "WF004",
    name: "Closed Won Onboarding",
    trigger: "Opportunity enters Closed Won",
    action: "Create an onboarding task due in 1 day"
  }
];
