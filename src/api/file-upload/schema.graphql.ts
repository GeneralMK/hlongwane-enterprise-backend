const FileUploadSchema = `#graphql
type FileUpload {
    id: ID
    createdAt:    DateTime
    updatedAt:    DateTime
    name:         String
    size:         Int
    type:         String
    url:          String
    objectKey:    String
}

input CreateFileUploadInput {
    name:         String
    size:         Int
    type:         String
    url:          String
    objectKey:    String
}

input UpdateFileUploadInput {
    name:         String
    size:         Int
    type:         String
    url:          String
    objectKey:    String
}

type Mutation {
  createFileUpload(input:CreateFileUploadInput!): FileUpload
  updateFileUpload(id:ID!,data: UpdateFileUploadInput!): FileUpload
  deleteFileUpload(id: ID!): String
}

`;
export default FileUploadSchema;
