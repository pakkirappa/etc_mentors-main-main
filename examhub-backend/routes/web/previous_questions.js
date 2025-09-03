// routes/previous_questions.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/web/previous_questions');

router.get('/', auth, ctrl.list);
router.post('/', auth, ctrl.create);
//delete a record (owner-only)
router.delete('/:id', auth, ctrl.remove);
router.get('/proxy-download', auth, async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing url');

    // (Optional) allowlist – uncomment and customize if you want to restrict sources
    // const ALLOWLIST = [/^https:\/\/(jeeadv\.ac\.in|upload\.wikimedia\.org|www\.w3\.org)/i];
    // if (!ALLOWLIST.some(rx => rx.test(String(url)))) {
    //   return res.status(400).send('URL not allowed');
    // }

    const upstream = await fetch(String(url), { redirect: 'follow' });
    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .send(`Upstream failed: ${upstream.statusText}`);
    }

    // Derive filename: from upstream Content-Disposition OR from the URL
    let filename = 'file';
    const upstreamCD = upstream.headers.get('content-disposition') || '';
    const cdMatch = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(upstreamCD); // basic parse
    if (cdMatch && cdMatch[1]) {
      try {
        filename = decodeURIComponent(cdMatch[1]);
      } catch {
        filename = cdMatch[1];
      }
    } else {
      try {
        const u = new URL(String(url));
        const last = (u.pathname.split('/').pop() || '').split('?')[0];
        if (last) filename = decodeURIComponent(last);
      } catch (_) {}
    }

    const contentType =
      upstream.headers.get('content-type') || 'application/octet-stream';

    // Force download
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('Cache-Control', 'private, max-age=60');

    // Stream to client (no buffering big files in memory)
    const reader = upstream.body.getReader();
    res.flushHeaders?.();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error('proxy-download error:', err);
    res.status(500).send('Failed to download');
  }
});
router.post('/upload', auth, ctrl.uploadResource);
module.exports = router;
