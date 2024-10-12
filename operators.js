class Operator {
    constructor(name) {
        this.name = name;
    }

    // Callback for the operator to print the clause.
     
    print(dialect, fields, children, level) {
        throw new Error("Not implemented.");
    }

   
    //  Callback for the operator to stop processing any more child nodes.
    //  Useful for cases like, [and, x1, x2, x3, ..., xn, FALSE, xn + 2, ...]. In this case,
    //  the operator can decide to stop processing after the "FALSE".
     
    stopProcessingChildren(child) {
        return false;
    }

    
    // Callback for the operator to change to a new operator, depending on the children.
    // Useful for cases like (NOT TRUE) => FALSE.
     
    getNewOperator(children) {
        return this;
    }

    
    //  Un-nest children if supported.
    //  eg., [and, [and, x, y], z] => [and, x, y, z]
     
    unNestChildren(children) {
        return children;
    }

    
    //  Callback for the operator to prune the child.
    //  eg., ... AND TRUE ... is redundant.
     
    shouldPrune(child) {
        return false;
    }

    
    //  Callback for the operator to decide if an operator is a valid child.
     
    isValidChild(operator) {
        return true;
    }
};

class AndOperator extends Operator {
    constructor() {
        super("AND");
    }

    stopProcessingChildren(child) {
        // AND can stop when it sees a FALSE
        return isFalseOperator(child.operator);
    }

    isValidChild(operator) {
        // AND can only have other where clauses as children
        return isValidWhereClause(operator);
    }

    getNewOperator(children) {
        if (children.length === 0) {
            return new BlankOperator();
        }

        var allTrue = true;
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];

            if (!(isTrueOperator(child.operator))) {
                allTrue = false;
            }

            // AND can stop when it sees a FALSE
            if (isFalseOperator(child.operator)) {
                return new BooleanOperator(false);
            }
        }

        // a single TRUE is enough if everything is a TRUE
        if (allTrue) return new BooleanOperator(true);
        return this;
    }

    unNestChildren(children) {
        var newChildren = [];

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (!(child.operator instanceof AndOperator)) {
                newChildren.push(child);
            } else {
                // Child is also an AND, un-nest its children
                newChildren = newChildren.concat(child.children);
            }
        }

        return newChildren;
    }

    print(dialect, fields, children, level) {
        const childrenStr = children.map(child => child.print(dialect, fields, level + 1));
        var returnString = childrenStr.join(" AND ");

        if (level > 1)
            returnString = `(${returnString})`;

        return returnString;
    }

    shouldPrune(child) {
        // Can skip adding "ADD true" or blank operators to the query
        return (isTrueOperator(child.operator) ||
                (child.operator instanceof BlankOperator));
    }
};

class OrOperator extends Operator {
    constructor() {
        super("OR");
    }

    stopProcessingChildren(child) {
        // AND can stop when it sees a TRUE
        return isTrueOperator(child.operator);
    }

    isValidChild(operator) {
        return isValidWhereClause(operator);
    }

    getNewOperator(children) {
        if (children.length === 0) {
            return new BlankOperator();
        }

        var allFalse = true;
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];

            if (!(isFalseOperator(child.operator))) {
                allFalse = false;
            }

            if (isTrueOperator(child.operator)) {
                return new BooleanOperator(true);
            }
        }

        if (allFalse) return new BooleanOperator(false);
        return this;
    }

    unNestChildren(children) {
        var newChildren = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (!(child.operator instanceof OrOperator)) {
                newChildren.push(child);
            } else {
                newChildren = newChildren.concat(child.children);
            }
        }

        return newChildren;
    }

    print(dialect, fields, children, level) {
        const printedChildren = children.map(child =>
            child.print(dialect, fields, level + 1));
        var returnString = printedChildren.join(" OR ");

        if (level > 1)
            returnString = `(${returnString})`;

        return returnString;
    }

    shouldPrune(child) {
        return isFalseOperator(child.operator) ||
               (child.operator instanceof BlankOperator);
    }
};

class BooleanOperator extends Operator {
    constructor(value) {
        super("BOOL");
        this.value = value;
    };

    print(dialect, fields, children, level) {
        return dialect.printBoolean(this.value);
    }
};

class NullOperator extends Operator {
    constructor() {
        super("NULL");
    }

    print(dialect, fields, children, level) {
        return "NULL";
    }
};

class BlankOperator extends Operator {
    constructor() {
        super("");
    }

    print(dialect, fields, children, level) {
        return "";
    }
};

class FieldOperator extends Operator {
    constructor() {
        super("FIELD");
    }

    print(dialect, fields, children, level) {
        const fieldNumber = children[0].print(dialect, fields, level + 1);

        // js objects cannot have integer keys,
        // convert fieldNumber to string to get the field
        return dialect.printField(fields[`${fieldNumber}`]);
    }
};

class StringOperator extends Operator {
    constructor(value) {
        super("STRING");
        this.value = value;
    }

    print(dialect, fields, children, level) {
        return dialect.printString(this.value);
    }
};

class NumberOperator extends Operator {
    constructor(value) {
        super("NUMBER");
        this.value = value;
    }

    print(dialect, fields, children, level) {
        return this.value;
    }
};

class BinaryComparisonOperator extends Operator {
    constructor(name, predicate) {
        super(name);
        this.predicate = predicate;
    }

    print(dialect, fields, children, level) {
        const left = children[0].print(dialect, fields, level + 1);
        const right = children[1].print(dialect, fields, level + 1);

        return `${left} ${this.name} ${right}`;
    }

    getNewOperator(children) {
        const left = children[0];
        const right = children[1];

        if (isComparable(left.operator, right.operator)) {
            if (this.predicate(left.operator.value, right.operator.value))
                return new BooleanOperator(true);
            return new BooleanOperator(false);
        }

        return this;
    }
};

class LessThanOperator extends BinaryComparisonOperator {
    constructor() {
        super("<", (x, y) => (x < y));
    }
}

class GreaterThanOperator extends BinaryComparisonOperator {
    constructor() {
        super(">", (x, y) => (x > y));
    }
};

class IsEmptyOperator extends Operator {
    constructor() {
        super("ISEMPTY");
    }

    getNewOperator(children) {
        if (children[0].operator instanceof NullOperator) {
            return new BlankOperator();
        }

        return this;
    }

    print(dialect, fields, children, level) {
        const child = children[0].print(dialect, fields, level + 1);
        return `${child} IS NULL`;
    }
};

class NotEmptyOperator extends Operator {
    constructor() {
        super("ISNOTEMPTY");
    }

    getNewOperator(children) {
        if (children[0].operator instanceof NullOperator) {
            return new BooleanOperator(false);
        }

        return this;
    }

    print(dialect, fields, children, level) {
        const child = children[0].print(dialect, fields, level + 1);
        return `${child} IS NOT NULL`;
    }
};

class EqualsOperator extends BinaryComparisonOperator {
    constructor() {
        super("=", (x, y) => (x === y));
    }

    getNewOperator(children) {
        if (children.length > 2) {
            return new InOperator();
        }

        const left = children[0];
        const right = children[1];

        if (isComparable(left.operator, right.operator)) {
            if (this.predicate(left.operator.value, right.operator.value))
                return new BooleanOperator(true);
            return new BooleanOperator(false);
        }

        if (right.operator instanceof NullOperator) {
            return new IsEmptyOperator();
        }

        return this;
    }
};

class NotEqualsOperator extends Operator {
    constructor() {
        super("!=");
    }

    print(dialect, fields, children, level) {
        const left = children[0].print(dialect, fields, level + 1);
        const right = children[1].print(dialect, fields, level + 1);

        return `${left} <> ${right}`;
    }

    getNewOperator(children) {
        const left = children[0];
        const right = children[1];

        if (isComparable(left.operator, right.operator)) {
            if (left.operator.value !== right.operator.value)
                return new BooleanOperator(true);
            return new BooleanOperator(false);
        }

        if (right.operator instanceof NullOperator) {
            return new NotEmptyOperator();
        }

        return this;
    }
};

class InOperator extends Operator {
    constructor() {
        super("IN");
    }

    print(dialect, fields, children, level) {
        const left = children[0].print(dialect, fields, level + 1);
        const right = children.slice(1).map(child => child.print(dialect, fields, level + 1));

        return `${left} IN (${right.join(", ")})`;
    }
};

class NotOperator extends Operator {
    constructor() {
        super("NOT");
    }

    isValidChild(operator) {
        return isValidWhereClause(operator);
    }

    print(dialect, fields, children, level) {
        var returnString = `NOT ${children[0].print(dialect, fields, level + 1)}`;

        if (level > 1)
            returnString = `(${returnString})`;

        return returnString;
    }

    getNewOperator(children) {
        const child = children[0];

        if (child.operator instanceof NotOperator) {
            return new PlainOperator();
        }

        if (isTrueOperator(child.operator))
            return new BooleanOperator(false);

        if (isFalseOperator(child.operator))
            return new BooleanOperator(true);

        return this;
    }

    unNestChildren(children) {
        const child = children[0];

        if (child.operator instanceof NotOperator) {
            return child.children;
        }

        return children;
    }
}

class PlainOperator extends Operator {
    constructor() {
        super("PLAIN");
    }

    print(dialect, fields, children, level) {
        return children[0].print(dialect, fields, level + 1);
    }
};

const operators = {
    "bool": BooleanOperator,
    "null": NullOperator,
    "blank": BlankOperator,
    "field": FieldOperator,
    "and": AndOperator,
    "string": StringOperator,
    "number": NumberOperator,
    "or": OrOperator,
    "not": NotOperator,
    "<": LessThanOperator,
    ">": GreaterThanOperator,
    "=": EqualsOperator,
    "!=": NotEqualsOperator,
    "is-empty": IsEmptyOperator,
    "not-empty": NotEmptyOperator,
    "in": InOperator,
    "plain": PlainOperator
};

const isOperator = name => (name in operators);

const isTrueOperator = operator => ((operator instanceof BooleanOperator) && operator.value);
const isFalseOperator = operator => ((operator instanceof BooleanOperator) && !operator.value);
const isOperatorPrintable = operator => !(operator instanceof BlankOperator) &&
                                        !isTrueOperator(operator);

const isValidWhereClause = operator =>
    !((operator instanceof NullOperator) ||
      (operator instanceof FieldOperator) ||
      (operator instanceof StringOperator) ||
      (operator instanceof NumberOperator));

const isComparable = (leftOperator, rightOperator) =>
    ((leftOperator instanceof NumberOperator) && (rightOperator instanceof NumberOperator)) ||
    ((leftOperator instanceof StringOperator) && (rightOperator instanceof StringOperator));

const getOperator = value => {
    if (isOperator(value))
        return new operators[value]();

    switch (typeof value) {
        case "boolean":
            return new operators["bool"](value);
        case "string":
            return new operators["string"](value);
        case "number":
            return new operators["number"](value);
        case "object":
            return new operators["null"]();
        default:
            throw new Error(`Unsupported arg type: ${typeof value}`);
    }
}

export { isOperator, getOperator, isOperatorPrintable };
