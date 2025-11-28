export type SchemaType = string;

export interface SchemaField {
    name: string;
    type: SchemaType;
}

export const SUPPORTED_TYPES: string[] = [
    'string', 'bool', 'address', 'bytes32', 'bytes',
    'uint8', 'uint16', 'uint32', 'uint64', 'uint128', 'uint256',
    'int8', 'int16', 'int32', 'int64', 'int128', 'int256'
];

export function parseSchemaString(schemaString: string): SchemaField[] {
    if (!schemaString) return [];

    // Example schema string: "uint64 timestamp, string name, int32 score"
    // Split by comma
    const parts = schemaString.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const fields: SchemaField[] = [];

    for (const part of parts) {
        // Split by space: "uint64 timestamp" -> ["uint64", "timestamp"]
        const [type, name] = part.split(/\s+/);

        // Allow standard solidity types
        const typeRegex = /^(u?int\d+|bool|string|address|bytes\d*)$/;

        if (type && name && typeRegex.test(type)) {
            fields.push({
                type: type,
                name: name,
            });
        }
    }

    return fields;
}

export function generateSchemaString(fields: SchemaField[]): string {
    return fields.map(f => `${f.type} ${f.name}`).join(', ');
}
