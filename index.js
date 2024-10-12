import getDialect from "./dialects.js";
import MacroUtil from "./macro.js";
import { buildTree, optimizeTree, printTree } from "./expressionTree.js";

const generateSql = (dialectType, fields, query) => {
    const { where, limit, macros } = query;

    var dialect;
    try {
        dialect = getDialect(dialectType);
    } catch(ex) {
        throw ex;
    }

    // Flatten macros
    var resolvedWhere = where;
    if (macros !== undefined && where !== undefined) {
        const macroUtil = new MacroUtil(macros);
        resolvedWhere = macroUtil.replaceMacros(where);
    }

    var baseQueryType = "SELECT";
    var tableSpecifier = "data";
    var whereClause = "";

    if (resolvedWhere !== undefined) {
        // Build the expression tree
        const expressionTreeRoot = buildTree(undefined, resolvedWhere);

        // Perform operator-specific optimizations
        optimizeTree(expressionTreeRoot);

        // Build the where clause
        whereClause = printTree(expressionTreeRoot, dialect, fields);
    }

    return dialect.buildQuery(baseQueryType, tableSpecifier, whereClause, limit);
};

export default generateSql;
