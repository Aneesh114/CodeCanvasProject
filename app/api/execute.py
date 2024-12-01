# /api/execute.py

import subprocess
import os
import tempfile
from datetime import datetime
import traceback
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs

def generate_temp_filename():
    """Generate a unique filename with timestamp"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'python_script_{timestamp}.py'
    return os.path.join(tempfile.gettempdir(), filename)

def cleanup_file(filepath):
    """Clean up temporary file"""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception:
        pass

def handler(request):
    if request.method == 'POST':
        try:
            # Parse JSON body
            content_length = int(request.headers.get('Content-Length', 0))
            body = request.rfile.read(content_length).decode('utf-8')
            data = json.loads(body)
            
            if not data or 'code' not in data:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': 'No code provided'})
                }

            code = data['code']
            filename = generate_temp_filename()
            
            try:
                # Write code to temp file
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(code)

                # Execute Python code
                result = subprocess.run(
                    ['python', filename],
                    capture_output=True,
                    text=True,
                    timeout=10
                )

                if result.returncode == 0:
                    return {
                        'statusCode': 200,
                        'body': json.dumps({'output': result.stdout})
                    }
                else:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({'error': result.stderr})
                    }

            finally:
                cleanup_file(filename)

        except subprocess.TimeoutExpired:
            return {
                'statusCode': 408,
                'body': json.dumps({'error': 'Execution timed out (10 seconds limit)'})
            }
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': str(e),
                    'traceback': traceback.format_exc()
                })
            }
    
    return {
        'statusCode': 405,
        'body': json.dumps({'error': 'Method not allowed'})
    }

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        result = handler(self)
        self.send_response(result['statusCode'])
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(result['body'].encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()