/**
 * Base class for dialect-related functions.
 */
class Dialect {
    /**
     * Helper to print field names.
     */
    printField(field) {
        return `\"${field}\"`;
    }

    /**
     * Helper to print string literals.
     */
    printString(str) {
        return `'${str}'`;
    }

    /**
     * Helper to print bool literals.
     */
    printBoolean(value) {
        if (value) return "TRUE";
        return "FALSE";
    }

    /**
     * Get the limit clause.
     * Returns an empty string if `limitRows` is undefined.
     */
    getLimitClause(limitRows) {
        if (limitRows === undefined) return "";
        return ` LIMIT ${limitRows}`;
    }

    /**
     * Build the final query.
     */
    buildQuery(baseQueryType, tableSpecifier, whereClause, limitRows) {
        return `${baseQueryType} * FROM ${tableSpecifier}${whereClause}${this.getLimitClause(limitRows)};`;
    }
};

class MySQLDialect extends Dialect {
    printField(field) {
        // MySQL fields are wrapped with backticks.
        return `\`${field}\``;
    }
}

class SQLServerDialect extends Dialect {
    buildQuery(baseQueryType, tableSpecifier, whereClause, limitRows) {
        // SQL server's limit clause is "SELECT TOP x * FROM ..."
        return `${baseQueryType}${this.getLimitClause(limitRows)} * FROM ${tableSpecifier}${whereClause};`;
    }

    getLimitClause(limitRows) {
        if (limitRows === undefined) return "";
        return ` TOP ${limitRows}`;
    }

    printBoolean(value) {
        // SQL server does not have a boolean type
        if (value) return "1=1";
        return "0=1";
    }
}

class PostgresDialect extends Dialect { }

const dialects = {
    "mysql": MySQLDialect,
    "sqlserver": SQLServerDialect,
    "postgres": PostgresDialect
};

const getDialect = name => {
    const constructor = dialects[name];
    if (constructor === undefined) {
        throw new Error(`Unsupported dialect ${name}.`);
    }
    return new constructor();
}

export default getDialect;
