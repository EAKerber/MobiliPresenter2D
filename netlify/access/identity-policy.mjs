export function identityRoles(user) {
  const roles = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...(Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []),
  ];
  return new Set(roles.filter((role) => typeof role === "string"));
}

export function canIssueOrRevokeGrants(user) {
  if (!user?.id) return false;
  const roles = identityRoles(user);
  return roles.has("admin") || roles.has("staff");
}

export function canManageAdministration(user) {
  return Boolean(user?.id && identityRoles(user).has("admin"));
}

export function canUseInternalPages(user) {
  if (!user?.id) return false;
  const roles = identityRoles(user);
  return roles.has("admin") || roles.has("staff");
}

export function canUseConfigurator({ user, temporarySession } = {}) {
  return canUseInternalPages(user)
    || Boolean(temporarySession?.id && temporarySession?.grant_id && temporarySession?.expires_at);
}
