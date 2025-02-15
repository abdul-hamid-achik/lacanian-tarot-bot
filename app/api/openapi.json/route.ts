import { NextResponse } from 'next/server';
import { generateOpenAPIDocument } from '@/lib/openapi';

export async function GET() {
  const openApiDoc = generateOpenAPIDocument();
  return NextResponse.json(openApiDoc);
} 