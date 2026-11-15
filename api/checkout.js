module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  return res.status(410).json({
    error: "Novas compras são feitas exclusivamente pelo Mercado Livre."
  });
};
