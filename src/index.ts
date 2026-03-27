import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { xsltProcess, xmlParse } from 'xslt-processor';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * XSLT stylesheet location.
 * Override with the XSLT_PATH environment variable, e.g.:
 *   XSLT_PATH=/tmp/transform.xslt npm start
 */
const XSLT_PATH =
  process.env.XSLT_PATH ?? path.resolve(__dirname, '..', 'transform.xslt');

// Load & parse the stylesheet once at startup so every request is fast.
if (!fs.existsSync(XSLT_PATH)) {
  console.error(`XSLT file not found at: ${XSLT_PATH}`);
  process.exit(1);
}
const xsltDoc = xmlParse(fs.readFileSync(XSLT_PATH, 'utf-8'));
console.log(`XSLT loaded from: ${XSLT_PATH}`);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The 10 insurance input fields (BOM paths expressed as flat JSON keys).
 *
 * BOM Path                  → JSON key
 * ─────────────────────────────────────
 * policy.policyNumber       → policyNumber
 * policy.holder.name        → holderName
 * policy.holder.dateOfBirth → dateOfBirth
 * policy.coverage.type      → coverageType
 * policy.coverage.premium   → premiumAmount
 * policy.coverage.deductible→ deductibleAmount
 * policy.coverage.startDate → coverageStartDate
 * policy.coverage.endDate   → coverageEndDate
 * policy.risk.score         → riskScore
 * policy.claim.status       → claimStatus
 */
interface InsuranceBomInput {
  policyNumber: string;       // e.g. "POL-2024-001234"
  holderName: string;         // e.g. "Jane Doe"
  dateOfBirth: string;        // e.g. "1985-06-15"
  coverageType: string;       // e.g. "auto" | "home" | "life" | "health"
  premiumAmount: string;      // e.g. "1250.00"
  deductibleAmount: string;   // e.g. "500.00"
  coverageStartDate: string;  // e.g. "2024-01-01"
  coverageEndDate: string;    // e.g. "2024-12-31"
  riskScore: string;          // e.g. "72"  (0-100)
  claimStatus: string;        // e.g. "pending" | "approved" | "denied" | "closed"
}

/** One entry in the XOM mapping output array. */
interface XomField {
  bomPath: string;   // original BOM dot-path   e.g. "policy.policyNumber"
  xomPath: string;   // resolved XOM Java path  e.g. "com.insurance.xom.Policy/policyNumber"
  value: string;     // (optionally transformed) field value
}

/** Shape of the POST /transform response. */
interface TransformResponse {
  fields: XomField[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape special XML characters in a string value.
 */
function escXml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build the input XML <policy> document from the 10 BOM JSON fields.
 *
 * The element names here are the flat JSON keys; the XSLT maps them to
 * fully-qualified XOM paths in the output.
 */
function buildInputXml(body: InsuranceBomInput): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<policy>
  <policyNumber>${escXml(body.policyNumber)}</policyNumber>
  <holderName>${escXml(body.holderName)}</holderName>
  <dateOfBirth>${escXml(body.dateOfBirth)}</dateOfBirth>
  <coverageType>${escXml(body.coverageType)}</coverageType>
  <premiumAmount>${escXml(body.premiumAmount)}</premiumAmount>
  <deductibleAmount>${escXml(body.deductibleAmount)}</deductibleAmount>
  <coverageStartDate>${escXml(body.coverageStartDate)}</coverageStartDate>
  <coverageEndDate>${escXml(body.coverageEndDate)}</coverageEndDate>
  <riskScore>${escXml(body.riskScore)}</riskScore>
  <claimStatus>${escXml(body.claimStatus)}</claimStatus>
</policy>`;
}

/**
 * Parse every <field bomPath="…" xomPath="…">value</field> element from
 * the XSLT output XML and return them as a typed array.
 */
function extractXomFields(xml: string): XomField[] {
  const fieldPattern =
    /<field\s+bomPath="([^"]+)"\s+xomPath="([^"]+)">([^<]*)<\/field>/g;
  const fields: XomField[] = [];
  let match: RegExpExecArray | null;

  while ((match = fieldPattern.exec(xml)) !== null) {
    fields.push({
      bomPath: match[1].trim(),
      xomPath: match[2].trim(),
      value:   match[3].trim(),
    });
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

/**
 * POST /transform
 *
 * Accepts a JSON body with 10 insurance BOM fields and returns a JSON array
 * of BOM→XOM path mappings with their (optionally transformed) values.
 *
 * ── Request body example ──────────────────────────────────────────────────
 * {
 *   "policyNumber":    "POL-2024-001234",
 *   "holderName":      "Jane Doe",
 *   "dateOfBirth":     "1985-06-15",
 *   "coverageType":    "auto",
 *   "premiumAmount":   "1250.00",
 *   "deductibleAmount":"500.00",
 *   "coverageStartDate":"2024-01-01",
 *   "coverageEndDate": "2024-12-31",
 *   "riskScore":       "72",
 *   "claimStatus":     "pending"
 * }
 *
 * ── Response body example ────────────────────────────────────────────────
 * {
 *   "fields": [
 *     { "bomPath": "policy.policyNumber",       "xomPath": "com.insurance.xom.Policy/policyNumber",             "value": "POL-2024-001234" },
 *     { "bomPath": "policy.holder.name",        "xomPath": "com.insurance.xom.PolicyHolder/holderName",         "value": "JANE DOE"        },
 *     { "bomPath": "policy.holder.dateOfBirth", "xomPath": "com.insurance.xom.PolicyHolder/dateOfBirth",        "value": "1985-06-15"      },
 *     { "bomPath": "policy.coverage.type",      "xomPath": "com.insurance.xom.Coverage/coverageType",           "value": "AUTO"            },
 *     { "bomPath": "policy.coverage.premium",   "xomPath": "com.insurance.xom.Coverage/premiumAmount",          "value": "$1,250.00"       },
 *     { "bomPath": "policy.coverage.deductible","xomPath": "com.insurance.xom.Coverage/deductibleAmount",       "value": "$500.00"         },
 *     { "bomPath": "policy.coverage.startDate", "xomPath": "com.insurance.xom.Coverage/effectiveDate",          "value": "2024-01-01"      },
 *     { "bomPath": "policy.coverage.endDate",   "xomPath": "com.insurance.xom.Coverage/terminationDate",        "value": "2024-12-31"      },
 *     { "bomPath": "policy.risk.score",         "xomPath": "com.insurance.xom.RiskAssessment/riskScore",        "value": "72"              },
 *     { "bomPath": "policy.claim.status",       "xomPath": "com.insurance.xom.Claim/claimStatus",               "value": "PENDING"         }
 *   ]
 * }
 */
app.post('/transform', (req: Request, res: Response) => {
  const REQUIRED: Array<keyof InsuranceBomInput> = [
    'policyNumber',
    'holderName',
    'dateOfBirth',
    'coverageType',
    'premiumAmount',
    'deductibleAmount',
    'coverageStartDate',
    'coverageEndDate',
    'riskScore',
    'claimStatus',
  ];

  // Validate that all 10 BOM input fields are present
  const missing = REQUIRED.filter((f) => req.body[f] === undefined || req.body[f] === null);
  if (missing.length > 0) {
    res.status(400).json({
      error: 'Missing required insurance BOM fields',
      missing,
      hint: 'Supply all 10 fields: ' + REQUIRED.join(', '),
    });
    return;
  }

  try {
    // 1. Build input XML from BOM JSON fields
    const inputXml = buildInputXml(req.body as InsuranceBomInput);
    const inputDoc = xmlParse(inputXml);

    // 2. Run the BOM→XOM XSLT transformation
    const resultXml: string = xsltProcess(inputDoc, xsltDoc);

    // 3. Parse <field> elements from the <xomMappings> output
    const fields = extractXomFields(resultXml);

    if (fields.length === 0) {
      // Transformation succeeded but produced no field elements – surface the raw XML for debugging
      res.status(500).json({
        error: 'XSLT produced no field mappings',
        rawOutput: resultXml,
      });
      return;
    }

    const response: TransformResponse = { fields };
    res.json(response);
  } catch (err) {
    console.error('XSLT transformation error:', err);
    res.status(500).json({ error: 'Transformation failed', detail: String(err) });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Endpoint: POST /transform  (Insurance BOM → XOM path mapper)');
});

export default app;
