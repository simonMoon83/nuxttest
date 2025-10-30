/**
 * Alert utilities for Discord and Slack notifications
 * @see docs/monitoring-guide.md
 */

export interface AlertOptions {
  title?: string
  isError?: boolean
  fields?: Array<{ name: string, value: string, inline?: boolean }>
}

/**
 * Send alert to Discord webhook
 *
 * @param message - Alert message
 * @param options - Alert options
 */
export async function sendDiscordAlert(
  message: string,
  options: AlertOptions = {},
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('[Alert] DISCORD_WEBHOOK_URL not configured')
    return
  }

  const { title = 'System Alert', isError = true, fields = [] } = options

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: isError ? `🚨 ${title}` : `ℹ️ ${title}`,
          description: message,
          color: isError ? 15158332 : 3447003, // Red or Blue
          fields,
          timestamp: new Date().toISOString(),
        }],
      }),
    })
  }
  catch (error) {
    console.error('[Alert] Failed to send Discord alert:', error)
  }
}

/**
 * Send alert to Slack webhook
 *
 * @param message - Alert message
 * @param options - Alert options
 */
export async function sendSlackAlert(
  message: string,
  options: AlertOptions = {},
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('[Alert] SLACK_WEBHOOK_URL not configured')
    return
  }

  const { title = 'System Alert', isError = true, fields = [] } = options

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: isError ? `🚨 ${title}` : `ℹ️ ${title}`,
        attachments: [{
          color: isError ? 'danger' : 'good',
          text: message,
          fields: fields.map(f => ({
            title: f.name,
            value: f.value,
            short: f.inline ?? true,
          })),
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    })
  }
  catch (error) {
    console.error('[Alert] Failed to send Slack alert:', error)
  }
}

/**
 * Send alert to both Discord and Slack
 *
 * @param message - Alert message
 * @param options - Alert options
 */
export async function sendAlert(
  message: string,
  options: AlertOptions = {},
): Promise<void> {
  await Promise.all([
    sendDiscordAlert(message, options),
    sendSlackAlert(message, options),
  ])
}
