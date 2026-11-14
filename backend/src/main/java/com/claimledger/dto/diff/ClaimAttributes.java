package com.claimledger.dto.diff;

import java.util.ArrayList;
import java.util.List;

public class ClaimAttributes {
    private String product;
    private String attributeType;
    private String attributeName;
    private String value;
    private String rawNumericValue;
    private String currency;
    private String unit;
    private String billingPeriod;
    private List<String> qualifiers = new ArrayList<>();

    public ClaimAttributes() {}

    public ClaimAttributes(String product, String attributeType, String attributeName, String value,
                           String rawNumericValue, String currency, String unit, String billingPeriod, List<String> qualifiers) {
        this.product = product;
        this.attributeType = attributeType;
        this.attributeName = attributeName;
        this.value = value;
        this.rawNumericValue = rawNumericValue;
        this.currency = currency;
        this.unit = unit;
        this.billingPeriod = billingPeriod;
        if (qualifiers != null) this.qualifiers = qualifiers;
    }

    public String getProduct() {
        return product;
    }

    public void setProduct(String product) {
        this.product = product;
    }

    public String getAttributeType() {
        return attributeType;
    }

    public void setAttributeType(String attributeType) {
        this.attributeType = attributeType;
    }

    public String getAttributeName() {
        return attributeName;
    }

    public void setAttributeName(String attributeName) {
        this.attributeName = attributeName;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getRawNumericValue() {
        return rawNumericValue;
    }

    public void setRawNumericValue(String rawNumericValue) {
        this.rawNumericValue = rawNumericValue;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public String getBillingPeriod() {
        return billingPeriod;
    }

    public void setBillingPeriod(String billingPeriod) {
        this.billingPeriod = billingPeriod;
    }

    public List<String> getQualifiers() {
        return qualifiers;
    }

    public void setQualifiers(List<String> qualifiers) {
        this.qualifiers = qualifiers;
    }
}

