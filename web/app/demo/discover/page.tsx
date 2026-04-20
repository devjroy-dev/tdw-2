// /demo/discover — Swati's vendor-pitch demo route.
// Same Discovery component as /couple/discover. 'demo' mode
// switches the top eyebrow label only.
//
// Use case: Swati meets a photographer. Hands phone. They swipe.
// That is the close.

import Discovery from '@/components/discovery/Discovery';

export const metadata = {
  title: 'Preview · The Dream Wedding',
  robots: { index: false, follow: false },
};

export default function DemoDiscoverPage() {
  return <Discovery mode="demo" session={null} />;
}
