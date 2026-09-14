const WebhookSchema = `#graphql

type WebhookResult {
  received: Boolean!
  processed: Boolean!
  message: String
}

`;

export default WebhookSchema;
