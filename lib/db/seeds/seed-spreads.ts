import type postgres from 'postgres';
import spreadsData from './spreads.json';

export async function seedSpreads(client: postgres.Sql<{}>) {
    const now = new Date();
    const spreadRecords = spreadsData.spreads.map(spreadData => ({
        ...spreadData,
        created_at: now,
        updated_at: now,
    }));

    await client`
        INSERT INTO "spread" ${client(spreadRecords)}
    `;
}
