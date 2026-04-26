#!/usr/bin/env python3
"""
TDW Frontend Patch — Add record_payment endpoint to DreamAi tab
Drop in /workspaces/tdw-2 and run:
  python3 patch_frontend_payment.py
"""

content = open('web/app/vendor/dreamai/page.tsx', 'r').read()
fixes = 0

# Fix 1: Add record_payment to the ActionCard endpoints map
old1 = """  const endpoints: Record<string, string> = {
    create_invoice:        '/api/v2/dreamai/vendor-action/create-invoice',
    add_client:            '/api/v2/dreamai/vendor-action/add-client',
    create_task:           '/api/v2/dreamai/vendor-action/create-task',
    block_date:            '/api/v2/dreamai/vendor-action/block-date',
    send_payment_reminder: '/api/v2/dreamai/vendor-action/send-payment-reminder',
    send_client_reminder:  '/api/v2/dreamai/vendor-action/send-client-reminder',
    log_expense:           '/api/v2/dreamai/vendor-action/log-expense',
    reply_to_enquiry:      '/api/v2/dreamai/vendor-action/reply-to-enquiry',
  };"""

new1 = """  const endpoints: Record<string, string> = {
    create_invoice:        '/api/v2/dreamai/vendor-action/create-invoice',
    add_client:            '/api/v2/dreamai/vendor-action/add-client',
    create_task:           '/api/v2/dreamai/vendor-action/create-task',
    block_date:            '/api/v2/dreamai/vendor-action/block-date',
    send_payment_reminder: '/api/v2/dreamai/vendor-action/send-payment-reminder',
    send_client_reminder:  '/api/v2/dreamai/vendor-action/send-client-reminder',
    log_expense:           '/api/v2/dreamai/vendor-action/log-expense',
    reply_to_enquiry:      '/api/v2/dreamai/vendor-action/reply-to-enquiry',
    record_payment:        '/api/v2/dreamai/vendor-action/record-payment',
  };"""

if old1 in content:
    content = content.replace(old1, new1)
    print('Fix 1: record_payment added to ActionCard endpoints')
    fixes += 1
else:
    print('Fix 1 ERROR: ActionCard endpoints not found')

# Fix 2: Add record_payment to the getEndpoint function
old2 = """    const eps: Record<string, string> = {
      create_invoice:        '/api/v2/dreamai/vendor-action/create-invoice',
      add_client:            '/api/v2/dreamai/vendor-action/add-client',
      create_task:           '/api/v2/dreamai/vendor-action/create-task',
      block_date:            '/api/v2/dreamai/vendor-action/block-date',
      send_payment_reminder: '/api/v2/dreamai/vendor-action/send-payment-reminder',
      send_client_reminder:  '/api/v2/dreamai/vendor-action/send-client-reminder',
      log_expense:           '/api/v2/dreamai/vendor-action/log-expense',
      reply_to_enquiry:      '/api/v2/dreamai/vendor-action/reply-to-enquiry',
    };"""

new2 = """    const eps: Record<string, string> = {
      create_invoice:        '/api/v2/dreamai/vendor-action/create-invoice',
      add_client:            '/api/v2/dreamai/vendor-action/add-client',
      create_task:           '/api/v2/dreamai/vendor-action/create-task',
      block_date:            '/api/v2/dreamai/vendor-action/block-date',
      send_payment_reminder: '/api/v2/dreamai/vendor-action/send-payment-reminder',
      send_client_reminder:  '/api/v2/dreamai/vendor-action/send-client-reminder',
      log_expense:           '/api/v2/dreamai/vendor-action/log-expense',
      reply_to_enquiry:      '/api/v2/dreamai/vendor-action/reply-to-enquiry',
      record_payment:        '/api/v2/dreamai/vendor-action/record-payment',
    };"""

if old2 in content:
    content = content.replace(old2, new2)
    print('Fix 2: record_payment added to getEndpoint')
    fixes += 1
else:
    print('Fix 2 ERROR: getEndpoint map not found')

open('web/app/vendor/dreamai/page.tsx', 'w').write(content)
print(f'\n✓ {fixes}/2 fixes applied. Run: git add -A && git commit -m "Feat: record_payment endpoint in DreamAi tab" && git push')
