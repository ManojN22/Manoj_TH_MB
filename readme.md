# SQL Query Generator

A dynamic SQL query generator for MySQL, PostgreSQL, and SQL Server. Includes tests for various SQL operations, optimizations, and macros.

## Requirements

- **Node.js**: v22.9.0 or higher
- **npm**: v10.8.3 or higher

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run tests:
   ```bash
   npm test
   ```

## Test Cases

- **11 original test cases** covering basic SQL query generation.
- Additional test cases for special scenarios:
  - only using brackets where its required
  - Constant value optimizations
  - Complex query optimizations
- You can add more test cases in main.test.js


## Implementation

### 1. `generateSql`
- **Entry Point**: The entry point is `index.js`, which exports the `generateSql` function.
- **Initialization**: The function initializes the appropriate SQL dialect based on the input.
- **Macro Resolution**: It resolves macro dependencies, replacing all macros with their corresponding operators.
- **Build Expression Tree**: The `buildTree` function is used to generate an expression tree based on the input conditions.
- **Tree Optimization**: The expression tree is optimized using the `optimizeTree` function.
- **Generate WHERE Clause**: The `printTree` function generates the SQL `WHERE` clause from the optimized tree, ensuring proper syntax and quoting according to the dialect.
- **Build Final Query**: The dialect class's `buildQuery` method is used to construct the final SQL query, incorporating all necessary clauses like `WHERE`, `LIMIT`, etc.

### 2. Dialects
- **Base Class**: All SQL dialects (e.g., MySQL, PostgreSQL, SQL Server) extend the base `Dialect` class.
- **Dialect Methods**:
  - `quoteField`: Handles quoting of identifiers like field names.
  - `quoteString`: Handles quoting of literal values (e.g., strings).
  - `buildQuery`: Builds the full SQL query with all clauses (e.g., SELECT, WHERE, LIMIT).
  - `getLimitClause`: Manages the generation of the `LIMIT` clause for different dialects.
  - `printBool`: Manages the handling of boolean values (`TRUE`, `FALSE`) based on the dialect.
- **Dialect Mapping**: A mapping of available dialects is used to initialize the correct dialect class for query generation.

Here’s the updated version of the **Operators** section based on your latest work:

### 3. Operators
- **Base Class**: All operators (e.g., `AND`, `OR`, `=`, `>`) extend from the base `Operator` class.
- **Operator Methods**:
  - `print`: Generates the SQL representation of the `WHERE` clause for the operator.
  - `isValidChild`: Checks if an operator can be used as a valid child node for the current operator.
  - **Optimization Methods**:
    - `getNewOperator`: Determines if the current operator should change to a new operator based on its children (e.g., `NOT TRUE` becomes `FALSE`).
    - `unNestChildren`: Un-nests child nodes when necessary (e.g., flattening nested `AND` or `OR` operations).
    - `prune`: Removes unnecessary or redundant child nodes (e.g., `AND TRUE`).
    - `stopProcessingChildren`: Short-circuits further processing of child nodes if a condition is met (e.g., `AND` stops at `FALSE`, `OR` stops at `TRUE`).

### 4. Expression Tree
- The tree structure is used to build, evaluate, and print the SQL query.
  - `buildTree`: Constructs the expression tree using the operators and the input conditions.
  - `evalTree`: Optimizes the tree by evaluating conditions and pruning unnecessary parts.
  - `printTree`: Generates the final SQL `WHERE` clause from the expression tree using the appropriate operators and dialect-specific rules.

### 5. Macro
- The macro system allows for reusable SQL conditions.
  - **`expandMacros`**: Resolves and replaces macro references with actual SQL conditions.
  - **`replaceMacros`**: Substitutes macro placeholders in the query with the resolved macro definitions.

## Extending new Filter or Literal

1. **Define a New Operator**: 
   - Create a class that extends the base `Operator` class to represent the new filter.
   - Implement methods like `print`, `isValidChild`, and optimization functions (e.g., `eval`, `prune`).

2. **Add to operators**: 
   - Add the new operator to the `operators` object to register it for query generation.

3. **Update `isValidWhereClause`**: 
   - Ensure the new operator is valid in `isValidWhereClause` to be recognized as a valid part of the `WHERE` clause.

4. **Update `getOperator`**: 
   - Modify `getOperator` to include the new operator for retrieval during query building.

## Extending a New Dialect

1. **Define a New Dialect**:  
   - Create a class that extends the base `Dialect` class to represent the new SQL dialect.  
   - Implement methods like `quoteField`, `quoteString`, `buildQuery`, `getLimitClause`, and `printBool` to handle dialect-specific behavior.

2. **Add to Dialects**:  
   - Register the new dialect by adding it to the `dialects` object, making it available for query generation.
   
## Optimization Techniques in SQL Query Generator
#### 1. Pruning Nested Conditions (`AND`, `OR`, `NOT`)
Pruning nested conditions where operators like `AND`, `OR`, and `NOT` are unnecessarily nested within themselves.

**Example:**
Before optimization:
`AND (AND x, y), z`
After optimization:
`AND x, y, z`

The same principle applies to `OR` and `NOT`:
- Nested `OR` operators like `OR (OR x, y), z` are flattened to `OR x, y, z`.
- Nested `NOT` operators like `NOT (NOT x)` are simplified to just `x`.

#### 2. Computing Constant Values (e.g., `1 = 1`)
Computing constant values within the query, where conditions that always evaluate to true or false are resolved.

**Example:**
Before optimization:
`1 = 1 AND age > 30`
After optimization:
`age > 30`

#### 3. Pruning `AND` and `OR` Clauses with `TRUE` or `FALSE`

When the query contains an `AND` or `OR` clause with a `TRUE` or `FALSE` value, the generator can simplify these clauses based on logical principles:
- For an `AND` clause, if any condition is `FALSE`, the whole clause becomes `FALSE`.
- For an `OR` clause, if any condition is `TRUE`, the whole clause becomes `TRUE`.

**Example 1: `AND` Clause with `FALSE`**
Before optimization:
`age > 30 AND 1 = 0`
After optimization:
`1 = 0 or FALSE`

**Example 2: `OR` Clause with `TRUE`**
Before optimization:
`age < 18 OR 1 = 1`
After optimization:
`""` - it will have true and true in this case is no where clause.

### Note
1. **Input Validation Assumption**: 
   - I assume the input has already been validated before reaching the `generateSql` function.
   - If I were to implement validation, it would be done while building the expression tree (`buildTree` function), ensuring that the structure of the query is correct as the tree is constructed.
