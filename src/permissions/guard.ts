import { GraphQLError } from "graphql/error";
import type { Action } from "./rbac";
import { hasPermission } from "./rbac";


export async function assertPermission({
  userId,
  action,
}: {
  userId: string;
  action: Action;
}) {
  const permitted = await hasPermission({
    userId,
    action,
  });

  if (!permitted) {
    throw new GraphQLError(
      "You do not have permission to perform this action.",
      {
        extensions: {
          code: "FORBIDDEN",
          http: {
            status: 403,
          },
        },
      },
    );
  }

  return true;
}