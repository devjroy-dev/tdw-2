'use client';
// Tips & Features — a permanent reference page in Studio.
// All 10 tip cards explaining what TDW can do for vendors.
// Each card is self-contained: icon, title, description, example, CTA.
// This page never changes — it's the vendor's reference guide.
import { useRouter } from 'next/navigation';

const TIPS = [
  {
    id: 'dreamai_whatsapp',
    icon: '✦',
    title: 'DreamAi on WhatsApp',
    description: 'Run your entire business from WhatsApp. Create invoices, add clients, block dates — all by sending a text. No dashboard needed.',
    example: 'Text: "Sharma ji ka invoice banao, 5 lakh"',
    cta: 'Activate DreamAi',
    href: 'https://wa.me/14155238886?text=join%20acres-eventually',
    external: true,
  },
  {
    id: 'payment_shield',
    icon: '◈',
    title: 'Payment Shield',
    description: 'Secure your final payment before the wedding day. The couple commits to paying before you travel to the venue. Never chase a balance again.',
    example: 'Couple locks ₹80,000 balance two weeks before the wedding. You travel with confidence.',
    cta: 'Go to Money',
    href: '/vendor/money',
  },
  {
    id: 'broadcast',
    icon: '◉',
    title: 'WhatsApp Broadcast',
    description: 'Message all your clients at once with one tap. Payment reminders, season greetings, availability updates — sent to everyone in seconds.',
    example: 'Send a payment reminder to every October client in 10 seconds.',
    cta: 'Go to Broadcast',
    href: '/vendor/studio/broadcast',
  },
  {
    id: 'discovery_profile',
    icon: '⬡',
    title: 'How Couples See You',
    description: 'Couples swipe your work before they see your name. Your photos do the selling. A couple falls in love with your work, spends a token, and only then sees your identity.',
    example: 'A couple matches with your style. They spend a token. They see your name and message you.',
    cta: 'Preview Your Profile',
    href: '/vendor/studio/discovery-preview',
  },
  {
    id: 'progress_ring',
    icon: '◐',
    title: 'Client Progress Ring',
    description: 'Every client has a progress ring. Watch it fill from enquiry to final payment. At a glance, you know exactly where each relationship stands.',
    example: 'Add invoice → ring fills to 60%. Mark paid → ring completes to 100%.',
    cta: 'Go to Clients',
    href: '/vendor/clients',
  },
  {
    id: 'gst_invoice',
    icon: '₹',
    title: 'GST-Compliant Invoicing',
    description: 'Every invoice auto-calculates CGST and SGST. Download as PDF. Your client gets a professional invoice. You stay compliant without an accountant.',
    example: 'Create invoice for Kapoor wedding ₹2L → GST splits instantly → download and send.',
    cta: 'Create Invoice',
    href: '/vendor/money',
  },
  {
    id: 'block_dates',
    icon: '◻',
    title: 'Block Your Calendar',
    description: 'Block dates the moment you confirm a booking. Or text DreamAi on WhatsApp. Your calendar stays accurate and double-bookings become impossible.',
    example: 'Text DreamAi: "Block Dec 15 and 16 for Kapoor wedding"',
    cta: 'Open Calendar',
    href: '/vendor/studio/calendar',
  },
  {
    id: 'referral',
    icon: '✦',
    title: 'Referral Discounts',
    description: 'Refer past clients to TDW and earn subscription discounts when they join and send an enquiry. More referrals = lower monthly bill.',
    example: '3 referrals = 20% off your monthly subscription. 10 referrals = 50% off.',
    cta: 'Get Your Referral Code',
    href: '/vendor/studio/referrals',
  },
  {
    id: 'collab_hub',
    icon: '⟡',
    title: 'Collab Hub',
    description: 'Post when you need a vendor for a shoot, or find work from other vendors who need your category. A private marketplace within TDW.',
    example: 'Post: "Looking for MUA in Jaipur, Nov 15, ₹40K budget" — matching vendors notified.',
    cta: 'Go to Collab',
    href: '/vendor/discovery/collab',
  },
  {
    id: 'image_hub',
    icon: '◫',
    title: 'Image Hub & Approval',
    description: 'Every photo you upload is reviewed by our team before going live on the couple feed. Make them catalogue-worthy — editorial, portrait-oriented, well-lit.',
    example: 'Sharp, well-lit, portrait-oriented photos get approved faster. Think Vogue, not Instagram.',
    cta: 'Go to Image Hub',
    href: '/vendor/discovery/images',
  },
];

export default function TipsAndFeaturesPage() {
  const router = useRouter();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        background: '#F8F7F5', minHeight: '100dvh',
        paddingTop: 24,
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom) + 24px)',
      }}>

        {/* Header */}
        <div style={{ padding: '0 20px 28px' }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
            letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8C8480', margin: '0 0 6px',
          }}>YOUR STUDIO</p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300,
            color: '#111111', margin: 0, lineHeight: 1.1,
          }}>Tips & Features</h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
            color: '#888580', margin: '8px 0 0',
          }}>Everything TDW can do for your business.</p>
        </div>

        {/* Tip cards */}
        <div style={{ padding: '0 20px' }}>
          {TIPS.map((tip, i) => (
            <div key={tip.id} style={{
              background: '#FFFFFF', border: '0.5px solid #E2DED8',
              borderRadius: 14, padding: 20, marginBottom: 12,
            }}>
              {/* Icon + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 16,
                  color: '#C9A84C', flexShrink: 0,
                }}>{tip.icon}</span>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300,
                  color: '#111111', margin: 0,
                }}>{tip.title}</p>
              </div>

              {/* Description */}
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                color: '#555250', lineHeight: 1.6, margin: '0 0 12px',
              }}>{tip.description}</p>

              {/* Example box */}
              <div style={{
                background: '#F8F7F5', borderRadius: 8, padding: 12, marginBottom: 14,
              }}>
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200,
                  letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 4px',
                }}>EXAMPLE</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  fontStyle: 'italic', color: '#555250', margin: 0, lineHeight: 1.5,
                }}>{tip.example}</p>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  if (tip.external) window.open(tip.href, '_blank');
                  else router.push(tip.href);
                }}
                style={{
                  width: '100%', height: 40, background: '#111111', border: 'none',
                  borderRadius: 100, cursor: 'pointer',
                  fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                  letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F8F7F5',
                }}
              >{tip.cta}</button>
            </div>
          ))}
        </div>

      </div>
    </>
  );
}
