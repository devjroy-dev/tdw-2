// /couple/discover — production couple-facing Discovery route.
// Session 2: anonymous flow only. Session is null.
// Session 2b will inject real session from Supabase auth.

import Discovery from '@/components/discovery/Discovery';

export const metadata = {
  title: 'Discover · The Dream Wedding',
  description: 'Curated by Swati Roy.',
};

export default function CoupleDiscoverPage() {
  return <Discovery mode="couple" session={null} />;
}
