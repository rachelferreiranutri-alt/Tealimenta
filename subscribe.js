// Recebe, de cada celular, a inscrição de notificação + os horários atuais
// de refeição/suplemento daquela família, e guarda no Netlify Blobs.
// Não tem cadastro nem login: o "deviceId" é só um código aleatório gerado
// no próprio celular (guardado no localStorage), sem nome, telefone ou e-mail.

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

  if (!body.deviceId || typeof body.deviceId !== 'string') {
    return new Response('deviceId é obrigatório', { status: 400 });
  }

  try {
    const store = getStore('tealimenta-devices');
    const existing = (await store.get(body.deviceId, { type: 'json' })) || {};

    const merged = Object.assign({}, existing, body, {
      updatedAt: new Date().toISOString()
    });

    await store.setJSON(body.deviceId, merged);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response('Erro ao salvar: ' + e.message, { status: 500 });
  }
};

export const config = { path: '/.netlify/functions/subscribe' };
