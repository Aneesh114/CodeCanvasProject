import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import { writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';

// Change runtime to nodejs
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
      // Create a temporary file name
      const fileName = `temp_${randomUUID()}.py`;
      const filePath = path.join(process.cwd(), 'temp', fileName);

      // Write the Python code to a temporary file
      await writeFile(filePath, code);

      // Execute the Python code
      const result = await new Promise<string>((resolve, reject) => {
        let output = '';
        let errorOutput = '';

        const pythonProcess = spawn('python', [filePath]);

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

        // Handle process errors
        pythonProcess.on('error', (error) => {
          reject(new Error(`Process error: ${error.message}`));
        });

        // Set timeout
        setTimeout(() => {
          pythonProcess.kill();
          reject(new Error('Execution timeout'));
        }, 10000); // 10 second timeout
      });

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