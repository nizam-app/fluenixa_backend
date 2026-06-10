#!/usr/bin/env node
/**
 * Quick Brevo delivery check.
 * Usage: node scripts/test-email.js recipient@example.com
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { getEmailStatus, sendNotificationEmail, sendWelcomeEmail } = require('../src/services/email')

async function main() {
  const toEmail = process.argv[2]
  const template = process.argv[3] || 'request_message'
  if (!toEmail) {
    console.error('Usage: node scripts/test-email.js recipient@example.com [welcome|request_message]')
    process.exit(1)
  }

  const status = getEmailStatus()
  console.log('Email config:', status)

  const result =
    template === 'welcome'
      ? await sendWelcomeEmail({ name: 'Flunexia test', email: toEmail, role: 'organizer' })
      : await sendNotificationEmail({
          user: { name: 'Flunexia test', email: toEmail },
          type: 'request_message',
          title: 'Flunexia notification test',
          body: 'If you received this, transactional email is working.',
        })

  console.log('Send result:', result)
  process.exit(result.sent ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
