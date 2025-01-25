import type postgres from 'postgres';
import { spreads } from './spreads.json';

export async function seedSpreads(client: postgres.Sql<{}>) {
    const now = new Date();
    const spreadRecords = spreads.map(spreadData => ({
        ...spreadData,
        created_at: now,
        updated_at: now,
    }));

    await client`
        INSERT INTO "spread" ${client(spreadRecords)}
    `;
}
