import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: "No code provided" },
        { status: 400 }
      );
    }

    try {
      const result = await executePythonCode(code);
      return NextResponse.json(
        { output: result },
        { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      return NextResponse.json(
        { error: `Execution error: ${errorMessage}` },
        { status: 400 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function executePythonCode(code: string): Promise<string> {
  const context = {
    print: console.log,
  };

  try {
    let output = '';
    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    const result = new Function('context', `
      with (context) {
        ${code}
      }
    `)(context);

    console.log = originalLog;

    return output || String(result);
  } catch (err) {
    // Properly type the error and extract message
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(errorMessage);
  }
}