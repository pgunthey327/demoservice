<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

  <!--
    ============================================================
    Insurance BOM-to-XOM Path Transformation  (XSLT 1.0)
    ============================================================
    Converts 11 insurance BOM (Business Object Model) field paths
    to their corresponding XOM (Execution Object Model) Java paths.

    BOM paths use dot-notation business names understood by analysts.
    XOM paths are the fully-qualified Java class/attribute paths used
    at rule execution time by IBM ODM (or equivalent engines).

    ┌─────────────────────────────────┬────────────────────────────────────────────────────┬──────────────────────────────┐
    │ BOM Path                        │ XOM Path                                           │ Transformation               │
    ├─────────────────────────────────┼────────────────────────────────────────────────────┼──────────────────────────────┤
    │ policy.policyNumber             │ com.insurance.xom.Policy/policyNumber              │ pass-through                 │
    │ policy.holder.name              │ com.insurance.xom.PolicyHolder/holderName          │ UPPERCASED                   │
    │ policy.holder.dateOfBirth       │ com.insurance.xom.PolicyHolder/dateOfBirth         │ pass-through (YYYY-MM-DD)    │
    │ policy.coverage.type            │ com.insurance.xom.Coverage/coverageType            │ UPPERCASED                   │
    │ policy.coverage.premium         │ com.insurance.xom.Coverage/premiumAmount           │ formatted as $#,##0.00       │
    │ policy.coverage.deductible      │ com.insurance.xom.Coverage/deductibleAmount        │ formatted as $#,##0.00       │
    │ policy.coverage.startDate       │ com.insurance.xom.Coverage/effectiveDate           │ pass-through (YYYY-MM-DD)    │
    │ policy.coverage.endDate         │ com.insurance.xom.Coverage/terminationDate         │ pass-through (YYYY-MM-DD)    │
    │ policy.risk.score               │ com.insurance.xom.RiskAssessment/riskScore         │ numeric pass-through         │
    │ policy.claim.status             │ com.insurance.xom.Claim/claimStatus                │ UPPERCASED                   │
    │ /policy/premiumAmount/value     │ /policy/premiumAmount/value                        │ formatted as $#,##0.00       │
    └─────────────────────────────────┴────────────────────────────────────────────────────┴──────────────────────────────┘

    Input XML root element : <policy>
    Output XML root element: <xomMappings>
      Each child is a <field> element carrying:
        @bomPath – the original BOM dot-path
        @xomPath – the resolved XOM Java path
        text()   – the (optionally transformed) field value
  -->

  <!-- Case-conversion alphabet strings (XSLT 1.0 compatible) -->
  <xsl:variable name="lower" select="'abcdefghijklmnopqrstuvwxyz'"/>
  <xsl:variable name="upper" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>

  <!-- ============================================================
       Main template – matches the <policy> root element
       ============================================================ -->
  <xsl:template match="/policy">
    <xomMappings>

      <!-- ── 1. BOM: policy.policyNumber
                 XOM: com.insurance.xom.Policy/policyNumber
                 Rule: pass-through – unique alphanumeric policy ID          -->
      <field
        bomPath="policy.policyNumber"
        xomPath="com.insurance.xom.Policy/policyNumber">
        <xsl:value-of select="policyNumber"/>
      </field>

      <!-- ── 2. BOM: policy.holder.name
                 XOM: com.insurance.xom.PolicyHolder/holderName
                 Rule: UPPERCASED for canonical storage                       -->
      <field
        bomPath="policy.holder.name"
        xomPath="com.insurance.xom.PolicyHolder/holderName">
        <xsl:value-of select="translate(holderName, $lower, $upper)"/>
      </field>

      <!-- ── 3. BOM: policy.holder.dateOfBirth
                 XOM: com.insurance.xom.PolicyHolder/dateOfBirth
                 Rule: pass-through (ISO 8601: YYYY-MM-DD)                   -->
      <field
        bomPath="policy.holder.dateOfBirth"
        xomPath="com.insurance.xom.PolicyHolder/dateOfBirth">
        <xsl:value-of select="dateOfBirth"/>
      </field>

      <!-- ── 4. BOM: policy.coverage.type
                 XOM: com.insurance.xom.Coverage/coverageType
                 Rule: UPPERCASED (e.g. auto → AUTO, home → HOME)            -->
      <field
        bomPath="policy.coverage.type"
        xomPath="com.insurance.xom.Coverage/coverageType">
        <xsl:value-of select="translate(coverageType, $lower, $upper)"/>
      </field>

      <!-- ── 5. BOM: policy.coverage.premium
                 XOM: com.insurance.xom.Coverage/premiumAmount
                 Rule: formatted as $#,##0.00  (e.g. 1250 → $1,250.00)      -->
      <field
        bomPath="policy.coverage.premium"
        xomPath="com.insurance.xom.Coverage/premiumAmount">
        <xsl:value-of select="concat('$', format-number(number(premiumAmount), '#,##0.00'))"/>
      </field>

      <!-- ── 6. BOM: policy.coverage.deductible
                 XOM: com.insurance.xom.Coverage/deductibleAmount
                 Rule: formatted as $#,##0.00  (e.g. 500 → $500.00)         -->
      <field
        bomPath="policy.coverage.deductible"
        xomPath="com.insurance.xom.Coverage/deductibleAmount">
        <xsl:value-of select="concat('$', format-number(number(deductibleAmount), '#,##0.00'))"/>
      </field>

      <!-- ── 7. BOM: policy.coverage.startDate
                 XOM: com.insurance.xom.Coverage/effectiveDate
                 Rule: BOM "startDate" maps to XOM "effectiveDate"; pass-through -->
      <field
        bomPath="policy.coverage.startDate"
        xomPath="com.insurance.xom.Coverage/effectiveDate">
        <xsl:value-of select="coverageStartDate"/>
      </field>

      <!-- ── 8. BOM: policy.coverage.endDate
                 XOM: com.insurance.xom.Coverage/terminationDate
                 Rule: BOM "endDate" maps to XOM "terminationDate"; pass-through -->
      <field
        bomPath="policy.coverage.endDate"
        xomPath="com.insurance.xom.Coverage/terminationDate">
        <xsl:value-of select="coverageEndDate"/>
      </field>

      <!-- ── 9. BOM: policy.risk.score
                 XOM: com.insurance.xom.RiskAssessment/riskScore
                 Rule: numeric pass-through (integer 0-100)                  -->
      <field
        bomPath="policy.risk.score"
        xomPath="com.insurance.xom.RiskAssessment/riskScore">
        <xsl:value-of select="number(riskScore)"/>
      </field>

      <!-- ── 10. BOM: policy.claim.status
                  XOM: com.insurance.xom.Claim/claimStatus
                  Rule: UPPERCASED (e.g. pending → PENDING)                  -->
      <field
        bomPath="policy.claim.status"
        xomPath="com.insurance.xom.Claim/claimStatus">
        <xsl:value-of select="translate(claimStatus, $lower, $upper)"/>
      </field>

      <!-- ── 11. BOM: /policy/premiumAmount/value
                  XOM: /policy/premiumAmount/value
                  Rule: formatted as $#,##0.00  (e.g. 1250 → $1,250.00)     -->
      <field
        bomPath="/policy/premiumAmount/value"
        xomPath="/policy/premiumAmount/value">
        <xsl:value-of select="concat('$', format-number(number(premiumAmountValue), '#,##0.00'))"/>
      </field>

    </xomMappings>
  </xsl:template>

</xsl:stylesheet>
