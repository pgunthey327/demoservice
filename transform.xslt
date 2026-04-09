<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

  <!--
    ============================================================
    Insurance BOM-to-XOM Path Transformation  (XSLT 1.0)
    ============================================================
    Author: TEAM PRIMUS

    Converts insurance BOM (Business Object Model) field paths
    to their corresponding XOM (Execution Object Model) Java paths.

    BOM paths use dot-notation business names understood by analysts.
    XOM paths are the fully-qualified Java class/attribute paths used
    at rule execution time by IBM ODM (or equivalent engines).

    Transformation categories:
      1. Pass-through : value copied as-is
      2. UPPERCASED   : value converted to upper case
      3. Currency     : numeric value formatted as $#,##0.00

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

  <!-- Currency format pattern reused by all monetary fields -->
  <xsl:variable name="currencyFormat" select="'#,##0.00'"/>

  <!-- XOM package prefix reused across most field mappings -->
  <xsl:variable name="xomBase" select="'com.insurance.xom.'"/>

  <!-- ============================================================
       Main template – matches the <policy> root element
       ============================================================ -->
  <xsl:template match="/policy">
    <xomMappings>

      <!-- ── 1. Pass-through fields ──────────────────────────── -->

      <!-- Policy Number -->
      <field
        bomPath="policy.policyNumber"
        xomPath="{$xomBase}Policy/policyNumber">
        <xsl:attribute name="xomPath"><xsl:value-of select="concat($xomBase, 'Policy/policyNumber')"/></xsl:attribute>
        <xsl:value-of select="policyNumber"/>
      </field>

      <!-- Date of Birth (ISO 8601: YYYY-MM-DD) -->
      <field
        bomPath="policy.holder.dateOfBirth">
        <xsl:attribute name="xomPath"><xsl:value-of select="concat($xomBase, 'PolicyHolder/dateOfBirth')"/></xsl:attribute>
        <xsl:value-of select="dateOfBirth"/>
      </field>

      <!-- Coverage Start Date → Effective Date -->
      <field
        bomPath="policy.coverage.startDate">
        <xsl:attribute name="xomPath"><xsl:value-of select="concat($xomBase, 'Coverage/effectiveDate')"/></xsl:attribute>
        <xsl:value-of select="coverageStartDate"/>
      </field>

      <!-- Coverage End Date → Termination Date -->
      <field
        bomPath="policy.coverage.endDate">
        <xsl:attribute name="xomPath"><xsl:value-of select="concat($xomBase, 'Coverage/terminationDate')"/></xsl:attribute>
        <xsl:value-of select="coverageEndDate"/>
      </field>

      <!-- Risk Score (integer 0-100) -->
      <field
        bomPath="policy.risk.score">
        <xsl:attribute name="xomPath"><xsl:value-of select="concat($xomBase, 'RiskAssessment/riskScore')"/></xsl:attribute>
        <xsl:value-of select="number(riskScore)"/>
      </field>

      <!-- ── 2. UPPERCASED fields (canonical storage) ────────── -->

      <!-- Holder Name -->
      <field
        bomPath="policy.holder.name">
        <xsl:attribute name="xomPath"><xsl:value-of select="concat($xomBase, 'PolicyHolder/holderName')"/></xsl:attribute>
        <xsl:value-of select="translate(holderName, $lower, $upper)"/>
      </field>

      <!-- Coverage Type (e.g. auto → AUTO) -->
      <field
        bomPath="policy.coverage.type">
        <xsl:attribute name="xomPath"><xsl:value-of select="concat($xomBase, 'Coverage/coverageType')"/></xsl:attribute>
        <xsl:value-of select="translate(coverageType, $lower, $upper)"/>
      </field>

      <!-- Claim Status (e.g. pending → PENDING) -->
      <field
        bomPath="policy.claim.status">
        <xsl:attribute name="xomPath"><xsl:value-of select="concat($xomBase, 'Claim/claimStatus')"/></xsl:attribute>
        <xsl:value-of select="translate(claimStatus, $lower, $upper)"/>
      </field>

      <!-- ── 3. Currency-formatted fields ($#,##0.00) ────────── -->

      <!-- Premium Amount -->
      <field
        bomPath="policy.coverage.premium">
        <xsl:attribute name="xomPath"><xsl:value-of select="concat($xomBase, 'Coverage/premiumAmount')"/></xsl:attribute>
        <xsl:value-of select="concat('$', format-number(number(premiumAmount), $currencyFormat))"/>
      </field>

      <!-- Deductible Amount -->
      <field
        bomPath="policy.coverage.deductible">
        <xsl:attribute name="xomPath"><xsl:value-of select="concat($xomBase, 'Coverage/deductibleAmount')"/></xsl:attribute>
        <xsl:value-of select="concat('$', format-number(number(deductibleAmount), $currencyFormat))"/>
      </field>

      <!-- SCBP Premium Amount (XPath-style path) -->
      <field
        bomPath="/policy/premiumAmount/value"
        xomPath="/policy/premiumAmount/value">
        <xsl:value-of select="concat('$', format-number(number(premiumAmount), $currencyFormat))"/>
      </field>

    </xomMappings>
  </xsl:template>

</xsl:stylesheet>
