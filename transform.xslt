<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

  <!--
    ============================================================
    Insurance BOM-to-XOM Path Transformation  (XSLT 1.0)
    Author: DEMOAUTHOR
    ============================================================
    Converts insurance BOM (Business Object Model) field paths
    to their corresponding XOM (Execution Object Model) Java paths.

    BOM paths use dot-notation business names understood by analysts.
    XOM paths are the fully-qualified Java class/attribute paths used
    at rule execution time by IBM ODM (or equivalent engines).

    Transformation rules applied per field:
      - Pass-through : value copied as-is
      - UPPERCASED   : value converted to upper case
      - Currency      : numeric value formatted as $#,##0.00

    Input XML root element : <policy>
    Output XML root element: <xomMappings>
      Each child is a <field> element carrying:
        @bomPath - the original BOM dot-path
        @xomPath - the resolved XOM Java path
        text()   - the (optionally transformed) field value
  -->

  <!-- Case-conversion alphabet strings (XSLT 1.0 compatible) -->
  <xsl:variable name="lower" select="'abcdefghijklmnopqrstuvwxyz'"/>
  <xsl:variable name="upper" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>

  <!-- Currency format pattern reused by monetary fields -->
  <xsl:variable name="currencyFormat" select="'#,##0.00'"/>

  <!-- ============================================================
       Main template - matches the <policy> root element
       ============================================================ -->
  <xsl:template match="/policy">
    <xomMappings>

      <!-- 1. Policy Number (pass-through) -->
      <field
        bomPath="policy.policyNumber"
        xomPath="com.insurance.xom.Policy/policyNumber">
        <xsl:value-of select="policyNumber"/>
      </field>

      <!-- 2. Holder Name (UPPERCASED for canonical storage) -->
      <field
        bomPath="policy.holder.name"
        xomPath="com.insurance.xom.PolicyHolder/holderName">
        <xsl:value-of select="translate(holderName, $lower, $upper)"/>
      </field>

      <!-- 3. Date of Birth (pass-through, ISO 8601: YYYY-MM-DD) -->
      <field
        bomPath="policy.holder.dateOfBirth"
        xomPath="com.insurance.xom.PolicyHolder/dateOfBirth">
        <xsl:value-of select="dateOfBirth"/>
      </field>

      <!-- 4. Coverage Type (UPPERCASED, e.g. auto -> AUTO) -->
      <field
        bomPath="policy.coverage.type"
        xomPath="com.insurance.xom.Coverage/coverageType">
        <xsl:value-of select="translate(coverageType, $lower, $upper)"/>
      </field>

      <!-- 5. Premium Amount (currency formatted) -->
      <field
        bomPath="policy.coverage.premium"
        xomPath="com.insurance.xom.Coverage/premiumAmount">
        <xsl:value-of select="concat('$', format-number(number(premiumAmount), $currencyFormat))"/>
      </field>

      <!-- 6. Deductible Amount (currency formatted) -->
      <field
        bomPath="policy.coverage.deductible"
        xomPath="com.insurance.xom.Coverage/deductibleAmount">
        <xsl:value-of select="concat('$', format-number(number(deductibleAmount), $currencyFormat))"/>
      </field>

      <!-- 7. Coverage Start Date -> Effective Date (pass-through) -->
      <field
        bomPath="policy.coverage.startDate"
        xomPath="com.insurance.xom.Coverage/effectiveDate">
        <xsl:value-of select="coverageStartDate"/>
      </field>

      <!-- 8. Coverage End Date -> Termination Date (pass-through) -->
      <field
        bomPath="policy.coverage.endDate"
        xomPath="com.insurance.xom.Coverage/terminationDate">
        <xsl:value-of select="coverageEndDate"/>
      </field>

      <!-- 9. Risk Score (numeric pass-through, integer 0-100) -->
      <field
        bomPath="policy.risk.score"
        xomPath="com.insurance.xom.RiskAssessment/riskScore">
        <xsl:value-of select="number(riskScore)"/>
      </field>

      <!-- 10. Claim Status (UPPERCASED, e.g. pending -> PENDING) -->
      <field
        bomPath="policy.claim.status"
        xomPath="com.insurance.xom.Claim/claimStatus">
        <xsl:value-of select="translate(claimStatus, $lower, $upper)"/>
      </field>

      <!-- 11. SCBP Premium Amount (currency formatted, XPath-style path) -->
      <field
        bomPath="/policy/premiumAmount/value"
        xomPath="/policy/premiumAmount/value">
        <xsl:value-of select="concat('$', format-number(number(premiumAmount), $currencyFormat))"/>
      </field>

    </xomMappings>
  </xsl:template>

</xsl:stylesheet>
