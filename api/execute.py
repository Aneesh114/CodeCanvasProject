from http.server import BaseHTTPRequestHandler
import json
import sys
import traceback
from io import StringIO
import contextlib

@contextlib.contextmanager
def capture_output():
    """Capture stdout and stderr"""
    stdout, stderr = StringIO(), StringIO()
    old_out, old_err = sys.stdout, sys.stderr
    try:
        sys.stdout, sys.stderr = stdout, stderr
        yield stdout, stderr
    finally:
        sys.stdout, sys.stderr = old_out, old_err

def run_code(code):
    """Execute Python code and return output"""
    try:
        with capture_output() as (out, err):
            exec(code)
        output = out.getvalue()
        error = err.getvalue()
        return output if output else error
    except Exception as e:
        return f"Error: {str(e)}\n{traceback.format_exc()}"

def handle_request(request):
    """Handle the incoming request"""
    try:
        # Get request body
        content_length = int(request.headers.get('Content-Length', 0))
        body = request.rfile.read(content_length).decode('utf-8')
        data = json.loads(body)
        
        if not data or 'code' not in data:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No code provided'})
            }

        # Run the code
        output = run_code(data['code'])
        
        return {
            'statusCode': 200,
            'body': json.dumps({'output': output})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'traceback': traceback.format_exc()
            })
        }

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        result = handle_request(self)
        self.send_response(result['statusCode'])
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(result['body'].encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()