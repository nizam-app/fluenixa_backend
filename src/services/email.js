const { loadEnv } = require('../config/env')

function resolveAppUrl(env) {
  const configured = (process.env.APP_URL || '').trim()
  if (configured && configured !== '*') return configured.replace(/\/$/, '')

  const clientOrigins = (env.clientOrigin || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const httpsOrigin = clientOrigins.find((value) => value.startsWith('https://'))
  if (httpsOrigin) return httpsOrigin.replace(/\/$/, '')

  return (clientOrigins[0] || 'http://localhost:5173').replace(/\/$/, '')
}

function getEmailConfig() {
  const env = loadEnv()
  const appUrl = resolveAppUrl(env)

  return {
    apiKey: process.env.BREVO_API_KEY || '',
    fromEmail: process.env.BREVO_FROM_EMAIL || 'noreply@flunexia.org',
    fromName: process.env.BREVO_FROM_NAME || 'Flunexia',
    appUrl,
    enabled: Boolean(process.env.BREVO_API_KEY),
  }
}

function isConfigured() {
  return getEmailConfig().enabled
}

function getEmailStatus() {
  const config = getEmailConfig()
  return {
    configured: config.enabled,
    provider: 'brevo',
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    appUrl: config.appUrl,
  }
}

async function sendTransactionalEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  const config = getEmailConfig()
  if (!config.enabled || !toEmail) {
    return { sent: false, reason: 'email_not_configured' }
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify({
      sender: { name: config.fromName, email: config.fromEmail },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject,
      htmlContent,
      textContent: textContent || htmlContent.replace(/<[^>]+>/g, ' '),
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error('[email] Brevo error:', response.status, body)
    return { sent: false, reason: 'provider_error', status: response.status, detail: body.slice(0, 300) }
  }

  console.info('[email] sent to', toEmail, 'subject:', subject)
  return { sent: true }
}

const EMAIL_TEMPLATES = {
  offer_received: ({ recipientName, title, body, appUrl }) => ({
    subject: `[Flunexia] ${title || 'New offer received'}`,
    htmlContent: `<p>Hello ${recipientName || 'there'},</p><p>${body}</p><p><a href="${appUrl}">Open Flunexia</a></p>`,
  }),
  offer_updated: ({ recipientName, title, body, appUrl }) => ({
    subject: `[Flunexia] ${title || 'Offer updated'}`,
    htmlContent: `<p>Hello ${recipientName || 'there'},</p><p>${body}</p><p><a href="${appUrl}">Review the updated offer</a></p>`,
  }),
  offer_accepted: ({ recipientName, title, body, appUrl }) => ({
    subject: `[Flunexia] ${title || 'Offer accepted'}`,
    htmlContent: `<p>Hello ${recipientName || 'there'},</p><p>${body}</p><p><a href="${appUrl}">View your offers</a></p>`,
  }),
  offer_rejected: ({ recipientName, title, body, appUrl }) => ({
    subject: `[Flunexia] ${title || 'Offer declined'}`,
    htmlContent: `<p>Hello ${recipientName || 'there'},</p><p>${body}</p><p><a href="${appUrl}">Open Flunexia</a></p>`,
  }),
  offer_withdrawn: ({ recipientName, title, body, appUrl }) => ({
    subject: `[Flunexia] ${title || 'Offer withdrawn'}`,
    htmlContent: `<p>Hello ${recipientName || 'there'},</p><p>${body}</p><p><a href="${appUrl}">Open Flunexia</a></p>`,
  }),
  request_created: ({ recipientName, title, body, appUrl }) => ({
    subject: `[Flunexia] ${title || 'New service request'}`,
    htmlContent: `<p>Hello ${recipientName || 'there'},</p><p>${body}</p><p><a href="${appUrl}">Review the request</a></p>`,
  }),
  request_modified: ({ recipientName, title, body, appUrl }) => ({
    subject: `[Flunexia] ${title || 'Request updated'}`,
    htmlContent: `<p>Hello ${recipientName || 'there'},</p><p>${body}</p><p><a href="${appUrl}">View the updated request</a></p>`,
  }),
  request_message: ({ recipientName, title, body, appUrl }) => ({
    subject: `[Flunexia] ${title || 'New message on request'}`,
    htmlContent: `<p>Hello ${recipientName || 'there'},</p><p>${body}</p><p><a href="${appUrl}">Read the message</a></p>`,
  }),
  request_status: ({ recipientName, title, body, appUrl }) => ({
    subject: `[Flunexia] ${title || 'Request status updated'}`,
    htmlContent: `<p>Hello ${recipientName || 'there'},</p><p>${body}</p><p><a href="${appUrl}">Open Flunexia</a></p>`,
  }),
  welcome: ({ recipientName, body, appUrl }) => ({
    subject: '[Flunexia] Welcome to the Flunexia platform',
    htmlContent: `<p>Hello ${recipientName || 'there'},</p><p>${body}</p><p><a href="${appUrl}/login">Sign in to Flunexia</a></p>`,
  }),
}

async function sendNotificationEmail({ user, type, title, body }) {
  if (!user?.email) return { sent: false, reason: 'no_recipient' }

  const config = getEmailConfig()
  const templateFn = EMAIL_TEMPLATES[type]
  if (!templateFn) {
    return sendTransactionalEmail({
      toEmail: user.email,
      toName: user.name,
      subject: title ? `[Flunexia] ${title}` : '[Flunexia] Notification',
      htmlContent: `<p>Hello ${user.name || 'there'},</p><p>${body || title}</p><p><a href="${config.appUrl}">Open Flunexia</a></p>`,
    })
  }

  const template = templateFn({
    recipientName: user.name,
    title,
    body,
    appUrl: config.appUrl,
  })

  return sendTransactionalEmail({
    toEmail: user.email,
    toName: user.name,
    subject: template.subject,
    htmlContent: template.htmlContent,
  })
}

function welcomeMessageForRole(role) {
  if (role === 'provider') {
    return (
      'Welcome to the Flunexia platform. Your supplier account is ready. ' +
      'Browse trip requests, submit proposals, and manage your bookings from your dashboard.'
    )
  }
  return (
    'Welcome to the Flunexia platform. Your organizer account is ready. ' +
    'Create trips, open service requests, and connect with trusted suppliers.'
  )
}

async function sendWelcomeEmail(user) {
  if (!user?.email) return { sent: false, reason: 'no_recipient' }

  return sendNotificationEmail({
    user,
    type: 'welcome',
    title: 'Welcome to the Flunexia platform',
    body: welcomeMessageForRole(user.role),
  })
}

module.exports = {
  getEmailConfig,
  getEmailStatus,
  isConfigured,
  sendNotificationEmail,
  sendTransactionalEmail,
  sendWelcomeEmail,
}
