import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { tmpdir } from 'os';
import { EventEmitter } from 'node:events';
import { createRequest, createResponse } from 'node-mocks-http';
import { createApp } from '../index.js';

let app;
let dbPath;

function buildMonth(dateStr) {
  return dateStr.slice(0, 7);
}

function setupApp() {
  dbPath = path.join(tmpdir(), `abattoir-test-${Date.now()}-${Math.random()}.db`);
  const created = createApp({ dbPath });
  app = created.app;
}

async function callApi(method, url, body) {
  return new Promise((resolve, reject) => {
    const req = createRequest({ method, url, headers: { 'content-type': 'application/json' } });
    const res = createResponse({ eventEmitter: EventEmitter });
    if (body !== undefined) {
      req.body = body;
      req._body = true; // bypass body-parser stream parsing
    }
    res.on('end', () => resolve(res));
    res.on('finish', () => resolve(res));
    res.on('error', reject);
    app.handle(req, res, (err) => {
      if (err) reject(err);
    });
  });
}

test.before(() => {
  setupApp();
});

test.after(() => {
  if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
});

test('Addition abattage', async () => {
  const date = '2024-12-15';
  await callApi('POST', '/api/abattage', { date, species: 'ovin', number: 10, weight: 100 });
  await callApi('POST', '/api/abattage', { date, species: 'ovin', number: 5, weight: 20 });
  const month = buildMonth(date);
  const res = await callApi('GET', `/api/month/${month}`);
  const data = res._getJSONData();
  const record = data.abattage.find((r) => r.species === 'ovin');
  assert.equal(record.total_number, 15);
  assert.equal(record.total_weight, 120);
});

test('Addition saisies', async () => {
  const date = '2024-12-16';
  const body = { date, species: 'caprin', organ: 'foie', cause: 'Parasite', number: 2 };
  await callApi('POST', '/api/seizures', body);
  await callApi('POST', '/api/seizures', { ...body, number: 3 });
  const month = buildMonth(date);
  const res = await callApi('GET', `/api/month/${month}`);
  const data = res._getJSONData();
  const record = data.seizures.find((r) => r.species === 'caprin');
  assert.equal(record.total_number, 5);
});

test('Export CSV abattage', async () => {
  const month = '2024-12';
  const res = await callApi('GET', `/api/export/${month}/abattage.csv`);
  const text = res._getData().toString();
  assert.equal(res.getHeader('content-type'), 'text/csv; charset=utf-8');
  assert.ok(text.includes('species;'));
  assert.ok(text.includes(';'));
});

test('Export PDF', async () => {
  const month = '2024-12';
  const res = await callApi('GET', `/api/export/${month}/report.pdf`);
  const buf = res._getBuffer();
  assert.equal(res.getHeader('content-type'), 'application/pdf');
  assert.ok(buf.length > 1024, `PDF trop petit (${buf.length} bytes)`);
});

test('Validation Zod', async () => {
  const res = await callApi('POST', '/api/abattage', {
    date: '2024-12-20',
    species: 'ovin',
    number: -1,
    weight: 10
  });
  assert.equal(res.statusCode, 400);
});
