import fetch from 'node-fetch'

const { MESSAGE_WEBHOOK_URL, BAN_API_URL, BAN_API_TOKEN } = process.env

interface BasicRevisionData {
  message: string
  timestamp: string
  source: 'id-fix-bot'
  cog?: string
  districtName?: string | null
  districtId?: string | null
  status?: 'success' | 'error' | 'warning' | 'info'
}

function extractBasicInfo(
  message: string, 
  cog?: string, 
  districtName?: string | null, 
  districtId?: string | null, 
  status?: 'success' | 'error' | 'warning' | 'info'
): BasicRevisionData {
  const data: BasicRevisionData = {
    message,
    timestamp: new Date().toISOString(),
    source: 'id-fix-bot'
  }

  // Utiliser les paramètres fournis en priorité
  if (cog) data.cog = cog
  if (districtName) data.districtName = districtName
  if (districtId) data.districtId = districtId
  if (status) data.status = status

  // Si pas fournis, essayer d'extraire du message (fallback)
  if (!data.cog || !data.districtName) {
    const communeMatch = message.match(/(\w+(?:-\w+)*)\s+\((\d{5})\s+\//)
    if (communeMatch) {
      data.cog = data.cog || communeMatch[2]
      data.districtName = data.districtName || communeMatch[1]
    } else {
      const codeMatch = message.match(/(\d{5})/)
      if (codeMatch && !data.cog) {
        data.cog = codeMatch[1]
      }
    }
  }

  // Auto-détection du statut seulement si pas fourni explicitement
  if (!data.status) {
    if (message.includes('⚠️') ) data.status = 'warning'
    else if (message.includes('🔴') || message.includes('blocked') || message.includes('bloquée')) data.status = 'error'
    else if (message.includes('✅')) data.status = 'success'
    else data.status = 'info'
  }

  return data
}

async function sendToDatabase(basicData: BasicRevisionData, revisionId: string) {
  if (!BAN_API_URL || !BAN_API_TOKEN) {
    console.error('Configuration API BAN manquante')
    return
  }
  
  try {
    const payload = {
      revisionId,
      cog: basicData.cog || '00000',
      districtName: basicData.districtName || null,
      districtId: basicData.districtId || null,
      status: basicData.status || 'info',
      message: basicData.message
    }
    
    const response = await fetch(`${BAN_API_URL}/alerts/revisions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${BAN_API_TOKEN}` // Changé de "Bearer" vers "Token"
      },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Erreur API BAN (${response.status}):`, errorText)
    }
  } catch (error) {
    console.error('Erreur envoi vers API BAN:', error)
  }
}

async function asyncSendMessageToWebHook(
  message: string,
  revisionId?: string,
  cog?: string,
  districtName?: string | null,
  districtId?: string | null,
  status?: 'success' | 'error' | 'warning' | 'info'
) {
  const basicData = extractBasicInfo(message, cog, districtName, districtId, status)
  
  // Envoyer en DB si on a un revisionId
  if (revisionId) {
    await sendToDatabase(basicData, revisionId)
  }
  
  // Continuer vers Mattermost
  if (!MESSAGE_WEBHOOK_URL) {
    console.error('No message web hook URL provided')
    return
  }
  
  try {
    const response = await fetch(MESSAGE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Id-fix',
        text: 
          `- **COG:** ${basicData.cog || '99999'}\n` +
          `- **Commune:** ${basicData.districtName || 'N/A'}\n` +
          `- **Status:** ${basicData.status?.toUpperCase() || 'INFO'}\n` +
          `- **Revision:** ${revisionId || 'N/A'}\n` +
          `- **Date:** ${basicData.timestamp}\n\n` +
          `- **Message :**\n${message}`
      }),
    })
    
    if (!response.ok) {
      console.error(`Failed to send message to web hook. Status: ${response.status}`)
    }
  } catch (error) {
    console.error('Error sending message to web hook:', error)
  }
}


export default asyncSendMessageToWebHook