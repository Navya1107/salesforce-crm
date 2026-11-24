
export const mockData = {
  leads: [
    { id: 1, firstName: "Rahul", lastName: "Sharma", company: "Infosys", email: "rahul@example.com", phone: "9876543210", status: "New" },
    { id: 2, firstName: "Priya", lastName: "Reddy", company: "TCS", email: "priya@example.com", phone: "9876543211", status: "Qualified" }
  ],

  accounts: [
    { id: 1, name: "Infosys", industry: "IT", phone: "9876543210", website: "https://infosys.com", type: "Customer" },
    { id: 2, name: "Capgemini", industry: "Technology", phone: "9876543211", website: "https://capgemini.com", type: "Partner" }
  ],

  contacts: [
    { id: 1, firstName: "Amit", lastName: "Kumar", email: "amit@example.com", phone: "9876543212", title: "Manager" },
    { id: 2, firstName: "Sneha", lastName: "Patel", email: "sneha@example.com", phone: "9876543213", title: "Director" }
  ],

  opportunities: [
    { id: 1, name: "Website Development", amount: 500000, stage: "Proposal", closeDate: "2026-12-20", probability: 70 },
    { id: 2, name: "CRM Implementation", amount: 800000, stage: "Negotiation", closeDate: "2026-12-30", probability: 80 }
  ],

  cases: [
    { id: 1, subject: "Login Issue", description: "Unable to access account", priority: "High", status: "New", origin: "Email" },
    { id: 2, subject: "Payment Issue", description: "Payment not reflecting", priority: "Medium", status: "Working", origin: "Phone" }
  ],

  tasks: [
    { id: 1, subject: "Client Meeting", description: "Discuss project requirements", dueDate: "2026-12-01", priority: "High", status: "Not Started" },
    { id: 2, subject: "Follow Up", description: "Contact customer", dueDate: "2026-12-03", priority: "Normal", status: "In Progress" }
  ]
};
