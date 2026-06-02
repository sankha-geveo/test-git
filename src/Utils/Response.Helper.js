function success(payload, events) {
  const res = { success: payload };
  if (events && Array.isArray(events) && events.length > 0) {
    res.events = events;
  }
  return res;
}

function error(code, message) {
  return { error: { code: code || 500, message: message || "Error" } };
}

module.exports = { success, error };
