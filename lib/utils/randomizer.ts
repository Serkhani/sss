import { SchemaField } from './schemaParser';

export function generateRandomData(fields: SchemaField[]): Record<string, any> {
    const data: Record<string, any> = {};

    for (const field of fields) {
        data[field.name] = generateValueForField(field);
    }

    return data;
}

function generateValueForField(field: SchemaField): any {
    switch (field.type) {
        case 'uint64':
            if (field.name.toLowerCase().includes('timestamp')) {
                return BigInt(Date.now());
            }
            return BigInt(Math.floor(Math.random() * 1000000));

        case 'int32':
            return Math.floor(Math.random() * 2000000) - 1000000; // -1M to 1M

        case 'string':
            if (field.name.toLowerCase().includes('name')) {
                const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi'];
                return names[Math.floor(Math.random() * names.length)];
            }
            return Math.random().toString(36).substring(7);

        case 'bool':
            return Math.random() > 0.5;

        case 'address':
            // Generate a random Ethereum address
            return `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        case 'bytes32':
            return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        default:
            return null;
    }
}
