import { SchemaField } from './schemaParser';

export function generateRandomData(fields: SchemaField[]): Record<string, any> {
    const data: Record<string, any> = {};

    for (const field of fields) {
        data[field.name] = generateValueForField(field);
    }

    return data;
}

function generateValueForField(field: SchemaField): any {
    const type = field.type;

    // Handle uint variants (uint8 - uint256)
    if (type.startsWith('uint')) {
        if (field.name.toLowerCase().includes('timestamp')) {
            return BigInt(Date.now());
        }
        // Generate random BigInt
        const bits = parseInt(type.replace('uint', '') || '256');
        const max = BigInt(2) ** BigInt(bits) - BigInt(1);
        // Random 64-bit equivalent for simplicity in display, but cast to BigInt
        return BigInt(Math.floor(Math.random() * 1000000));
    }

    // Handle int variants (int8 - int256)
    if (type.startsWith('int')) {
        const bits = parseInt(type.replace('int', '') || '256');
        // Random range
        return BigInt(Math.floor(Math.random() * 2000000) - 1000000);
    }

    // Handle bytes variants (bytes1 - bytes32, bytes)
    if (type.startsWith('bytes')) {
        const sizeStr = type.replace('bytes', '');
        const size = sizeStr ? parseInt(sizeStr) : 32; // Default dynamic bytes to 32 random bytes
        return `0x${Array.from({ length: size * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    }

    switch (type) {
        case 'string':
            if (field.name.toLowerCase().includes('name')) {
                const names = ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi'];
                return names[Math.floor(Math.random() * names.length)];
            }
            if (field.name.toLowerCase().includes('pair')) {
                const pairs = ['ETH/USD', 'BTC/USD', 'SOL/USD', 'LINK/USD', 'UNI/USD'];
                return pairs[Math.floor(Math.random() * pairs.length)];
            }
            return Math.random().toString(36).substring(7);

        case 'bool':
            return Math.random() > 0.5;

        case 'address':
            return `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        default:
            // Fallback for unknown types (shouldn't happen with regex validation)
            return '0';
    }
}
