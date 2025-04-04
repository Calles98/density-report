from flask import Flask, request, send_file, render_template
import os
from flask_cors import CORS
import subprocess
import shutil

app = Flask(__name__)
CORS(app)

# Test comment

UPLOAD_FOLDER = 'uploads'
RESULT_FOLDER = 'results'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    # Ensure the 'files' key exists in the request
    if 'files' not in request.files:
        return 'No files part in the request', 400

    files = request.files.getlist('files')  # Retrieve all files from the request
    checkedLogs = request.form.getlist('checkedItems')

    #print(checkedLogs)

    if not files or all(file.filename == '' for file in files):
        return 'No selected file', 400

    # Process each uploaded file
    result_files = []
    for file in files:
        if file and file.filename != '':
            # Save the file
            filepath = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(filepath)
            result_files.append(filepath)
    
    # Notebook to execute
    notebook_filename = "Notebooks/density_test.ipynb"

    # Call Jupyter notebook processing function
    #print(result_files)
    result_filepath = process_notebook(result_files, checkedLogs, notebook_filename)


    # Send the final processed result
    return send_file(result_filepath, as_attachment=True)

def process_notebook(filepaths, checkedLogs, notebook_filename):
    result_pdf = os.path.join(RESULT_FOLDER, 'report.html')
    temp_notebook = 'temp_notebook.ipynb'

    # Copy the selected notebook to a temporary file to modify
    shutil.copy(notebook_filename, temp_notebook)

    # Open and modify the notebook to include the file path
    with open(temp_notebook, 'r') as file:
        notebook_content = file.read()

    # Update the notebook content with the file path
    filepaths_str = repr(filepaths) # Convert list to a string literal (e.g., "['file1.csv', 'file2.csv']")
    checked_logs_str = repr(checkedLogs)
    notebook_content = notebook_content.replace('FILE_PATH_PLACEHOLDER', filepaths_str)
    notebook_content = notebook_content.replace('LOGS_PLACEHOLDER', checked_logs_str)


    with open(temp_notebook, 'w') as file:
        file.write(notebook_content)

    # Run the Jupyter notebook with the updated file path
    command = f'jupyter nbconvert --to html --no-input --execute --output {result_pdf} {temp_notebook}'
    print("Running command:", command)  # Debug print statement
    subprocess.run(command, shell=True, check=True)
    
    # Clean up
    os.remove(temp_notebook)
    
    return result_pdf

if __name__ == '__main__':
    app.run(debug=True)