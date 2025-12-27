function OK(res, message, data = null, statusCode = 200, meta = undefined) {
  const payload = { success: true, message, data };
  if (meta !== undefined) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

function FAIL(res, message, code = "UNKNOWN_ERROR", statusCode = 400, details = undefined) {
  const payload = { success: false, message, error: { code } };
  if (details !== undefined) payload.error.details = details;
  return res.status(statusCode).json(payload);
}

module.exports = { OK, FAIL };