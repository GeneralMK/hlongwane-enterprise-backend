import prisma from "../../../prisma";

const FileUploadResolvers = {
  Query: {},
  Mutation: {
    createFileUpload: async (_: any, { input }: any, {}: any) => {
      const fileUpload = await prisma.fileUpload.create({
        data: input,
      });
      return fileUpload;
    },
    updateFileUpload: async (_: any, { id, data }: any, {}: any) => {
      const fileUpload = await prisma.fileUpload.update({
        where: { id: parseInt(id) },
        data,
      });
      return fileUpload;
    },
    deleteFileUpload: async (_: any, { id }: any, {}: any) => {
      await prisma.fileUpload.delete({
        where: { id: parseInt(id) },
      });
      return "Success";
    },
  },
};
export default FileUploadResolvers;
