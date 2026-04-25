import os

# ── 1. service worker push handlers ─────────────────────────────────────────
sw_path = 'web/public/sw.js'
with open(sw_path, 'r') as f:
    sw = f.read()

push_handler = """
// Push notification handler
self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'TDW', body: event.data.text() }; }
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'The Dream Wedding', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
"""

if 'push' not in sw:
    sw += push_handler
    with open(sw_path, 'w') as f:
        f.write(sw)
    print("DONE: sw.js push handlers")
else:
    print("SKIP: sw.js already has push handler")

# ── 2. vendor today — push helper functions + subscribeToPush call ───────────
today_path = 'web/app/vendor/today/page.tsx'
with open(today_path, 'r') as f:
    today = f.read()

push_helpers = """// Push notification helpers
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function savePushSubscription(vendorId: string, sub: PushSubscription) {
  await fetch(`${API}/api/v2/vendor/push-subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendor_id: vendorId, subscription: sub.toJSON() }),
  }).catch(() => {});
}

async function subscribeToPush(vendorId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await savePushSubscription(vendorId, existing);
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    await savePushSubscription(vendorId, sub);
  } catch {}
}

"""

marker = "// \u2500\u2500\u2500 Main Page \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\nexp"

if 'subscribeToPush' not in today:
    # find the export default line
    idx = today.find('export default function VendorTodayPage')
    if idx != -1:
        today = today[:idx] + push_helpers + today[idx:]
        print("DONE: push helpers added to vendor today")
    else:
        print("ERROR: could not find VendorTodayPage")
else:
    print("SKIP: push helpers already present")

# Add subscribeToPush call inside useEffect
call_marker = "    // First-login intro card \u2014 show once per device"
call_old = """    // First-login intro card \u2014 show once per device
    const seen = localStorage.getItem('onboarding_intro_seen');
    if (!seen) {
      setShowIntroCard(true);
      localStorage.setItem('onboarding_intro_seen', 'true');
    }
  }, []);"""

call_new = """    // First-login intro card \u2014 show once per device
    const seen = localStorage.getItem('onboarding_intro_seen');
    if (!seen) {
      setShowIntroCard(true);
      localStorage.setItem('onboarding_intro_seen', 'true');
    }

    // Push notification subscription
    subscribeToPush(s.vendorId);
  }, []);"""

if call_old in today:
    today = today.replace(call_old, call_new, 1)
    print("DONE: subscribeToPush call added")
elif 'subscribeToPush(s.vendorId)' in today:
    print("SKIP: subscribeToPush call already present")
else:
    print("ERROR: could not find useEffect end marker")

with open(today_path, 'w') as f:
    f.write(today)

# ── 3. landing page — couple onboarding routing ──────────────────────────────
landing_path = 'web/app/page.tsx'
with open(landing_path, 'r') as f:
    landing = f.read()

old_routing = """      // For new vendors with no name \u2014 go through onboarding first
      const needsOnboarding = isVendor && !pinSet && !record.name;
      if (needsOnboarding) {
        router.push('/vendor/onboarding');
      } else {
        router.push(pinSet
          ? (isVendor ? '/vendor/pin-login' : '/couple/pin-login')
          : (isVendor ? '/vendor/pin' : '/couple/pin'));
      }"""

new_routing = """      // For new vendors with no name \u2014 go through onboarding first
      const vendorNeedsOnboarding = isVendor && !pinSet && !record.name;
      // For new couples with no name \u2014 go through couple onboarding first
      const coupleNeedsOnboarding = !isVendor && !pinSet && !record.name;
      if (vendorNeedsOnboarding) {
        router.push('/vendor/onboarding');
      } else if (coupleNeedsOnboarding) {
        router.push('/couple/onboarding');
      } else {
        router.push(pinSet
          ? (isVendor ? '/vendor/pin-login' : '/couple/pin-login')
          : (isVendor ? '/vendor/pin' : '/couple/pin'));
      }"""

if old_routing in landing:
    landing = landing.replace(old_routing, new_routing, 1)
    print("DONE: couple onboarding routing in landing page")
elif 'coupleNeedsOnboarding' in landing:
    print("SKIP: couple onboarding routing already present")
else:
    print("ERROR: could not find routing block")

with open(landing_path, 'w') as f:
    f.write(landing)

# ── 4. couple layout — exclude onboarding from shell ────────────────────────
layout_path = 'web/app/couple/layout.tsx'
with open(layout_path, 'r') as f:
    layout = f.read()

if "'/couple/onboarding'" not in layout:
    layout = layout.replace(
        "const AUTH_ROUTES = ['/couple/pin', '/couple/pin-login', '/couple/login'];",
        "const AUTH_ROUTES = ['/couple/pin', '/couple/pin-login', '/couple/login', '/couple/onboarding'];"
    )
    layout = layout.replace(
        "    const skipPaths = ['/couple/pin', '/couple/pin-login', '/couple/login'];",
        "    const skipPaths = ['/couple/pin', '/couple/pin-login', '/couple/login', '/couple/onboarding'];"
    )
    with open(layout_path, 'w') as f:
        f.write(layout)
    print("DONE: couple layout updated")
else:
    print("SKIP: couple layout already updated")

print("\nAll frontend changes applied.")
