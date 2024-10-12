import generateSql from './index.js';

const testCases = [
    {
        name: 'P1: Invalid dialect',
        dialect: 'postgress',
        fields: { 1: 'id', 2: 'name' },
        query: { where: ['=', ['field', 2], 'cam'] },
        expectedError: 'Unsupported dialect',
        shouldThrow: true
    },
    {
        name: 'A1: Simple equality in Postgres',
        dialect: 'postgres',
        fields: { 1: 'id', 2: 'name' },
        query: { where: ['=', ['field', 2], 'cam'] },
        expectedResult: 'SELECT * FROM data WHERE "name" = \'cam\';'
    },
    {
        name: 'A2: IS NULL condition in Postgres',
        dialect: 'postgres',
        fields: { 1: 'id', 3: 'date_joined' },
        query: { where: ['=', ['field', 3], null] },
        expectedResult: 'SELECT * FROM data WHERE "date_joined" IS NULL;'
    },
    {
        name: 'A3: Greater than condition in Postgres',
        dialect: 'postgres',
        fields: { 4: 'age' },
        query: { where: ['>', ['field', 4], 35] },
        expectedResult: 'SELECT * FROM data WHERE "age" > 35;'
    },
    {
        name: 'A4: AND condition in Postgres',
        dialect: 'postgres',
        fields: { 1: 'id', 2: 'name' },
        query: { where: ['and', ['<', ['field', 1], 5], ['=', ['field', 2], 'joe']] },
        expectedResult: 'SELECT * FROM data WHERE "id" < 5 AND "name" = \'joe\';'
    },
    {
        name: 'A5: OR condition in MySQL',
        dialect: 'mysql',
        fields: { 1: 'id', 3: 'date_joined' },
        query: { where: ['or', ['!=', ['field', 3], '2015-11-01'], ['=', ['field', 1], 456]] },
        expectedResult: 'SELECT * FROM data WHERE `date_joined` <> \'2015-11-01\' OR `id` = 456;'
    },
    {
        name: 'A6: Nested AND and OR in Postgres',
        dialect: 'postgres',
        fields: { 2: 'name', 3: 'date_joined', 4: 'age' },
        query: { where: ['and', ['!=', ['field', 3], null], ['or', ['>', ['field', 4], 25], ['=', ['field', 2], 'Jerry']]] },
        expectedResult: 'SELECT * FROM data WHERE "date_joined" IS NOT NULL AND ("age" > 25 OR "name" = \'Jerry\');'
    },
    {
        name: 'A7: IN condition in Postgres',
        dialect: 'postgres',
        fields: { 4: 'age' },
        query: { where: ['=', ['field', 4], 25, 26, 27] },
        expectedResult: 'SELECT * FROM data WHERE "age" IN (25, 26, 27);'
    },
    {
        name: 'A8: Simple equality in MySQL with LIMIT',
        dialect: 'mysql',
        fields: { 2: 'name' },
        query: { where: ['=', ['field', 2], 'cam'], limit: 10 },
        expectedResult: 'SELECT * FROM data WHERE `name` = \'cam\' LIMIT 10;'
    },
    {
        name: 'A9: LIMIT in Postgres',
        dialect: 'postgres',
        fields: {},
        query: { limit: 20 },
        expectedResult: 'SELECT * FROM data LIMIT 20;'
    },
    {
        name: 'A10: TOP condition in SQL Server',
        dialect: 'sqlserver',
        fields: {},
        query: { limit: 20 },
        expectedResult: 'SELECT TOP 20 * FROM data;'
    },
    {
        name: 'A11: Macros with MySQL with LIMIT',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['macro', 'is_adult_joe'],
            limit: 10,
            macros: {
                is_joe: ['=', ['field', 2], 'joe'],
                is_adult: ['>', ['field', 4], 18],
                is_adult_joe: ['and', ['macro', 'is_joe'], ['macro', 'is_adult']]
            }
        },
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\' AND `age` > 18 LIMIT 10;'
    },
    {
        name: 'A12: Query with optimization of constant value',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['and', ['and', ['=', 1, 1], ['>', ['field', 4], 18]], ['=', ['field', 3], '6314315073']],
            limit: 10
        },
        // without optimization: SELECT * FROM data WHERE ( 1 = 1 AND `age` > 18 ) AND `phoneno` = '6314315073' LIMIT 10;
        expectedResult: 'SELECT * FROM data WHERE `age` > 18 AND `phoneno` = \'6314315073\' LIMIT 10;'
    },
    {
        name: 'A13: Query with optimization of isEmpty of nil',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['is-empty', null],
            limit: 10
        },
        // without optimization: SELECT * FROM data WHERE NULL IS NULL LIMIT 10;
        expectedResult: 'SELECT * FROM data LIMIT 10;'
    },
    {
        name: 'A14: Query with optimization with flattening nest and consecutive "and" clause',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['and', ['and', ['=', ['field', 2], 'joe'], ['>', ['field', 4], 18]], ['=', ['field', 3], '6314315073']],
            limit: 10
        },
        // without optimization: SELECT * FROM data WHERE ( `name` = 'joe' AND `age` > 18 ) AND `phoneno` = '6314315073' LIMIT 10;
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\' AND `age` > 18 AND `phoneno` = \'6314315073\' LIMIT 10;'
    },
    {
        name: 'A15: Query with optimization with flattening nest and consecutive "or" clause',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['or', ['or', ['=', ['field', 2], 'joe'], ['>', ['field', 4], 18]], ['and', ['=', ['field', 3], '6314315073'], ['=', ['field', 1], 1]]],
            limit: 10
        },
        // without optimization: SELECT * FROM data WHERE ( `name` = 'joe' OR `age` > 18 ) OR ( `phoneno` = '6314315073' AND `id` = 1 ) LIMIT 10;
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\' OR `age` > 18 OR (`phoneno` = \'6314315073\' AND `id` = 1) LIMIT 10;'
    },
    {
        name: 'A16: Query with optimization with flattening nest and consecutive "NOT" clause',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['not', ['not', ['=', ['field', 2], 'joe']]],
            limit: 10
        },
        // without optimization: SELECT * FROM data WHERE NOT (NOT `name` = 'joe' ) LIMIT 10;
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\' LIMIT 10;'
    },
    {
        name: 'A17: Query with optimization with flattening nest and consecutive "NOT" clause (double)',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['not', ['not', ['not', ['=', ['field', 2], 'joe']]]],
            limit: 10
        },
        // without optimization: SELECT * FROM data WHERE NOT (NOT (NOT `name` = 'joe' )) LIMIT 10;
        expectedResult: 'SELECT * FROM data WHERE NOT `name` = \'joe\' LIMIT 10;'
    },
    {
        name: 'A18: Query with optimization with "and" clause with true value',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['and', ['is-empty', null], ['=', ['field', 2], 'joe']],
        },
        // without optimization: SELECT * FROM data WHERE NULL IS NULL AND `name` = 'joe';
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\';'
    },
    {
        name: 'A19: Query with optimization with "and" clause with one where condition as args',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['and', ['=', ['field', 2], 'joe']],
        },
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\';'
    },
    {
        name: 'A20: Query with optimization with "and" clause with true value',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['and', ['is-empty', null], ['=', ['field', 2], 'joe']],
        },
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\';'
    },
    {
        name: 'A20: Query with optimization with "and" clause with true value',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['and', ['is-empty', null], ['=', ['field', 2], 'joe']],
        },
        // without optimization: SELECT * FROM data WHERE NULL IS NULL AND `name` = 'joe';
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\';'
    },
    {
        name: 'A21: Query with optimization with "and" clause with true value and more than one "where" clause',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['and', ['is-empty', null], ['=', ['field', 2], 'joe'], ['>', ['field', 4], 18]],
        },
        // without optimization: SELECT * FROM data WHERE NULL IS NULL AND `name` = 'joe' AND `age` > 18;
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\' AND `age` > 18;'
    },
    {
        name: 'A22: Query with optimization with "and" clause with false value',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['and', ["=", 2, 3], ['=', ['field', 2], 'joe']],
        },
        // without optimization: SELECT * FROM data WHERE NULL IS NULL AND `name` = 'joe';
        expectedResult: 'SELECT * FROM data WHERE FALSE;'
    },
    {
        name: 'A23: Query with optimization with "or" clause with true value',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['or', ["=", 2, 2], ['=', ['field', 2], 'joe']],
        },
        // without optimization: SELECT * FROM data WHERE 2 = 2 OR `name` = 'joe';
        expectedResult: 'SELECT * FROM data;'
    },
    {
        name: 'A24: Query with optimization with "or" clause with false value',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['or', ["=", 2, 3], ['=', ['field', 2], 'joe']],
        },
        // without optimization: SELECT * FROM data WHERE 2 = 3 OR `name` = 'joe';
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\';'
    },
    {
        name: 'A25: Query with optimization with "or" clause with false value and more than one "where" clause ',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['or', ["=", 2, 3], ['=', ['field', 2], 'joe'], ['>', ['field', 4], 18]],
        },
        // without optimization: SELECT * FROM data WHERE 2 = 3 OR `name` = 'joe' OR `age` > 18;
        expectedResult: 'SELECT * FROM data WHERE `name` = \'joe\' OR `age` > 18;' 
    },
    {
        name: 'A26: Query with optimization with "or" clause with true value and more than one "where" clause ',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['or', ["=", 2, 2], ['=', ['field', 2], 'joe'], ['>', ['field', 4], 18]],
        },
        // without optimization: SELECT * FROM data WHERE 2 = 2 OR name = 'joe' OR age > 18 ;
        expectedResult: 'SELECT * FROM data;'
    },
    {
        name: 'A27: Query with optimization with "and" clause with false value and more than one "where" clause ',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['and', ["=", 2, 3], ['=', ['field', 2], 'joe'], ['>', ['field', 4], 18]],
        },
        // without optimization: SELECT * FROM data WHERE 2 = 3 AND name = 'joe' AND age > 18 ;
        expectedResult: 'SELECT * FROM data WHERE FALSE;'   
    },
    {
        name: 'A28: Query with optimization with "not" clause with true',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['not', ['=', 1, 1]],
        },
        // without optimization: SELECT * FROM data WHERE NOT 1 = 1;
        expectedResult: 'SELECT * FROM data WHERE FALSE;'
    },
    {
        name: 'A29: Query with optimization with "not" clause with false',
        dialect: 'mysql',
        fields: { 1: 'id', 2: 'name', 3: 'phoneno', 4: 'age' },
        query: {
            where: ['not', ['=', 0, 1]],
        },
        // without optimization: SELECT * FROM data WHERE NOT 0 = 1;
        expectedResult: 'SELECT * FROM data;'
    },
    {
        name: 'A30: Query with NULL IS NOT NULL',
        dialect: 'mysql',
        query: {
            where: ['not-empty', null],
        },
        // without optimization: SELECT * FROM data WHERE NULL IS NOT NULL;
        expectedResult: 'SELECT * FROM data WHERE FALSE;'
    }
];

test.each(testCases)(
    '$name',
    ({ dialect, fields, query, expectedResult, expectedError, shouldThrow }) => {
    if (shouldThrow) {
        expect(() => generateSql(dialect, fields, query)).toThrow(expectedError);
    } else {
        expect(generateSql(dialect, fields, query)).toBe(expectedResult);
    }
});
