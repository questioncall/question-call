type SearchParamValue = string | string[] | undefined;

export function getCanonicalSignUpPathForRole(role?: string | null) {
  return role?.trim().toLowerCase() === "teacher"
    ? "/auth/signup/teacher"
    : "/auth/signup/student";
}

export function appendSearchParams(
  pathname: string,
  searchParams: Record<string, SearchParamValue>,
) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query.set(key, value);
      continue;
    }

    if (!Array.isArray(value)) {
      continue;
    }

    for (const item of value) {
      query.append(key, item);
    }
  }

  const queryString = query.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
