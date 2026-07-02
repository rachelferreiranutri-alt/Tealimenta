// Roda automaticamente a cada 1 minuto (configurado via schedule() abaixo).
// Para cada família cadastrada, olha os horários de refeição e suplemento que
// ELA MESMA preencheu no app, e manda a notificação push na hora certa —
// só se ainda não foi marcado como feito, e só uma vez por horário (não fica
// repetindo a cada minuto).

import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL || 'mailto:contato@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_CONTACT_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function timeToMinutes(t) {
  const parts = (t || '00:00').split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

// Mesma lógica usada dentro do app (nextSupplementDue), reproduzida aqui no
// servidor: calcula a próxima dose com base em uma referência fixa (última
// vez tomado, ou quando o suplemento foi cadastrado) — não em "agora" a cada
// checagem, pra não ficar empurrando o aviso pra sempre.
function nextSupplementDue(s, data) {
  const [hh, mm] = (s.time || '08:00').split(':').map(Number);
  const last = data.supplementsLastTaken ? data.supplementsLastTaken[s.id] : null;
  const createdAt = data.supplementsCreatedAt ? data.supplementsCreatedAt[s.id] : null;
  const anchorIso = last || createdAt;
  const anchorDate = anchorIso ? new Date(anchorIso) : new Date(Date.now() - 25 * 60 * 60 * 1000);
  const due = new Date(anchorDate);
  due.setHours(hh, mm, 0, 0);
  if (due.getTime() <= anchorDate.getTime()) due.setDate(due.getDate() + 1);
  return due;
}

async function sendPush(subscription, title, body, tag) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, tag }),
      { TTL: 3600 }
    );
    return { ok: true };
  } catch (e) {
    // 404/410 = a inscrição não existe mais (app desinstalado, permissão revogada etc.)
    return { ok: false, statusCode: e.statusCode, gone: e.statusCode === 404 || e.statusCode === 410 };
  }
}

const runCheck = async () => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY não configuradas nas variáveis de ambiente do site.');
    return { statusCode: 200, body: 'sem chaves VAPID configuradas' };
  }

  const store = getStore('tealimenta-devices');
  const { blobs } = await store.list();

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toISOString().slice(0, 10);

  for (const entry of blobs) {
    const deviceId = entry.key;
    const data = await store.get(deviceId, { type: 'json' });
    if (!data || !data.subscription) continue;

    let changed = false;

    // Vira o dia: zera quais refeições já foram avisadas hoje.
    if (data.lastNotifyDate !== todayStr) {
      data.notifiedMealsToday = [];
      data.lastNotifyDate = todayStr;
      changed = true;
    }
    if (!Array.isArray(data.notifiedMealsToday)) data.notifiedMealsToday = [];
    if (!data.notifiedSupplements) data.notifiedSupplements = {};

    // --- Refeições ---
    const meals = Array.isArray(data.meals) ? data.meals : [];
    const doneCount = typeof data.mealsDoneCount === 'number' ? data.mealsDoneCount : 0;
    for (let i = 0; i < meals.length; i++) {
      const m = meals[i];
      if (i < doneCount) continue; // já marcada como feita
      if (nowMin >= timeToMinutes(m.time) && !data.notifiedMealsToday.includes(m.id)) {
        const result = await sendPush(
          data.subscription,
          'Hora da refeição 🍽️',
          `${m.label}${data.childName ? ' — ' + data.childName : ''}`,
          'refeicao-' + m.id
        );
        if (result.gone) { await store.delete(deviceId); changed = false; break; }
        data.notifiedMealsToday.push(m.id);
        changed = true;
      }
    }

    // --- Suplementos ---
    const supplements = Array.isArray(data.supplements) ? data.supplements : [];
    for (const s of supplements) {
      if (data.supplementsTaken && data.supplementsTaken[s.id]) continue; // já tomado
      const due = nextSupplementDue(s, data);
      const dueKey = due.toISOString();
      if (now.getTime() >= due.getTime() && data.notifiedSupplements[s.id] !== dueKey) {
        const result = await sendPush(
          data.subscription,
          'Hora do remédio 💊',
          `${s.name}${data.childName ? ' — ' + data.childName : ''}`,
          'suplemento-' + s.id
        );
        if (result.gone) { await store.delete(deviceId); changed = false; break; }
        data.notifiedSupplements[s.id] = dueKey;
        changed = true;
      }
    }

    if (changed) {
      await store.setJSON(deviceId, data);
    }
  }

  return { statusCode: 200, body: 'ok' };
};

export const handler = schedule('* * * * *', runCheck);
