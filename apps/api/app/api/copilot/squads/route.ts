import { NextResponse } from 'next/server';
import { getAreaSquads, getDownloadedSquadNames } from '../../../../src/services/life-copilot';

export async function GET() {
  return NextResponse.json({
    areaSquads: getAreaSquads(),
    downloadedSquads: getDownloadedSquadNames()
  });
}
