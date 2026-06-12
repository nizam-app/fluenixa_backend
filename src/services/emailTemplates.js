const { normalizeLocale } = require('../constants/locales')

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatOfferDate(date, locale) {
  if (!date) return '—'
  try {
    return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date))
  } catch {
    return String(date)
  }
}

function formatAmount(price, currency, locale) {
  const amount = Number(price)
  if (!Number.isFinite(amount)) return '—'
  try {
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount)
  } catch {
    return `${amount} ${currency || 'EUR'}`
  }
}

function buildAppLink(appUrl, tripId) {
  const base = String(appUrl || '').replace(/\/$/, '')
  if (tripId) return `${base}/trips/${tripId}`
  return base
}

function renderEmailLayout({ locale, bodyHtml, ctaHref, ctaLabel }) {
  const lang = locale === 'fr' ? 'fr' : 'en'
  const team = locale === 'fr' ? "L'équipe Flunexia" : 'The Flunexia Team'

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:Inter,Arial,sans-serif;color:#1b1b1f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e2e8e5;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;color:#2D6A4F;">FLUNEXIA</p>
        </td></tr>
        <tr><td style="padding:8px 32px 24px;font-size:15px;line-height:1.65;color:#1b1b1f;">
          ${bodyHtml}
          <p style="margin:28px 0 0;">
            <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#2D6A4F;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px;">${escapeHtml(ctaLabel)}</a>
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 28px;font-size:14px;line-height:1.5;color:#5c5f66;">
          <p style="margin:24px 0 0;">${escapeHtml(team)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const COPY = {
  offer_received: {
    en: {
      subject: 'New Offer Received for Your Project',
      cta: 'Open Flunexia',
      body: ({ recipientName, supplierName, projectName, amount, offerDate }) => `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">You have received a new offer from <strong>${escapeHtml(supplierName)}</strong> regarding your project "<strong>${escapeHtml(projectName)}</strong>".</p>
        <p style="margin:0 0 8px;"><strong>Offered Amount:</strong> ${escapeHtml(amount)}</p>
        <p style="margin:0 0 16px;"><strong>Offer Date:</strong> ${escapeHtml(offerDate)}</p>
        <p style="margin:0;">Log in to your Flunexia account to view the details and respond to this offer.</p>`,
    },
    fr: {
      subject: 'Nouvelle offre reçue pour votre projet',
      cta: 'Ouvrir Flunexia',
      body: ({ recipientName, supplierName, projectName, amount, offerDate }) => `
        <p style="margin:0 0 16px;">Bonjour ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">Vous avez reçu une nouvelle offre de <strong>${escapeHtml(supplierName)}</strong> concernant votre projet «&nbsp;<strong>${escapeHtml(projectName)}</strong>&nbsp;».</p>
        <p style="margin:0 0 8px;"><strong>Montant proposé&nbsp;:</strong> ${escapeHtml(amount)}</p>
        <p style="margin:0 0 16px;"><strong>Date de l'offre&nbsp;:</strong> ${escapeHtml(offerDate)}</p>
        <p style="margin:0;">Connectez-vous à votre compte Flunexia pour consulter les détails et répondre à cette offre.</p>`,
    },
  },
  offer_accepted: {
    en: {
      subject: 'Your Offer Has Been Accepted',
      cta: 'Open Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;"><strong>Great news!</strong></p>
        <p style="margin:0 0 16px;">Your offer for the project "<strong>${escapeHtml(projectName)}</strong>" has been accepted by the organizer.</p>
        <p style="margin:0;">You can now view the booking details in your Flunexia account.</p>`,
    },
    fr: {
      subject: 'Votre offre a été acceptée',
      cta: 'Ouvrir Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Bonjour ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;"><strong>Bonne nouvelle&nbsp;!</strong></p>
        <p style="margin:0 0 16px;">Votre offre pour le projet «&nbsp;<strong>${escapeHtml(projectName)}</strong>&nbsp;» a été acceptée par l'organisateur.</p>
        <p style="margin:0;">Vous pouvez maintenant consulter les détails de la réservation dans votre compte Flunexia.</p>`,
    },
  },
  offer_rejected: {
    en: {
      subject: 'Update Regarding Your Offer',
      cta: 'Open Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">We regret to inform you that your offer for the project "<strong>${escapeHtml(projectName)}</strong>" was not accepted.</p>
        <p style="margin:0;">Thank you for your participation, and we hope to collaborate with you on future projects.</p>`,
    },
    fr: {
      subject: 'Mise à jour concernant votre offre',
      cta: 'Ouvrir Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Bonjour ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">Nous avons le regret de vous informer que votre offre pour le projet «&nbsp;<strong>${escapeHtml(projectName)}</strong>&nbsp;» n'a pas été retenue.</p>
        <p style="margin:0;">Merci pour votre participation. Nous espérons collaborer avec vous sur de futurs projets.</p>`,
    },
  },
  request_message: {
    en: {
      subject: 'New Message Received',
      cta: 'Open Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">You have received a new message regarding the project "<strong>${escapeHtml(projectName)}</strong>".</p>
        <p style="margin:0;">Log in to your Flunexia account to view and reply to the message.</p>`,
    },
    fr: {
      subject: 'Nouveau message reçu',
      cta: 'Ouvrir Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Bonjour ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">Vous avez reçu un nouveau message concernant le projet «&nbsp;<strong>${escapeHtml(projectName)}</strong>&nbsp;».</p>
        <p style="margin:0;">Connectez-vous à votre compte Flunexia pour consulter et répondre au message.</p>`,
    },
  },
  request_modified: {
    en: {
      subject: 'Modification of Your Project',
      cta: 'Open Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">The project "<strong>${escapeHtml(projectName)}</strong>" has been modified.</p>
        <p style="margin:0;">Please review the updated information in your Flunexia account.</p>`,
    },
    fr: {
      subject: 'Modification de votre projet',
      cta: 'Ouvrir Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Bonjour ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">Le projet «&nbsp;<strong>${escapeHtml(projectName)}</strong>&nbsp;» a été modifié.</p>
        <p style="margin:0;">Veuillez consulter les informations mises à jour dans votre compte Flunexia.</p>`,
    },
  },
  trip_modified: {
    en: {
      subject: 'Modification of Your Project',
      cta: 'Open Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">The project "<strong>${escapeHtml(projectName)}</strong>" has been modified.</p>
        <p style="margin:0;">Please review the updated information in your Flunexia account.</p>`,
    },
    fr: {
      subject: 'Modification de votre projet',
      cta: 'Ouvrir Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Bonjour ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">Le projet «&nbsp;<strong>${escapeHtml(projectName)}</strong>&nbsp;» a été modifié.</p>
        <p style="margin:0;">Veuillez consulter les informations mises à jour dans votre compte Flunexia.</p>`,
    },
  },
  offer_updated: {
    en: {
      subject: 'Offer Updated on Your Project',
      cta: 'Open Flunexia',
      body: ({ recipientName, supplierName, projectName }) => `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;"><strong>${escapeHtml(supplierName)}</strong> updated their offer for the project "<strong>${escapeHtml(projectName)}</strong>".</p>
        <p style="margin:0;">Log in to your Flunexia account to review the changes.</p>`,
    },
    fr: {
      subject: 'Offre mise à jour sur votre projet',
      cta: 'Ouvrir Flunexia',
      body: ({ recipientName, supplierName, projectName }) => `
        <p style="margin:0 0 16px;">Bonjour ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;"><strong>${escapeHtml(supplierName)}</strong> a mis à jour son offre pour le projet «&nbsp;<strong>${escapeHtml(projectName)}</strong>&nbsp;».</p>
        <p style="margin:0;">Connectez-vous à votre compte Flunexia pour consulter les modifications.</p>`,
    },
  },
  offer_withdrawn: {
    en: {
      subject: 'Offer Withdrawn',
      cta: 'Open Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">A supplier withdrew their offer for the project "<strong>${escapeHtml(projectName)}</strong>".</p>
        <p style="margin:0;">Log in to your Flunexia account for details.</p>`,
    },
    fr: {
      subject: 'Offre retirée',
      cta: 'Ouvrir Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Bonjour ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">Un fournisseur a retiré son offre pour le projet «&nbsp;<strong>${escapeHtml(projectName)}</strong>&nbsp;».</p>
        <p style="margin:0;">Connectez-vous à votre compte Flunexia pour plus de détails.</p>`,
    },
  },
  request_created: {
    en: {
      subject: 'New Service Request',
      cta: 'Open Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">A new service request is available for the project "<strong>${escapeHtml(projectName)}</strong>".</p>
        <p style="margin:0;">Log in to your Flunexia account to review and respond.</p>`,
    },
    fr: {
      subject: 'Nouvelle demande de service',
      cta: 'Ouvrir Flunexia',
      body: ({ recipientName, projectName }) => `
        <p style="margin:0 0 16px;">Bonjour ${escapeHtml(recipientName)},</p>
        <p style="margin:0 0 16px;">Une nouvelle demande de service est disponible pour le projet «&nbsp;<strong>${escapeHtml(projectName)}</strong>&nbsp;».</p>
        <p style="margin:0;">Connectez-vous à votre compte Flunexia pour consulter et répondre.</p>`,
    },
  },
  welcome: {
    en: {
      subject: 'Welcome to Flunexia',
      cta: 'Sign in to Flunexia',
      body: ({ recipientName, body }) => `
        <p style="margin:0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
        <p style="margin:0;">${escapeHtml(body)}</p>`,
    },
    fr: {
      subject: 'Bienvenue sur Flunexia',
      cta: 'Se connecter à Flunexia',
      body: ({ recipientName, body }) => `
        <p style="margin:0 0 16px;">Bonjour ${escapeHtml(recipientName)},</p>
        <p style="margin:0;">${escapeHtml(body)}</p>`,
    },
  },
}

function buildTemplateContext({ user, metadata = {}, appUrl, tripId }) {
  const locale = normalizeLocale(user?.locale)
  const recipientName = user?.name || (locale === 'fr' ? 'cher utilisateur' : 'there')
  const projectName = metadata.projectName || metadata.tripTitle || '—'
  const supplierName = metadata.supplierName || '—'

  return {
    locale,
    recipientName,
    projectName,
    supplierName,
    amount: metadata.amount || formatAmount(metadata.price, metadata.currency, locale),
    offerDate: metadata.offerDate || formatOfferDate(metadata.createdAt, locale),
    body: metadata.body || '',
    appUrl,
    tripId,
    link: buildAppLink(appUrl, tripId),
  }
}

function renderNotificationEmail({ type, user, metadata = {}, appUrl, tripId }) {
  const locale = normalizeLocale(user?.locale)
  const templateSet = COPY[type]
  const ctx = buildTemplateContext({ user, metadata, appUrl, tripId })

  if (!templateSet) {
    const fallbackBody = metadata.body || metadata.fallbackBody || ''
    return {
      subject: `[Flunexia] ${metadata.title || 'Notification'}`,
      htmlContent: renderEmailLayout({
        locale,
        bodyHtml: `<p style="margin:0 0 16px;">Hello ${escapeHtml(ctx.recipientName)},</p><p style="margin:0;">${escapeHtml(fallbackBody)}</p>`,
        ctaHref: ctx.link,
        ctaLabel: locale === 'fr' ? 'Ouvrir Flunexia' : 'Open Flunexia',
      }),
      textContent: `${ctx.recipientName}\n\n${fallbackBody}\n\n${ctx.link}`,
    }
  }

  const copy = templateSet[locale] || templateSet.en
  const bodyHtml = copy.body(ctx)
  const ctaHref = type === 'welcome' ? `${ctx.link}/login` : ctx.link

  return {
    subject: `[Flunexia] ${copy.subject}`,
    htmlContent: renderEmailLayout({
      locale,
      bodyHtml,
      ctaHref,
      ctaLabel: copy.cta,
    }),
    textContent: `${copy.subject}\n\n${ctx.recipientName}\n${ctx.link}`,
  }
}

function welcomeMessageForRole(role, locale, { pendingApproval = false } = {}) {
  const fr = locale === 'fr'
  if (role === 'provider') {
    if (pendingApproval) {
      return fr
        ? 'Merci de vous être inscrit comme fournisseur Flunexia. Votre compte est en attente d’approbation par l’administrateur de la plateforme. Nous vous enverrons un nouvel e-mail une fois vos services approuvés.'
        : 'Thank you for registering as a Flunexia supplier. Your account is pending platform administrator approval. We will email you again once your services are approved and you can sign in.'
    }
    return fr
      ? 'Bienvenue sur la plateforme Flunexia. Votre compte fournisseur est prêt. Consultez les demandes, soumettez des propositions et gérez vos réservations depuis votre tableau de bord.'
      : 'Welcome to the Flunexia platform. Your supplier account is ready. Browse trip requests, submit proposals, and manage your bookings from your dashboard.'
  }
  return fr
    ? 'Bienvenue sur la plateforme Flunexia. Votre compte organisateur est prêt. Créez des voyages, ouvrez des demandes de service et connectez-vous avec des fournisseurs de confiance.'
    : 'Welcome to the Flunexia platform. Your organizer account is ready. Create trips, open service requests, and connect with trusted suppliers.'
}

module.exports = {
  buildTemplateContext,
  formatAmount,
  formatOfferDate,
  renderNotificationEmail,
  welcomeMessageForRole,
}
