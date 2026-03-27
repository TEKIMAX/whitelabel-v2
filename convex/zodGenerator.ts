import { z } from "zod";

/**
 * Parses a JSON schema string and generates a strict Zod object
 * compatible with the Vercel AI SDK tools definitions.
 */
export function generateZodSchemaFromString(schemaStr: string | undefined): z.ZodObject<any> {
    if (!schemaStr || !schemaStr.trim()) {
        // Fallback to a single generic query parameter
        return z.object({ 
            query: z.string().describe("Query string or JSON payload to send to the API") 
        });
    }

    try {
        const parsed = JSON.parse(schemaStr);
        return compileToZod(parsed);
    } catch (e) {
        // Fallback on parse failure
        return z.object({ 
            query: z.string().describe("Query string or JSON payload to send to the API") 
        });
    }
}

function compileToZod(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        return z.any();
    }
    
    if (Array.isArray(obj)) {
        if (obj.length > 0) {
            return z.array(compileToZod(obj[0]));
        }
        return z.array(z.any());
    }

    const shape: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            if (value === '<string>') shape[key] = z.string();
            else if (value === '<number>') shape[key] = z.number();
            else if (value === '<boolean>') shape[key] = z.boolean();
            else shape[key] = z.string().describe(`Expected value format: ${value}`);
        } else if (typeof value === 'number') {
            shape[key] = z.number();
        } else if (typeof value === 'boolean') {
            shape[key] = z.boolean();
        } else if (typeof value === 'object') {
            shape[key] = compileToZod(value);
        } else {
            shape[key] = z.any();
        }
    }
    return z.object(shape);
}
