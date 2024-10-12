class MacroUtil {
    constructor(macros) {
        // Expand and resolve all macros during initialization.
        this.resolvedMacros = this.expandMacros(macros);
    }

    // Expands all macros and resolves dependencies.
    expandMacros(macros) {
        const resolvedMacros = {};

        // Loop through each macro and expand it.
        for (const macroID of Object.keys(macros)) {
            if (macroID in resolvedMacros)
                continue; // Skip if already resolved.

            const expandedMacro = this.traverse(macroID, macros, resolvedMacros);
            resolvedMacros[macroID] = expandedMacro;
        }

        return resolvedMacros;
    }

    // Recursively expand macros, checking for circular dependencies.
    traverse(macroID, macros, resolvedMacros, visited = new Set()) {
        if (resolvedMacros[macroID]) {
            return resolvedMacros[macroID]; // Return if already resolved.
        }

        // Check for circular dependencies.
        if (visited.has(macroID)) {
            throw new Error(`Circular macro dependency detected for macro ${macroID}`);
        }
        visited.add(macroID); // Mark as visited.

        // Expand the macro definition.
        const macroDefinition = macros[macroID];
        const expandedMacro = macroDefinition.map(part => {
            if (Array.isArray(part) && part[0] === 'macro') {
                const nestedMacroID = part[1];
                if (!macros.hasOwnProperty(nestedMacroID)) {
                    throw new Error(`Macro with ID: ${nestedMacroID} not found.`);
                }

                return this.traverse(nestedMacroID, macros, resolvedMacros, visited); // Recursively expand.
            }

            // Return non-macro parts directly.
            return part;
        });

        visited.delete(macroID); // Remove from visited set after expansion.

        // Cache the expanded macro.
        resolvedMacros[macroID] = expandedMacro;
        return expandedMacro;
    }

    // Replace macros in the arguments with their resolved values.
    replaceMacros(args) {
        if (Array.isArray(args)) {
            const operator = args[0];
            const newArgs = args.slice(1);

            // If it's a macro, replace it with the resolved macro.
            if (operator === 'macro') {
                const macroID = newArgs[0];
                if (this.resolvedMacros.hasOwnProperty(macroID)) {
                    return this.resolvedMacros[macroID];
                }
                throw new Error(`Macro ${macroID} not available.`);
            } else {
                // Recursively replace macros in arguments.
                let processedArgs = newArgs.map(arg => this.replaceMacros(arg));
                return [operator, ...processedArgs];
            }
        } else {
            // Return non-macro values unaltered.
            return args;
        }
    }
}

export default MacroUtil;
