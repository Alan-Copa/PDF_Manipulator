// Split PDF JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const splitFileInput = document.getElementById('split-file-input');
  const splitUploadArea = document.getElementById('split-upload-area');
  const splitConfigContainer = document.getElementById('split-config-container');
  const splitFilename = document.getElementById('split-filename');
  const splitTotalPages = document.getElementById('split-total-pages');
  const changeSplitFile = document.getElementById('change-split-file');
  const executeSplitBtn = document.getElementById('execute-split-btn');
  const cancelSplitBtn = document.getElementById('cancel-split-btn');
  const customPagesInput = document.getElementById('custom-pages-input');
  const intervalInput = document.getElementById('interval-input');
  const pagesInput = document.getElementById('pages-input');
  const intervalValue = document.getElementById('interval-value');

  let currentFile = null;
  let fileInfo = null;

  // File input
  splitFileInput.addEventListener('change', handleFileUpload);
  
  // Drag and drop for upload area
  splitUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    splitUploadArea.classList.add('drag-over');
  });
  
  splitUploadArea.addEventListener('dragleave', () => {
    splitUploadArea.classList.remove('drag-over');
  });
  
  splitUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    splitUploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      splitFileInput.files = dt.files;
      handleFileUpload({ target: { files: dt.files } });
    }
  });

  // Mode selection
  document.querySelectorAll('input[name="split-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      customPagesInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
      intervalInput.style.display = e.target.value === 'interval' ? 'block' : 'none';
    });
  });

  // Change file
  changeSplitFile.addEventListener('click', () => {
    splitUploadArea.style.display = 'block';
    splitConfigContainer.style.display = 'none';
    currentFile = null;
    fileInfo = null;
  });

  // Cancel
  cancelSplitBtn.addEventListener('click', () => {
    splitUploadArea.style.display = 'block';
    splitConfigContainer.style.display = 'none';
    currentFile = null;
    fileInfo = null;
  });

  // Execute split
  executeSplitBtn.addEventListener('click', executeSplit);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.pdf')) {
      alert('Please select a valid PDF file');
      return;
    }

    currentFile = file;

    // Get file info
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/split/info', {
        method: 'POST',
        body: formData
      });

      fileInfo = await response.json();

      if (fileInfo.error) {
        alert('Error: ' + fileInfo.error);
        return;
      }

      // Show configuration
      splitFilename.textContent = fileInfo.filename;
      splitTotalPages.textContent = fileInfo.pages;
      splitUploadArea.style.display = 'none';
      splitConfigContainer.style.display = 'block';
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    }
  }

  async function executeSplit() {
    const mode = document.querySelector('input[name="split-mode"]:checked').value;
    
    const data = {
      filename: fileInfo.filename,
      mode: mode
    };

    if (mode === 'custom') {
      if (!pagesInput.value.trim()) {
        alert('Please enter pages or ranges to extract');
        return;
      }
      data.pages = pagesInput.value.trim();
    } else if (mode === 'interval') {
      const interval = parseInt(intervalValue.value);
      if (!interval || interval < 1) {
        alert('Please enter a valid interval');
        return;
      }
      data.interval = interval;
    }

    try {
      executeSplitBtn.disabled = true;
      document.getElementById('split-progress-wrapper').style.display = 'block';

      const response = await fetch('/split/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.error) {
        alert('Error: ' + result.error);
        return;
      }

      // Download files
      alert(`Successfully split into ${result.count} file(s)! Downloading...`);
      
      for (const filename of result.files) {
        const a = document.createElement('a');
        a.href = `/split/download/${filename}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Reset
      setTimeout(() => {
        splitUploadArea.style.display = 'block';
        splitConfigContainer.style.display = 'none';
        currentFile = null;
        fileInfo = null;
        document.getElementById('split-progress-wrapper').style.display = 'none';
        executeSplitBtn.disabled = false;
      }, 1000);
    } catch (error) {
      alert('Error splitting PDF: ' + error.message);
      document.getElementById('split-progress-wrapper').style.display = 'none';
      executeSplitBtn.disabled = false;
    }
  }
});
