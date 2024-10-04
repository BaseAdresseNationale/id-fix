
// Replace with your Mattermost Incoming Webhook URL
const {MESSAGE_WEBHOOK_URL} = process.env


// Send the POST request using fetch
async function sendMessageToWebHook(message: string) {
  if (!MESSAGE_WEBHOOK_URL) {
    console.error('No message web hook URL provided');
    return;
  }
  try {
    const response = await fetch(MESSAGE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Id-fix',
        text: message,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to send message to web hook. Status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error sending message to web hook:', error);
  }
}

export default sendMessageToWebHook;