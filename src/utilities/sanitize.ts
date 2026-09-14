/**
 *  Sanitize function to remove fields we do not want to show on the frontend
 *  @param data
 *  @param keys
 *  @returns
 */
export const sanitize = (data: any, keys: any[]) => {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !keys.includes(key)))
}
