export function success(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}

export function error(res, message, status = 400, hint = null) {
  const body = { success: false, error: message };
  if (hint) body.hint = hint;
  res.status(status).json(body);
}
