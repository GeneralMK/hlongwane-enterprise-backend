import { randomUUID } from "node:crypto";

import prisma from "prisma";

import type { Context } from "../types/context.js";

import { authenticateAccessToken } from "../auth/service.js";

import { extractBearerToken } from "../auth/token.js";

export const createContext = async ({
  req,
  res,
}: {
  req: Context["req"];
  res: Context["res"];
}): Promise<Context> => {
  const token = extractBearerToken(req.headers.authorization);

  const user = token ? await authenticateAccessToken(token) : null;

  const requestIdHeader = req.headers["x-request-id"];

  const sessionIdHeader = req.headers["x-session-id"];

  const requestId =
    typeof requestIdHeader === "string" ? requestIdHeader : randomUUID();

  const sessionId =
    typeof sessionIdHeader === "string" ? sessionIdHeader : undefined;

  return {
    prisma,

    user,

    token: token ?? undefined,

    requestId,

    sessionId,

    req,

    res,
  };
};
