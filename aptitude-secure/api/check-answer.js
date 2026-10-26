module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }

  const itemId = body && typeof body.itemId === 'string' ? body.itemId : '';
  const selected = body && Number.isInteger(body.selected) ? body.selected : null;

  if (!/^[A-Z][0-9]{1,2}$/.test(itemId) || selected === null || selected < 0 || selected > 3) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  let key;
  try { key = JSON.parse(process.env.APTITUDE_ANSWER_KEY || '{}'); }
  catch { return res.status(500).json({ error: 'scoring_configuration_error' }); }

  if (!Object.prototype.hasOwnProperty.call(key, itemId)) {
    return res.status(404).json({ error: 'unknown_item' });
  }

  return res.status(200).json({ correct: key[itemId] === selected });
};
