class Dialect {
    // Formats field names with double quotes.
    printField(field) {
        return `\"${field}\"`; // Field names are quoted with double quotes.
    }

    // Formats string literals with single quotes.
    printString(str) {
        return `'${str}'`; // String literals are wrapped in single quotes.
    }

    // Formats boolean literals.
    printBoolean(value) {
        return value ? "TRUE" : "FALSE"; // Booleans are printed as TRUE or FALSE.
    }

    // Returns the LIMIT clause for the query. If no limit is provided, it returns an empty string.
    getLimitClause(limitRows) {
        return limitRows === undefined ? "" : ` LIMIT ${limitRows}`; // Add LIMIT clause if present.
    }

    // Builds the final SQL query.
    buildQuery(baseQueryType, tableSpecifier, whereClause, limitRows) {
        // Constructs the query using base type, table, where clause, and limit.
        return `${baseQueryType} * FROM ${tableSpecifier}${whereClause}${this.getLimitClause(limitRows)};`;
    }
}

// MySQL-specific dialect.
class MySQLDialect extends Dialect {
    // MySQL fields are wrapped in backticks.
    printField(field) {
        return `\`${field}\``; // MySQL uses backticks for field names.
    }
}

// SQL Server-specific dialect.
class SQLServerDialect extends Dialect {
    // SQL Server uses the "TOP" keyword for limiting rows.
    buildQuery(baseQueryType, tableSpecifier, whereClause, limitRows) {
        // Constructs SQL Server query with TOP clause instead of LIMIT.
        return `${baseQueryType}${this.getLimitClause(limitRows)} * FROM ${tableSpecifier}${whereClause};`;
    }

    // Returns the TOP clause for SQL Server.
    getLimitClause(limitRows) {
        return limitRows === undefined ? "" : ` TOP ${limitRows}`; // Use TOP for SQL Server limit.
    }

    // SQL Server uses 1=1 for TRUE and 0=1 for FALSE.
    printBoolean(value) {
        return value ? "1=1" : "0=1"; // Booleans are represented as 1=1 (TRUE) or 0=1 (FALSE).
    }
}

// Postgres dialect inherits the default behavior from Dialect.
class PostgresDialect extends Dialect { }

// Map of supported SQL dialects.
const dialects = {
    "mysql": MySQLDialect,
    "sqlserver": SQLServerDialect,
    "postgres": PostgresDialect
}

// Retrieves the dialect constructor based on the name. Throws an error if the dialect is not supported.
const getDialect = name => {
    const constructor = dialects[name];
    if (constructor === undefined) {
        throw new Error(`Unsupported dialect ${name}.`); // Error if the dialect is not supported.
    }
    return new constructor(); // Return the appropriate dialect instance.
}

export default getDialect;
