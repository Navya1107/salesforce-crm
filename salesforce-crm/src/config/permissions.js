import { ROLES } from "./roles";

const full = {
  read: true,
  create: true,
  update: true,
  delete: true
};

const readOnly = {
  read: true,
  create: false,
  update: false,
  delete: false
};

const noDelete = {
  read: true,
  create: true,
  update: true,
  delete: false
};

const readCreate = {
  read: true,
  create: true,
  update: false,
  delete: false
};

const noAccess = {
  read: false,
  create: false,
  update: false,
  delete: false
};

export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    leads: full,
    accounts: full,
    contacts: full,
    opportunities: full,
    cases: full,
    tasks: full
  },

  [ROLES.SALES_MANAGER]: {
    leads: full,
    accounts: full,
    contacts: full,
    opportunities: full,
    cases: readOnly,
    tasks: noDelete
  },

  [ROLES.SALES_REP]: {
    leads: noDelete,
    accounts: readCreate,
    contacts: noDelete,
    opportunities: noDelete,
    cases: readOnly,
    tasks: noDelete
  },

  [ROLES.SUPPORT_AGENT]: {
    leads: noAccess,
    accounts: readOnly,
    contacts: readOnly,
    opportunities: noAccess,
    cases: full,
    tasks: full
  }
};