import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const provider = process.env.TRANSLATION_PROVIDER || 'mymemory';
const apiKey = process.env.TRANSLATION_API_KEY || '';

app.post('/api/translate', async (req, res) => {
  const { text, from, to } = req.body || {};

  if (!text || !from || !to) {
    return res.status(400).json({ error: 'Missing text, from, or to' });
  }

  try {
    if (provider === 'deepl' && apiKey) {
      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: [text], target_lang: to.toUpperCase(), source_lang: from.toUpperCase() }),
      });
      const data = await response.json();
      return res.json({ translatedText: data.translations?.[0]?.text || '' });
    }

    if (provider === 'openai' && apiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Return only the translated text, nothing else.'
            },
            {
              role: 'user',
              content: `Translate this text from ${from} to ${to}: ${text}`
            }
          ],
          temperature: 0.2,
        }),
      });
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return res.json({ translatedText: content.replace(/^\s+|\s+$/g, '') });
    }

    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
    const data = await response.json();
    return res.json({ translatedText: data.responseData?.translatedText || '' });
  } catch (error) {
    return res.status(502).json({ error: 'Translation request failed', detail: error.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', provider });
});

const server = app.listen(port, () => {
  console.log(`Translation backend listening on http://localhost:${port}`);
});

server.on('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) {
        console.log(`Translation backend already running on http://localhost:${port}`);
        process.exit(0);
      }
    } catch {
      // ignore and fall through
    }

    console.error(`Port ${port} is already in use.`);
    process.exit(0);
  } else {
    console.error(error);
    process.exit(1);
  }
});
