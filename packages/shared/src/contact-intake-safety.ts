import type { CreateContactIntakeInput } from "./domain";

export const CONTACT_INTAKE_SENSITIVE_REDACTION =
  "[redacted secret-like value]";
export const CONTACT_INTAKE_MAX_BODY_BYTES = 32 * 1024;

export type ContactIntakeSensitiveFinding = {
  field: string;
  type: string;
  count: number;
};

export class ContactIntakeBodyTooLargeError extends Error {
  constructor(readonly maxBodyBytes = CONTACT_INTAKE_MAX_BODY_BYTES) {
    super("Contact intake request body is too large.");
    this.name = "ContactIntakeBodyTooLargeError";
  }
}

type RedactionRule = {
  type: string;
  pattern: RegExp;
  replacement?: string;
};

export function isContactIntakeBodyTooLarge(contentLength?: string | null) {
  if (!contentLength) {
    return false;
  }

  const parsed = Number.parseInt(contentLength, 10);
  return Number.isFinite(parsed) && parsed > CONTACT_INTAKE_MAX_BODY_BYTES;
}

export async function readContactIntakeBodyText(
  request: Pick<Request, "body">,
  maxBodyBytes = CONTACT_INTAKE_MAX_BODY_BYTES,
) {
  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      received += value.byteLength;

      if (received > maxBodyBytes) {
        throw new ContactIntakeBodyTooLargeError(maxBodyBytes);
      }

      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  const body = new Uint8Array(received);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

const redactionRules: RedactionRule[] = [
  {
    type: "private_key_block",
    pattern:
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    type: "bearer_token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi,
    replacement: `Bearer ${CONTACT_INTAKE_SENSITIVE_REDACTION}`,
  },
  {
    type: "openai_key",
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    type: "stripe_key",
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  },
  {
    type: "aws_access_key",
    pattern: /\b(?:A3T|AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA)[A-Z0-9]{16}\b/g,
  },
  {
    type: "google_api_key",
    pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  },
  {
    type: "github_token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    type: "slack_token",
    pattern: /\bxox(?:a|b|p|o|r|s)-[A-Za-z0-9-]{20,}\b/g,
  },
  {
    type: "resend_key",
    pattern: /\bre_[A-Za-z0-9]{20,}\b/g,
  },
  {
    type: "labeled_secret",
    pattern:
      /\b(?:api[_ -]?key|auth[_ -]?token|password|secret|token|webhook[_ -]?secret)\s*[:=]\s*[^,\s;]{8,}/gi,
  },
];

function redactSensitiveText(
  value: string,
  field: string,
): { value: string; findings: ContactIntakeSensitiveFinding[] } {
  let nextValue = value;
  const findings: ContactIntakeSensitiveFinding[] = [];

  for (const rule of redactionRules) {
    let count = 0;
    nextValue = nextValue.replace(rule.pattern, () => {
      count += 1;
      return rule.replacement ?? CONTACT_INTAKE_SENSITIVE_REDACTION;
    });

    if (count > 0) {
      findings.push({
        field,
        type: rule.type,
        count,
      });
    }
  }

  return { value: nextValue, findings };
}

function redactOptionalString(
  value: string,
  field: string,
  findings: ContactIntakeSensitiveFinding[],
) {
  const redacted = redactSensitiveText(value, field);
  findings.push(...redacted.findings);
  return redacted.value;
}

export function sanitizeContactIntakeInput(input: CreateContactIntakeInput): {
  input: CreateContactIntakeInput;
  redactions: ContactIntakeSensitiveFinding[];
} {
  const redactions: ContactIntakeSensitiveFinding[] = [];
  const utm: CreateContactIntakeInput["utm"] = {};

  for (const [key, value] of Object.entries(input.utm)) {
    utm[key] =
      typeof value === "string"
        ? redactOptionalString(value, `utm.${key}`, redactions)
        : value;
  }

  return {
    input: {
      ...input,
      name: redactOptionalString(input.name, "name", redactions),
      companyName: redactOptionalString(
        input.companyName,
        "companyName",
        redactions,
      ),
      website: redactOptionalString(input.website, "website", redactions),
      role: redactOptionalString(input.role, "role", redactions),
      teamSize: redactOptionalString(input.teamSize, "teamSize", redactions),
      message: redactOptionalString(input.message, "message", redactions),
      sourcePath: redactOptionalString(input.sourcePath, "sourcePath", redactions),
      referrer: redactOptionalString(input.referrer, "referrer", redactions),
      utm,
    },
    redactions,
  };
}
