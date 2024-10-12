import { isOperatorPrintable, getOperator } from "./operators.js";

class Node {
    constructor(operator, parent) {
        this.operator = operator;
        this.parent = parent;
        this.children = [];
    }

    // Add a child node to the current node's children.
    addChild(child) {
        this.children.push(child);
    }

    // Check if processing should stop for this child based on the operator.
    stopProcessingChildren(child) {
        return this.operator.stopProcessingChildren(child);
    }

    // Recursively optimize the tree, updating operators and unnesting children.
    optimizeInternal() {
        var newChildren = [];

        // Recursively optimize children nodes.
        for (const child of this.children) {
            child.optimize();
            newChildren.push(child);

            // Short-circuit processing if needed.
            if (this.stopProcessingChildren(child)) {
                break;
            }
        }

        // Update the operator and un-nest children if needed.
        const newOperator = this.operator.getNewOperator(newChildren);
        newChildren = this.operator.unNestChildren(newChildren);

        return { newOperator, newChildren };
    }

    // Optimize the current node by updating operator and children.
    optimize() {
        const { newOperator, newChildren } = this.optimizeInternal();
        this.operator = newOperator;
        this.children = newChildren;

        this.prune(); // Prune unnecessary children.
    }

    // Print the SQL representation of the node and its children.
    print(dialect, fields, level) {
        return this.operator.print(dialect, fields, this.children, level);
    }

    // Remove unnecessary children based on the operator's prune logic.
    prune() {
        const newChildren = [];

        for (const child of this.children) {
            if (this.operator.shouldPrune(child)) continue;
            newChildren.push(child);
        }

        this.children = newChildren;
    }
}

// Create a node with a given operator type and parent node.
const buildNode = (operatorType, parent) => {
    const operator = getOperator(operatorType);
    return new Node(operator, parent);
}

// Recursively build the tree structure from the input arguments.
const buildTree = (parent, args) => {
    var node = buildNode(args, parent);

    if (Array.isArray(args)) {
        node = buildNode(args[0], parent);
        var newArgs = args.slice(1);

        // Recursively create child nodes and validate them.
        for (var arg of newArgs) {
            const child = buildTree(node, arg);

            if (!node.operator.isValidChild(child)) {
                throw new Error(`Unsupported child ${child.operator} for operator ${node.operator}.`);
            }

            node.addChild(child);
        }
    } else {
        node = buildNode(args, parent);
    }

    return node;
};

// Optimize the entire tree starting from the root node.
const optimizeTree = node => node.optimize();

// Print the SQL query from the optimized tree.
const printTree = (node, dialect, fields, level = 0) => {
    if (!isOperatorPrintable(node.operator)) {
        return ""; // Skip if the operator can't be printed.
    }

    return ` WHERE ${node.print(dialect, fields, level + 1)}`;
}

export { buildTree, optimizeTree, printTree };