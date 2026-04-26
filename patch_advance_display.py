#!/usr/bin/env python3
"""
TDW Frontend Patch — Show advance payment in client profile Paid amount
Parses advance from invoice description field.
Drop in /workspaces/tdw-2 and run:
  python3 patch_advance_display.py
"""

# ── Backend fix: store advance_received as notes on invoice ──────────────────
import os

# Fix frontend client detail page
content = open('web/app/vendor/clients/[id]/page.tsx', 'r').read()

old = """  const { client, invoices, contract, deliveries, enquiry } = data;
  const totalInvoiced = (invoices||[]).reduce((s:number,i:any)=>s+(i.amount||0),0);
  const totalPaid = (invoices||[]).reduce((s:number,i:any)=>s+(i.status==='paid'?(i.amount||0):0),0);
  const totalDue = totalInvoiced - totalPaid;"""

new = """  const { client, invoices, contract, deliveries, enquiry } = data;
  const totalInvoiced = (invoices||[]).reduce((s:number,i:any)=>s+(i.amount||0),0);
  // Parse advance from description field for pending invoices
  function getInvoicePaid(inv: any): number {
    if (inv.status === 'paid') return inv.amount || 0;
    if (inv.description) {
      const m = inv.description.match(/Advance received[:\s]*₹?([\d,]+)/i);
      if (m) return parseInt(m[1].replace(/,/g, '')) || 0;
    }
    return 0;
  }
  const totalPaid = (invoices||[]).reduce((s:number,i:any)=>s+getInvoicePaid(i),0);
  const totalDue = totalInvoiced - totalPaid;"""

if old in content:
    content = content.replace(old, new)
    open('web/app/vendor/clients/[id]/page.tsx', 'w').write(content)
    print('Fix 1: client detail now shows advance in Paid amount')
else:
    print('Fix 1 ERROR: text not found in client detail')

# Fix clients LIST page — same calculation for the card
content2 = open('web/app/vendor/clients/page.tsx', 'r').read()

# The list page gets total_paid from backend — fix it in the backend instead
print('Fix 2: backend needs to return advance in total_paid — see backend patch')

print('\nRun: git add -A && git commit -m "Fix: show advance payment in client profile paid amount" && git push')
