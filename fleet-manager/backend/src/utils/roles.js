// ─────────────────────────────────────────────────────────────
// The three roles, defined in one place so we never typo them.
// ─────────────────────────────────────────────────────────────
const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  SERVICE_OPERATOR: 'service_operator',
};

const ALL_ROLES = Object.values(ROLES);

module.exports = { ROLES, ALL_ROLES };
