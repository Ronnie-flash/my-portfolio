var APP_VERSION = '2026.07.16.3';
var CACHE_NAME = 'med-alarm-' + APP_VERSION;
var urlsToCache = [
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

var scheduleData = { meds: [], packs: [] };
var checkInterval = null;
var shownNotifs = new Set();

self.addEventListener('install', function (event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(clients.claim());
    startBackgroundCheck();
});

self.addEventListener('fetch', function (event) {
    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'updateSchedule') {
        scheduleData = event.data.data;
        startBackgroundCheck();
    }
    if (event.data && event.data.type === 'skipWaiting') {
        self.skipWaiting();
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('index.html');
        })
    );
});

function startBackgroundCheck() {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(checkNotifications, 1000);
}

function checkNotifications() {
    var now = Date.now();
    var maxAge = 86400000;

    for (var med of scheduleData.meds) {
        if (med.status !== 'active') continue;
        if (med.nextDose && med.nextDose <= now) {
            var tag = med.id + '_' + med.nextDose;
            if (shownNotifs.has(tag)) continue;
            if (now - med.nextDose > maxAge) continue;
            shownNotifs.add(tag);
            var body = med.name + (med.dosage ? ' · ' + med.dosage : '') + (med.notes ? '\n' + med.notes : '');
            self.registration.showNotification('💊 该吃' + med.name + '了！', {
                body: body, tag: tag, requireInteraction: true
            });
        }
    }

    for (var pack of scheduleData.packs) {
        if (pack.status !== 'active') continue;
        if (pack.remindMode === 'unified') {
            if (pack.nextDose && pack.nextDose <= now) {
                var tag = pack.id + '_' + pack.nextDose;
                if (shownNotifs.has(tag)) continue;
                if (now - pack.nextDose > maxAge) continue;
                shownNotifs.add(tag);
                var names = pack.meds.map(function(m) { return m.name + (m.dosage ? ' · ' + m.dosage : ''); }).join('、');
                self.registration.showNotification('💊 该吃药了！', {
                    body: names, tag: tag, requireInteraction: true
                });
            }
        } else {
            for (var med of pack.meds) {
                if (med.nextDose && med.nextDose <= now) {
                    var tag = pack.id + '_' + med.id + '_' + med.nextDose;
                    if (shownNotifs.has(tag)) continue;
                    if (now - med.nextDose > maxAge) continue;
                    shownNotifs.add(tag);
                    self.registration.showNotification('💊 该吃' + med.name + '了！', {
                        body: med.name + (med.dosage ? ' · ' + med.dosage : '') + '\n（组合：' + pack.name + '）' + (med.notes ? '\n' + med.notes : ''),
                        tag: tag, requireInteraction: true
                    });
                }
            }
        }
    }
}
