import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CONTENT_PATH = path.resolve(process.cwd(), 'Content.json');

export async function GET() {
  try {
    const data = await fs.readFile(CONTENT_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return NextResponse.json(parsed);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return NextResponse.json({ nodes: [], edges: [] });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await fs.writeFile(CONTENT_PATH, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
