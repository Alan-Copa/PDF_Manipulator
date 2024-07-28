from flask import Flask, request, render_template, send_file
import PyPDF2
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
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
    """Handle the file upload, merge PDFs, and return the merged file."""
    uploaded_files = request.files.getlist('files')
    if not uploaded_files:
        return "No files uploaded", 400
    
    file_paths = []
    for file in uploaded_files:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        file_paths.append(file_path)
    
    # Update the merge counter and create the new filename
    merge_count = update_counter()
    merged_filename = f'merged_output_{merge_count}.pdf'
    merged_file_path = os.path.join(app.config['MERGED_FOLDER'], merged_filename)
    
    merge_pdfs(file_paths, merged_file_path)
    
    return send_file(merged_file_path, as_attachment=True, download_name=merged_filename)

# Convert files to pdfs
# @app.route('/upload', methods=['POST'])
# def convert_files():
#     return 0


if __name__ == "__main__":
    app.run(debug=True)
