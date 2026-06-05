const StatusEnum = {
  ACTIVE: "ACTIVE",
  IN_TRANSIT: "IN_TRANSIT",
  LOST: "LOST",
  RETIRED: "RETIRED",
  FROZEN: "FROZEN"
};
// Test comment ssss bbbb
const EventTypeEnum = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  TRANSFERRED: "TRANSFERRED",
  STATUS_CHANGED: "STATUS_CHANGED",
  TAG_ADDED: "TAG_ADDED",
  TAG_REMOVED: "TAG_REMOVED",
  CUSTOM: "CUSTOM"
};

const Roles = {
  ADMIN: "ADMIN",
  USER: "USER",
  AUDITOR: "AUDITOR"
};

const Config = {
  maxTagsPerAsset: 50,
  maxNameLength: 128,
  pageLimitDefault: 20,
  pageLimitMax: 100
};

module.exports = { StatusEnum, EventTypeEnum, Roles, Config };
