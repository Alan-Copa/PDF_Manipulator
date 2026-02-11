from flask import Flask, request, render_template, send_file, redirect, url_for, session
import PyPDF2
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
    
# Load secret key from environment variable
app.secret_key = os.environ.get('SECRET_KEY', 'default_secret_key')

app.config['UPLOAD_FOLDER'] = 'database/uploads/'
app.config['MERGED_FOLDER'] = 'database/merged/'
app.config['SPLIT_FOLDER'] = 'database/split/'
app.config['COUNTER_FILE'] = 'database/merge_counter.txt'

# Ensure upload, merged, and split directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MERGED_FOLDER'], exist_ok=True)
os.makedirs(app.config['SPLIT_FOLDER'], exist_ok=True)

# Initialize or load the merge counter
def initialize_counter():
    """Initialize the counter from the file, create if it doesn't exist."""
    if not os.path.exists(app.config['COUNTER_FILE']):
        with open(app.config['COUNTER_FILE'], 'w') as f:
            f.write('0')
    with open(app.config['COUNTER_FILE'], 'r') as f:
        return int(f.read().strip())

# Update the merge counter
def update_counter():
    """Increment the counter and save it to the file, returning the new value."""
    count = initialize_counter() + 1
    with open(app.config['COUNTER_FILE'], 'w') as f:
        f.write(str(count))
    return count

def merge_pdfs(pdf_list, output_path):
    """Merge a list of PDFs into one PDF and save it to the specified path."""
    pdf_merger = PyPDF2.PdfMerger()
    
    for pdf in pdf_list:
        pdf_merger.append(pdf)
    
    with open(output_path, 'wb') as output_pdf:
        pdf_merger.write(output_pdf)

def get_pdf_page_count(pdf_path):
    """Get the number of pages in a PDF."""
    with open(pdf_path, 'rb') as f:
        pdf_reader = PyPDF2.PdfReader(f)
        return len(pdf_reader.pages)

def split_pdf_all_pages(pdf_path, output_folder, base_name):
    """Split PDF into individual pages."""
    output_files = []
    with open(pdf_path, 'rb') as f:
        pdf_reader = PyPDF2.PdfReader(f)
        total_pages = len(pdf_reader.pages)
        
        for page_num in range(total_pages):
            pdf_writer = PyPDF2.PdfWriter()
            pdf_writer.add_page(pdf_reader.pages[page_num])
            
            output_filename = f"{base_name}_page_{page_num + 1}.pdf"
            output_path = os.path.join(output_folder, output_filename)
            
            with open(output_path, 'wb') as output_file:
                pdf_writer.write(output_file)
            
            output_files.append(output_filename)
    
    return output_files

def split_pdf_custom_pages(pdf_path, output_folder, base_name, page_ranges):
    """Split PDF by custom page ranges."""
    output_files = []
    with open(pdf_path, 'rb') as f:
        pdf_reader = PyPDF2.PdfReader(f)
        total_pages = len(pdf_reader.pages)
        
        for idx, page_range in enumerate(page_ranges):
            pdf_writer = PyPDF2.PdfWriter()
            
            # Parse page range
            if '-' in page_range:
                start, end = map(int, page_range.split('-'))
                pages = range(start - 1, min(end, total_pages))
            else:
                page_num = int(page_range) - 1
                if 0 <= page_num < total_pages:
                    pages = [page_num]
                else:
                    continue
            
            for page_num in pages:
                if 0 <= page_num < total_pages:
                    pdf_writer.add_page(pdf_reader.pages[page_num])
            
            if len(pdf_writer.pages) > 0:
                output_filename = f"{base_name}_part_{idx + 1}.pdf"
                output_path = os.path.join(output_folder, output_filename)
                
                with open(output_path, 'wb') as output_file:
                    pdf_writer.write(output_file)
                
                output_files.append(output_filename)
    
    return output_files

def split_pdf_by_interval(pdf_path, output_folder, base_name, interval):
    """Split PDF by page interval."""
    output_files = []
    with open(pdf_path, 'rb') as f:
        pdf_reader = PyPDF2.PdfReader(f)
        total_pages = len(pdf_reader.pages)
        
        part = 1
        for start_page in range(0, total_pages, interval):
            pdf_writer = PyPDF2.PdfWriter()
            end_page = min(start_page + interval, total_pages)
            
            for page_num in range(start_page, end_page):
                pdf_writer.add_page(pdf_reader.pages[page_num])
            
            output_filename = f"{base_name}_part_{part}.pdf"
            output_path = os.path.join(output_folder, output_filename)
            
            with open(output_path, 'wb') as output_file:
                pdf_writer.write(output_file)
            
            output_files.append(output_filename)
            part += 1
    
    return output_files

@app.route('/')
def index():
    """Render the index.html template."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    """Handle the file upload and merge PDFs directly, returning the merged file."""
    uploaded_files = request.files.getlist('files')
    if not uploaded_files:
        return "No files uploaded", 400
    
    if len(uploaded_files) < 2:
        return "At least 2 PDF files are required to merge", 400
    
    file_paths = []
    try:
        # Save uploaded files maintaining the order
        for file in uploaded_files:
            if file and file.filename.endswith('.pdf'):
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                file_paths.append(file_path)
        
        if len(file_paths) < 2:
            return "At least 2 valid PDF files are required", 400
        
        # Update the merge counter and create the new filename
        merge_count = update_counter()
        merged_filename = f'merged_output_{merge_count}.pdf'
        merged_file_path = os.path.join(app.config['MERGED_FOLDER'], merged_filename)
        
        # Merge PDFs in the order they were uploaded
        merge_pdfs(file_paths, merged_file_path)
        
        # Clean up uploaded files
        for file_path in file_paths:
            try:
                os.remove(file_path)
            except:
                pass
        
        # Return the merged file directly
        return send_file(merged_file_path, as_attachment=True, download_name=merged_filename)
    
    except Exception as e:
        # Clean up on error
        for file_path in file_paths:
            try:
                os.remove(file_path)
            except:
                pass
        return f"Error merging PDFs: {str(e)}", 500

@app.route('/merge', methods=['GET'])
def merge_files():
    """Merge the uploaded PDFs and redirect to the download route."""
    file_paths = session.get('file_paths', [])
    if not file_paths:
        return "No files to merge", 400
    
    # Update the merge counter and create the new filename
    merge_count = update_counter()
    merged_filename = f'merged_output_{merge_count}.pdf'
    merged_file_path = os.path.join(app.config['MERGED_FOLDER'], merged_filename)
    
    merge_pdfs(file_paths, merged_file_path)
    
    return redirect(url_for('download_file', filename=merged_filename))

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    """Serve the merged PDF file for download."""
    merged_file_path = os.path.join(app.config['MERGED_FOLDER'], filename)
    if not os.path.exists(merged_file_path):
        return "File not found", 404

    return send_file(merged_file_path, as_attachment=True, download_name=filename)

@app.route('/split/info', methods=['POST'])
def split_info():
    """Get information about the uploaded PDF for splitting."""
    try:
        uploaded_file = request.files.get('file')
        if not uploaded_file or not uploaded_file.filename.endswith('.pdf'):
            return {"error": "Please upload a valid PDF file"}, 400
        
        # Save temporarily to get page count
        filename = secure_filename(uploaded_file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        uploaded_file.save(temp_path)
        
        page_count = get_pdf_page_count(temp_path)
        
        return {
            "filename": filename,
            "pages": page_count,
            "temp_path": filename
        }
    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/split/execute', methods=['POST'])
def split_pdf():
    """Execute PDF splitting based on the selected mode."""
    try:
        data = request.get_json()
        filename = data.get('filename')
        mode = data.get('mode')
        
        if not filename:
            return {"error": "No file specified"}, 400
        
        pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(pdf_path):
            return {"error": "File not found"}, 404
        
        base_name = os.path.splitext(filename)[0]
        output_files = []
        
        if mode == 'all':
            output_files = split_pdf_all_pages(pdf_path, app.config['SPLIT_FOLDER'], base_name)
        
        elif mode == 'custom':
            pages_input = data.get('pages', '')
            if not pages_input:
                return {"error": "Please specify pages to extract"}, 400
            
            # Parse pages input (e.g., "1, 3-5, 7")
            page_ranges = [p.strip() for p in pages_input.split(',')]
            output_files = split_pdf_custom_pages(pdf_path, app.config['SPLIT_FOLDER'], base_name, page_ranges)
        
        elif mode == 'interval':
            interval = data.get('interval')
            if not interval or interval < 1:
                return {"error": "Please specify a valid interval"}, 400
            
            output_files = split_pdf_by_interval(pdf_path, app.config['SPLIT_FOLDER'], base_name, interval)
        
        else:
            return {"error": "Invalid split mode"}, 400
        
        # Clean up uploaded file
        try:
            os.remove(pdf_path)
        except:
            pass
        
        if not output_files:
            return {"error": "No files were generated"}, 400
        
        return {
            "success": True,
            "files": output_files,
            "count": len(output_files)
        }
    
    except Exception as e:
        return {"error": str(e)}, 500

@app.route('/split/download/<filename>', methods=['GET'])
def download_split_file(filename):
    """Download a split PDF file."""
    split_file_path = os.path.join(app.config['SPLIT_FOLDER'], filename)
    if not os.path.exists(split_file_path):
        return "File not found", 404
    
    return send_file(split_file_path, as_attachment=True, download_name=filename)

@app.route('/split/download_all', methods=['POST'])
def download_all_split_files():
    """Create a zip file with all split PDFs and download it."""
    import zipfile
    from io import BytesIO
    
    try:
        data = request.get_json()
        filenames = data.get('files', [])
        
        if not filenames:
            return {"error": "No files to download"}, 400
        
        # Create a zip file in memory
        memory_file = BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            for filename in filenames:
                file_path = os.path.join(app.config['SPLIT_FOLDER'], filename)
                if os.path.exists(file_path):
                    zf.write(file_path, filename)
        
        memory_file.seek(0)
        
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name='split_pdfs.zip'
        )
    
    except Exception as e:
        return {"error": str(e)}, 500


if __name__ == "__main__":
    app.run(debug=True)
