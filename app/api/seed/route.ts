import { NextResponse } from 'next/server';
import postgres from 'postgres';
import cardsData from '@/lib/db/seeds/cards.json';
import spreadsData from '@/lib/db/seeds/spreads.json';
import { StatusCodes } from 'http-status-codes';
import { createTarotError } from '@/lib/errors';

function generateImageUrl(card: any): string {
    if (card.arcana === 'Major') {
        const number = card.rank.padStart(2, '0');
        const name = card.name
            .replace(/\s+/g, '')
            .replace(/^The/, '');
        return `/images/${number}-${name}.png`;
    } else {
        const number = card.rank === 'Page' ? '11'
            : card.rank === 'Knight' ? '12'
                : card.rank === 'Queen' ? '13'
                    : card.rank === 'King' ? '14'
                        : card.rank.padStart(2, '0');
        return `/images/${card.suit}${number}.png`;
    }
}

export async function POST(request: Request) {
    // Check for secret token to prevent unauthorized seeding
    const authHeader = request.headers.get('authorization');
    const SEED_TOKEN = process.env.SEED_SECRET;

    if (!SEED_TOKEN || !authHeader || authHeader !== `Bearer ${SEED_TOKEN}`) {
        return NextResponse.json(
            createTarotError(StatusCodes.UNAUTHORIZED, "The mystical garden's gates remain closed to unauthorized cultivators"),
            { status: StatusCodes.UNAUTHORIZED }
        );
    }

    try {
        const sql = postgres(process.env.POSTGRES_URL!, { max: 1 });

        // Check if we need to run seeds
        const [{ count: cardsCount }] = await sql`SELECT COUNT(*)::int as count FROM "tarot_card"`;
        const [{ count: spreadsCount }] = await sql`SELECT COUNT(*)::int as count FROM "spread"`;

        let seeded = false;

        if (cardsCount === 0) {
            console.log('⏳ Planting the seeds of arcane wisdom...');
            const now = new Date().toISOString();
            const cards = cardsData.cards.map(card => ({
                name: card.name,
                arcana: card.arcana,
                suit: card.suit,
                description: card.description,
                rank: card.rank,
                symbols: card.symbols,
                image_url: generateImageUrl(card),
                created_at: now,
                updated_at: now,
            }));

            await sql`
                INSERT INTO "tarot_card" (
                    name, arcana, suit, description, rank, symbols, image_url, created_at, updated_at
                )
                SELECT * FROM json_to_recordset(${JSON.stringify(cards)})
                AS x(
                    name text, arcana text, suit text, description text, rank text,
                    symbols text, image_url text, created_at timestamptz, updated_at timestamptz
                )
            `;
            console.log('✅ The arcane wisdom has taken root');
            seeded = true;
        }

        if (spreadsCount === 0) {
            console.log('⏳ Weaving the patterns of destiny...');
            const now = new Date().toISOString();

            for (const spreadData of spreadsData.spreads) {
                const data = {
                    name: spreadData.name,
                    description: spreadData.description,
                    positions: JSON.stringify(spreadData.positions),
                    is_public: spreadData.is_public,
                    created_at: now,
                    updated_at: now,
                };

                await sql`
                    INSERT INTO "spread" (
                        name, description, positions, is_public, created_at, updated_at
                    ) VALUES (
                        ${data.name},
                        ${data.description},
                        ${data.positions},
                        ${data.is_public},
                        ${data.created_at},
                        ${data.updated_at}
                    )
                `;
            }
            console.log('✅ The sacred patterns have been woven');
            seeded = true;
        }

        await sql.end();

        if (!seeded) {
            return NextResponse.json({ message: 'The mystical garden is already in full bloom' });
        }

        return NextResponse.json({ message: 'The seeds of wisdom have been planted and nurtured to life' });
    } catch (error) {
        console.error('Failed to seed database:', error);
        return NextResponse.json(
            createTarotError(StatusCodes.INTERNAL_SERVER_ERROR, "The cosmic forces resist our attempts to plant these mystical seeds"),
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
        );
    }
}
