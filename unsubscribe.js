// Remove os dados de um celular (quando a família desativa as notificações).

import { getStore } from '@netlify/blobs';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Método não permitido', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('JSON inválido', { status: 400 });
  }

  if (!body.deviceId) {
    return new Response('deviceId é obrigatório', { status: 400 });
  }

  try {
    const store = getStore('tealimenta-devices');
    await store.delete(body.deviceId);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response('Erro: ' + e.message, { status: 500 });
  }
};

export const config = { path: '/.netlify/functions/unsubscribe' };
