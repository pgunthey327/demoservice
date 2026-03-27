<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes" encoding="UTF-8"/>

  <!--
    Input fields (10):
      firstName, lastName, email, phone (10 digits), birthYear,
      salary, department, status, country, zipCode

    Output fields (10):
      fullName         – UPPERCASED "firstName lastName"
      emailDomain      – domain portion extracted from email
      maskedEmail      – first 2 chars + *** + @ + domain
      formattedPhone   – (XXX) XXX-XXXX
      age              – 2026 minus birthYear
      formattedSalary  – $#,##0.00
      department       – UPPERCASED
      status           – UPPERCASED
      country          – UPPERCASED
      zipCode          – passed through as-is

    NOTE: XOM path is NOT available for this rule.
    Attribute resolution is driven by BomAttributePaths in the
    server-side transformation code (src/index.ts).  The XSLT
    operates on the XML document built from those resolved values.
  -->

  <xsl:variable name="lower" select="'abcdefghijklmnopqrstuvwxyz'"/>
  <xsl:variable name="upper" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>

  <xsl:template match="/record">
    <result>

      <!-- 1. fullName: UPPERCASE firstName + space + UPPERCASE lastName -->
      <fullName>
        <xsl:value-of select="concat(
          translate(firstName, $lower, $upper),
          ' ',
          translate(lastName,  $lower, $upper)
        )"/>
      </fullName>

      <!-- 2. emailDomain: everything after the @ -->
      <emailDomain>
        <xsl:value-of select="substring-after(email, '@')"/>
      </emailDomain>

      <!-- 3. maskedEmail: first 2 chars + *** + @ + domain -->
      <maskedEmail>
        <xsl:value-of select="concat(
          substring(email, 1, 2),
          '***@',
          substring-after(email, '@')
        )"/>
      </maskedEmail>

      <!-- 4. formattedPhone: (XXX) XXX-XXXX (expects 10-digit string) -->
      <formattedPhone>
        <xsl:value-of select="concat(
          '(', substring(phone, 1, 3), ') ',
          substring(phone, 4, 3), '-',
          substring(phone, 7)
        )"/>
      </formattedPhone>

      <!-- 5. age: current year (2026) minus birthYear -->
      <age>
        <xsl:value-of select="2026 - number(birthYear)"/>
      </age>

      <!-- 6. formattedSalary: $#,##0.00 -->
      <formattedSalary>
        <xsl:value-of select="concat('$', format-number(number(salary), '#,##0.00'))"/>
      </formattedSalary>

      <!-- 7. department: UPPERCASED -->
      <department>
        <xsl:value-of select="translate(department, $lower, $upper)"/>
      </department>

      <!-- 8. status: UPPERCASED -->
      <status>
        <xsl:value-of select="translate(status, $lower, $upper)"/>
      </status>

      <!-- 9. country: UPPERCASED -->
      <country>
        <xsl:value-of select="translate(country, $lower, $upper)"/>
      </country>

      <!-- 10. zipCode: passed through unchanged -->
      <zipCode>
        <xsl:value-of select="zipCode"/>
      </zipCode>

    </result>
  </xsl:template>

</xsl:stylesheet>
