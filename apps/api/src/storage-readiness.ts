type RelationCheckRow = {
  organizations?: string | null;
};

function isRelationCheckRow(value: unknown): value is RelationCheckRow {
  return typeof value === "object" && value !== null;
}

export function hasOrganizationsTable(result: unknown) {
  if (Array.isArray(result)) {
    return isRelationCheckRow(result[0]) && Boolean(result[0].organizations);
  }

  if (
    typeof result === "object" &&
    result !== null &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    const rows = (result as { rows: unknown[] }).rows;
    return isRelationCheckRow(rows[0]) && Boolean(rows[0].organizations);
  }

  return false;
}
