import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

async function executePythonCode(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';

    // Spawn Python process and pass code directly through stdin
    const pythonProcess = spawn('python', ['-c', code]);

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(errorOutput || 'Execution failed'));
      } else {
        resolve(output);
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Process error: ${error.message}`));
    });

    // Set timeout
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('Execution timeout'));
    }, 10000);

    // Clear timeout when process ends
    pythonProcess.on('close', () => clearTimeout(timeout));
  });
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