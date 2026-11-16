const G = require('../lib/game');
module.exports = async (req, res) => {
  try {
    const st = await G.getState();
    res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=2');
    res.status(200).json({ ...st, now: Date.now() });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
