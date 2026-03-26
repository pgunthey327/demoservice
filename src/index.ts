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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the input XML document from the 10 expected JSON fields.
 */
function buildInputXml(body: Record<string, string>): string {
  const esc = (v: string) =>
    String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<record>
  <firstName>${esc(body.firstName)}</firstName>
  <lastName>${esc(body.lastName)}</lastName>
  <email>${esc(body.email)}</email>
  <phone>${esc(body.phone)}</phone>
  <birthYear>${esc(body.birthYear)}</birthYear>
  <salary>${esc(body.salary)}</salary>
  <department>${esc(body.department)}</department>
  <status>${esc(body.status)}</status>
  <country>${esc(body.country)}</country>
  <zipCode>${esc(body.zipCode)}</zipCode>
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

  // Validate that all 10 input fields are present
  const missing = REQUIRED.filter((f) => req.body[f] === undefined);
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
