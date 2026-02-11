from flask import Flask, request, render_template, send_file, redirect, url_for, session
import PyPDF2
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
    
# Load secret key from environment variable
app.secret_key = os.environ.get('SECRET_KEY', 'default_secret_key')

app.config['UPLOAD_FOLDER'] = 'database/uploads/'
app.config['MERGED_FOLDER'] = 'database/merged/'
app.config['COUNTER_FILE'] = 'database/merge_counter.txt'

# Ensure upload and merged directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['MERGED_FOLDER'], exist_ok=True)

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


if __name__ == "__main__":
    app.run(debug=True)
