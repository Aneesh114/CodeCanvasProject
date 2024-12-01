from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import tempfile
import json
import sys
from datetime import datetime
import traceback
import stat

app = Flask(__name__)
CORS(app)

def ensure_temp_directory():
    """Create and ensure proper permissions for temp directory"""
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
    try:
        if not os.path.exists(temp_dir):
            print(f"Creating temp directory at: {temp_dir}")
            os.makedirs(temp_dir)
        os.chmod(temp_dir, stat.S_IRWXU | stat.S_IRWXG | stat.S_IRWXO)
        print(f"Temp directory ready: {temp_dir}")
        print(f"Permissions set: {oct(os.stat(temp_dir).st_mode)[-3:]}")
        return temp_dir
    except Exception as e:
        print(f"Error creating temp directory: {str(e)}", file=sys.stderr)
        fallback_dir = tempfile.gettempdir()
        print(f"Using fallback temp directory: {fallback_dir}")
        return fallback_dir

TEMP_DIR = ensure_temp_directory()

def generate_temp_filename():
    """Generate a unique filename with timestamp"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'python_script_{timestamp}.py'
    filepath = os.path.join(TEMP_DIR, filename)
    print(f"Generated temp file path: {filepath}")
    return filepath

def cleanup_file(filepath):
    """Clean up a specific temporary file"""
    try:
        if os.path.exists(filepath):
            print(f"Cleaning up file: {filepath}")
            os.chmod(filepath, stat.S_IRUSR | stat.S_IWUSR)
            os.remove(filepath)
            print(f"File cleaned up successfully: {filepath}")
        else:
            print(f"File not found for cleanup: {filepath}")
    except Exception as e:
        print(f"Error cleaning up {filepath}: {str(e)}", file=sys.stderr)

@app.route('/execute', methods=['POST'])
def execute_code():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.get_json()
        if not data or 'code' not in data:
            return jsonify({'error': 'No code provided'}), 400

        code = data['code']
        filename = generate_temp_filename()
        
        print(f"Executing code with length: {len(code)} characters")
        print(f"Using temp file: {filename}")
        
        try:
            # Write file with proper permissions
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Set file permissions
            os.chmod(filename, stat.S_IRWXU | stat.S_IRWXG | stat.S_IRWXO)
            print(f"File created and permissions set: {filename}")

            # Execute Python code
            print(f"Running code from: {filename}")
            result = subprocess.run(
                ['python', filename],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=TEMP_DIR
            )

            print(f"Execution completed with return code: {result.returncode}")
            if result.returncode == 0:
                return jsonify({'output': result.stdout})
            else:
                return jsonify({'error': result.stderr}), 400

        finally:
            # Clean up temp file
            cleanup_file(filename)

    except subprocess.TimeoutExpired:
        print("Execution timed out")
        return jsonify({'error': 'Execution timed out (30 seconds limit)'}), 408
    except Exception as e:
        print(f"Error during execution: {str(e)}")
        error_details = {
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        return jsonify(error_details), 500

@app.route('/')
def index():
    return jsonify({
        "status": "online",
        "message": "CodeCanvas Editor API Server",
        "endpoints": {
            "/execute": "POST - Execute Python code",
        }
    })

if __name__ == '__main__':
    print(f"Development server starting on http://18.219.202.24:5000")
    print(f"Working directory: {TEMP_DIR}")
    print(f"Temp directory exists: {os.path.exists(TEMP_DIR)}")
    print(f"Temp directory is writable: {os.access(TEMP_DIR, os.W_OK)}")
    app.run(host='127.0.0.1', port=5000, debug=True)