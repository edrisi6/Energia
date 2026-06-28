'use strict';

// ── Push: incoming notification from server ──────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();

  if (data.type === 'reminder') {
    e.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        tag: `lamees-${data.slotHHMM}`,
        requireInteraction: true,
        data: { slotHHMM: data.slotHHMM },
      })
    );
    return;
  }

  if (data.type === 'claimed') {
    // Dismiss the outstanding notification for this slot and tell all
    // open tabs to refresh their UI immediately.
    e.waitUntil(
      Promise.all([
        self.registration
          .getNotifications({ tag: `lamees-${data.slotHHMM}` })
          .then(ns => ns.forEach(n => n.close())),
        self.clients
          .matchAll({ type: 'window', includeUncontrolled: true })
          .then(clients => clients.forEach(c => c.postMessage(data))),
      ])
    );
  }
});

// ── Notification click: focus or open the app ────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { slotHHMM } = e.notification.data || {};

  e.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        if (clients.length) {
          clients[0].focus();
          if (slotHHMM != null) clients[0].postMessage({ type: 'open-modal', slotHHMM });
        } else {
          self.clients.openWindow('/?slot=' + (slotHHMM ?? ''));
        }
      })
  );
});
