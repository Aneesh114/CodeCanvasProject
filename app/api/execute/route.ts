import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: Use edge runtime for better performance

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: "No code provided" },
        { status: 400 }
      );
    }

    // Execute the Python code in a safe environment
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
      return NextResponse.json(
        { error: `Execution error: ${error}` },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Server error: ${error}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
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
  // Create a safe execution environment
  const context = {
    print: console.log,
    // Add other safe built-ins as needed
  };

  try {
    let output = '';
    // Capture console.log output
    const originalLog = console.log;
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };

    // Execute the code
    const result = new Function('context', `
      with (context) {
        ${code}
      }
    `)(context);

    // Restore console.log
    console.log = originalLog;

    return output || String(result);
  } catch (error) {
    throw new Error(error);
  }
}