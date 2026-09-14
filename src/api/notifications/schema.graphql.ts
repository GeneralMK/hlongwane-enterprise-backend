const NotificationSchema = `#graphql

enum NotificationChannel {
  EMAIL
  SMS
  PUSH
}

enum NotificationStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
}

type Notification {
  id: ID!
  userId: ID
  channel: NotificationChannel!
  status: NotificationStatus!
  recipient: String!
  templateKey: String
  subject: String
  body: String!
  metadata: JSON
  sentAt: DateTime
  failedAt: DateTime
  error: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type NotificationPagination {
  notifications: [Notification!]!
  total: Int!
  page: Int!
  limit: Int!
  totalPages: Int!
}

extend type Query {
  myNotifications(
    page: Int = 1
    limit: Int = 20
  ): NotificationPagination!
}

`;

export default NotificationSchema;
