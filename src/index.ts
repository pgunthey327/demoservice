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
// BOM Attribute Paths
// ---------------------------------------------------------------------------

/**
 * BomAttributePaths supplied for this rule.
 * When BomAttributePaths are provided they are used to resolve attribute
 * values from the input payload instead of relying on an XOM path.
 *
 * Currently the BomAttributePaths list is empty, so the transformation
 * falls back to direct field access from the request body.  If paths are
 * added in the future they will be picked up automatically.
 */
const BOM_ATTRIBUTE_PATHS: string[] = [];

/**
 * Resolve a value from the request body using a BOM attribute path.
 * Supports dot-separated paths (e.g. "record.firstName").
 * Falls back to a top-level key lookup when no matching BOM path exists.
 */
function resolveAttribute(body: Record<string, any>, fieldName: string): string {
  // First, try to find a matching BOM attribute path
  const bomPath = BOM_ATTRIBUTE_PATHS.find((p) => {
    const segments = p.split('.');
    return segments[segments.length - 1] === fieldName;
  });

  if (bomPath) {
    const segments = bomPath.split('.');
    let current: any = body;
    for (const segment of segments) {
      if (current == null || typeof current !== 'object') return '';
      current = current[segment];
    }
    return current != null ? String(current) : '';
  }

  // Fallback: direct field access from the body
  return body[fieldName] != null ? String(body[fieldName]) : '';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the input XML document from the 10 expected JSON fields.
 * Attribute values are resolved through BomAttributePaths when available.
 */
function buildInputXml(body: Record<string, any>): string {
  const esc = (v: string) =>
    String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const firstName   = esc(resolveAttribute(body, 'firstName'));
  const lastName    = esc(resolveAttribute(body, 'lastName'));
  const email       = esc(resolveAttribute(body, 'email'));
  const phone       = esc(resolveAttribute(body, 'phone'));
  const birthYear   = esc(resolveAttribute(body, 'birthYear'));
  const salary      = esc(resolveAttribute(body, 'salary'));
  const department  = esc(resolveAttribute(body, 'department'));
  const status      = esc(resolveAttribute(body, 'status'));
  const country     = esc(resolveAttribute(body, 'country'));
  const zipCode     = esc(resolveAttribute(body, 'zipCode'));

  return `<?xml version="1.0" encoding="UTF-8"?>
<record>
  <firstName>${firstName}</firstName>
  <lastName>${lastName}</lastName>
  <email>${email}</email>
  <phone>${phone}</phone>
  <birthYear>${birthYear}</birthYear>
  <salary>${salary}</salary>
  <department>${department}</department>
  <status>${status}</status>
  <country>${country}</country>
  <zipCode>${zipCode}</zipCode>
</record>`;
}

/**
 * Extract the text content of a single element from the transformed XML string.
 */
function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : '';
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

/**
 * POST /transform
 *
 * Body (JSON) – 10 input fields:
 *   firstName   : string
 *   lastName    : string
 *   email       : string   (e.g. "john.doe@example.com")
 *   phone       : string   (10 digits, e.g. "2025550199")
 *   birthYear   : string | number
 *   salary      : string | number
 *   department  : string
 *   status      : string
 *   country     : string
 *   zipCode     : string
 *
 * Response (JSON) – 10 transformed fields:
 *   fullName        : "JOHN DOE"
 *   emailDomain     : "example.com"
 *   maskedEmail     : "jo***@example.com"
 *   formattedPhone  : "(202) 555-0199"
 *   age             : "36"
 *   formattedSalary : "$72,000.00"
 *   department      : "ENGINEERING"
 *   status          : "ACTIVE"
 *   country         : "US"
 *   zipCode         : "90210"
 */
app.post('/transform', (req: Request, res: Response) => {
  const REQUIRED = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'birthYear',
    'salary',
    'department',
    'status',
    'country',
    'zipCode',
  ] as const;

  // Validate that all 10 input fields are present.
  // When BOM attribute paths are configured, resolve through them.
  const missing = REQUIRED.filter((f) => {
    const val = resolveAttribute(req.body, f);
    return val === undefined || val === '';
  });
  if (missing.length > 0) {
    res.status(400).json({
      error: 'Missing required fields',
      missing,
    });
    return;
  }

  try {
    const inputXml = buildInputXml(req.body);
    const inputDoc = xmlParse(inputXml);

    // Run the XSLT transformation
    const resultXml: string = xsltProcess(inputDoc, xsltDoc);

    // Extract the 10 output fields from the resulting XML
    const result = {
      fullName: extractTag(resultXml, 'fullName'),
      emailDomain: extractTag(resultXml, 'emailDomain'),
      maskedEmail: extractTag(resultXml, 'maskedEmail'),
      formattedPhone: extractTag(resultXml, 'formattedPhone'),
      age: extractTag(resultXml, 'age'),
      formattedSalary: extractTag(resultXml, 'formattedSalary'),
      department: extractTag(resultXml, 'department'),
      status: extractTag(resultXml, 'status'),
      country: extractTag(resultXml, 'country'),
      zipCode: extractTag(resultXml, 'zipCode'),
    };

    res.json(result);
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
  console.log('Endpoint: POST /transform');
});

export default app;
