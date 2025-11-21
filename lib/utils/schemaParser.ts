export type SchemaType = 'string' | 'uint64' | 'int32' | 'bool' | 'address' | 'bytes32';

export interface SchemaField {
    name: string;
    type: SchemaType;
}

export const SUPPORTED_TYPES: SchemaType[] = ['string', 'uint64', 'int32', 'bool', 'address', 'bytes32'];

export function parseSchemaString(schemaString: string): SchemaField[] {
    if (!schemaString) return [];

    // Example schema string: "uint64 timestamp, string name, int32 score"
    // Split by comma
    const parts = schemaString.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const fields: SchemaField[] = [];

    for (const part of parts) {
        // Split by space: "uint64 timestamp" -> ["uint64", "timestamp"]
        const [type, name] = part.split(/\s+/);

        if (type && name && SUPPORTED_TYPES.includes(type as SchemaType)) {
            fields.push({
                type: type as SchemaType,
                name: name,
            });
        }
    }

    return fields;
}

export function generateSchemaString(fields: SchemaField[]): string {
    return fields.map(f => `${f.type} ${f.name}`).join(', ');
}
