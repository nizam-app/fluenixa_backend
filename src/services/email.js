const { loadEnv } = require('../config/env')
const { normalizeLocale } = require('../constants/locales')
const { renderContactFormEmail, renderNotificationEmail, welcomeMessageForRole } = require('./emailTemplates')

function isValidAppUrl(value) {
  if (!value || value === '*') return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function resolveAppUrl(env) {
  const configured = (process.env.APP_URL || '').trim()
  if (isValidAppUrl(configured)) return configured.replace(/\/$/, '')

  const clientOrigins = (env.clientOrigin || '')
    .split(',')
    .map((value) => value.trim())
    .filter(isValidAppUrl)

  const httpsOrigin = clientOrigins.find((value) => value.startsWith('https://'))
  if (httpsOrigin) return httpsOrigin.replace(/\/$/, '')

  if (clientOrigins[0]) return clientOrigins[0].replace(/\/$/, '')

  return env.isProduction
    ? 'https://staging.flunexia.fr'
    : 'http://localhost:5173'
}

function getEmailConfig() {
  const env = loadEnv()
  const appUrl = resolveAppUrl(env)

  return {
    apiKey: (process.env.BREVO_API_KEY || '').trim(),
    fromEmail: (process.env.BREVO_FROM_EMAIL || 'noreply@flunexia.org').trim(),
    fromName: (process.env.BREVO_FROM_NAME || 'Flunexia').trim(),
    appUrl,
    enabled: Boolean((process.env.BREVO_API_KEY || '').trim()),
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

async function sendTransactionalEmail({ toEmail, toName, subject, htmlContent, textContent, replyTo }) {
  const config = getEmailConfig()
  if (!config.enabled || !toEmail) {
    return { sent: false, reason: 'email_not_configured' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  const payload = {
    sender: { name: config.fromName, email: config.fromEmail },
    to: [{ email: toEmail, name: toName || toEmail }],
    subject,
    htmlContent,
    textContent: textContent || htmlContent.replace(/<[^>]+>/g, ' '),
  }

  if (replyTo?.email) {
    payload.replyTo = { email: replyTo.email, name: replyTo.name || replyTo.email }
  }

  let response
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeoutId)
    const reason = error?.name === 'AbortError' ? 'provider_timeout' : 'provider_error'
    console.error('[email] Brevo request failed:', reason, error?.message || error)
    return { sent: false, reason, detail: error?.message || String(error) }
  }

  clearTimeout(timeoutId)

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error('[email] Brevo error:', response.status, body)
    return { sent: false, reason: 'provider_error', status: response.status, detail: body.slice(0, 300) }
  }

  console.info('[email] sent to', toEmail, 'subject:', subject)
  return { sent: true }
}

async function sendNotificationEmail({ user, type, title, body, metadata = {}, tripId }) {
  const recipientEmail = String(user?.email || '')
    .trim()
    .toLowerCase()
  if (!recipientEmail) return { sent: false, reason: 'no_recipient' }

  const config = getEmailConfig()
  const template = renderNotificationEmail({
    type,
    user: { ...user, locale: normalizeLocale(user?.locale) },
    metadata: { ...metadata, title, body, fallbackBody: body },
    appUrl: config.appUrl,
    tripId: tripId || metadata.tripId,
  })

  return sendTransactionalEmail({
    toEmail: recipientEmail,
    toName: user.name,
    subject: template.subject,
    htmlContent: template.htmlContent,
    textContent: template.textContent,
  })
}

async function sendWelcomeEmail(user, { pendingApproval = false, email } = {}) {
  const recipientEmail = String(email || user?.email || '')
    .trim()
    .toLowerCase()
  if (!recipientEmail) return { sent: false, reason: 'no_recipient' }

  const locale = normalizeLocale(user?.locale)
  const recipient = {
    email: recipientEmail,
    name: user?.name || recipientEmail.split('@')[0],
    role: user?.role,
    locale,
  }

  return sendNotificationEmail({
    user: recipient,
    type: 'welcome',
    title: pendingApproval
      ? locale === 'fr'
        ? 'Inscription reçue'
        : 'Registration received'
      : locale === 'fr'
        ? 'Bienvenue sur Flunexia'
        : 'Welcome to Flunexia',
    body: welcomeMessageForRole(recipient.role, locale, { pendingApproval }),
    tripId: null,
  })
}

function getContactInboxEmail() {
  const env = loadEnv()
  return env.contactInboxEmail || 'contact@flunexia.fr'
}

async function sendContactFormEmail({ name, email, role, message, messageId }) {
  const inbox = getContactInboxEmail()
  const template = renderContactFormEmail({ name, email, role, message, messageId })

  return sendTransactionalEmail({
    toEmail: inbox,
    toName: 'Flunexia Contact',
    subject: template.subject,
    htmlContent: template.htmlContent,
    textContent: template.textContent,
    replyTo: { email, name },
  })
}

module.exports = {
  getEmailConfig,
  getEmailStatus,
  getContactInboxEmail,
  isConfigured,
  sendContactFormEmail,
  sendNotificationEmail,
  sendTransactionalEmail,
  sendWelcomeEmail,
}
