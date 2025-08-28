
// Replace with your Mattermost Incoming Webhook URL
const { MESSAGE_WEBHOOK_URL, BAN_API_URL, BAN_API_TOKEN } = process.env

// Interface simple pour les données de base
interface BasicRevisionData {
  message: string
  timestamp: string
  source: 'id-fix-bot'
  // On peut ajouter des champs optionnels si on arrive à les extraire facilement
  codeCommune?: string
  status?: 'success' | 'error' | 'warning' | 'info'
}

// Fonction simple pour extraire SEULEMENT ce qui est évident et sûr
function extractBasicInfo(message: string): BasicRevisionData {
  const data: BasicRevisionData = {
    message,
    timestamp: new Date().toISOString(),
    source: 'id-fix-bot'
  }

  // Extraction simple et robuste du code commune (si présent)
  const communeMatch = message.match(/(\d{5})/)
  if (communeMatch) {
    data.codeCommune = communeMatch[1]
  }

  // Détection simple du statut basé sur les emojis (si présents)
  if (message.includes('⚠️')) data.status = 'warning'
  else if (message.includes('🔴')) data.status = 'error'  
  else if (message.includes('✅')) data.status = 'success'
  else data.status = 'info'

  return data
}

// Fonction pour envoyer vers votre nouvelle API BAN
async function sendToDatabase(basicData: BasicRevisionData) {
  if (!BAN_API_URL || !BAN_API_TOKEN) {
    console.error('Configuration API BAN manquante (BAN_API_URL, BAN_API_TOKEN)')
    return
  }

  try {
    // On envoie le minimum requis, le reste sera NULL en base
    const payload = {
      revisionId: crypto.randomUUID(), // On génère un ID temporaire
      codeCommune: basicData.codeCommune || '00000', // Code par défaut si pas trouvé
      communeName: null,
      submissionDate: basicData.timestamp,
      status: basicData.status || 'info',
      isIntegratedInBan: false,
      integrationDate: null,
      errorType: null,
      message: basicData.message, // Le message brut complet
      details: {
        source: basicData.source,
        originalTimestamp: basicData.timestamp,
        rawMessage: basicData.message
      },
      notificationsSent: []
    }
    console.log(payload)

    const response = await fetch(`${BAN_API_URL}/alerts/revisions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BAN_API_TOKEN}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Erreur API BAN (${response.status}):`, errorText)
    } else {
      console.log(`✅ Message Id-fix enregistré en base de données`)
    }
  } catch (error) {
    console.error('Erreur envoi vers API BAN:', error)
  }
}

// Fonction principale - INCHANGÉE dans son comportement
async function asyncSendMessageToWebHook(message: string) {
  // 1. NOUVEAU : Extraire les infos de base et envoyer en DB
  const basicData = extractBasicInfo(message)
  await sendToDatabase(basicData)

  // 2. EXISTANT : Continuer à envoyer vers Mattermost (comportement inchangé)
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
        text: message,
      }),
    })

    if (!response.ok) {
      console.error(
        `Failed to send message to web hook. Status: ${response.status}`
      )
    }
  } catch (error) {
    console.error('Error sending message to web hook:', error)
  }
}

export default asyncSendMessageToWebHook