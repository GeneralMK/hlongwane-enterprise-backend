import { z } from "zod";

import { supabaseAdmin } from "../../../lib/supabase.js";
import { normalizePhoneNumber } from "../../../utilities/index.js";
import * as repository from "../repositories/index.js";
import { badRequest } from "src/types/app-errors.js";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

export const registerCustomer = async (raw: unknown) => {
  const input = schema.parse(raw);
  const email = input.email.trim().toLowerCase();

  if (await repository.findUserByEmail(email)) {
    throw badRequest("EMAIL_EXISTS", "A user with this email already exists.");
  }

  const customerRole = await repository.findRoleByCode("CUSTOMER");
  if (!customerRole?.isActive) {
    throw badRequest("CUSTOMER_ROLE_NOT_CONFIGURED", "CUSTOMER role is not configured.");
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: false,
    user_metadata: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
    },
  });

  if (error || !data.user) {
    throw badRequest("AUTH_USER_CREATE_FAILED", error?.message ?? "Could not create auth user.");
  }

  try {
    return await repository.createCustomer({
      authUserId: data.user.id,
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone ? normalizePhoneNumber(input.phone) : undefined,
      roleId: customerRole.id,
    });
  } catch (e) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw e;
  }
};
