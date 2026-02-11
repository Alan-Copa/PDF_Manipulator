document.addEventListener('DOMContentLoaded', function () {
    // File management
    let filesArray = [];
    let draggedElement = null;

    // DOM Elements
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const fileListContainer = document.getElementById('file-list-container');
    const fileList = document.getElementById('file-list');
    const mergeBtn = document.getElementById('merge-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const addMoreBtn = document.getElementById('add-more-btn');
    const progressBar = document.getElementById('progress-bar');

    // File input change event
    fileInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
    });

    // Add more files button
    addMoreBtn.addEventListener('click', function() {
        fileInput.click();
    });

    // Drag and drop on upload area
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // Handle file selection
    function handleFiles(files) {
        const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
        
        if (pdfFiles.length === 0) {
            alert('Please select only PDF files');
            return;
        }

        pdfFiles.forEach(file => {
            if (!filesArray.some(f => f.name === file.name)) {
                filesArray.push(file);
            }
        });

        updateFileList();
        showFileList();
    }

    // Update the file list display
    function updateFileList() {
        fileList.innerHTML = '';
        
        filesArray.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';
            li.draggable = true;
            li.dataset.index = index;
            
            li.innerHTML = `
                <div class="file-info">
                    <span class="drag-handle">☰</span>
                    <span class="file-number">${index + 1}</span>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                </div>
                <button class="remove-btn" data-index="${index}">×</button>
            `;

            // Drag events for reordering
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('drop', handleDrop);
            li.addEventListener('dragend', handleDragEnd);

            // Remove button
            const removeBtn = li.querySelector('.remove-btn');
            removeBtn.addEventListener('click', function() {
                removeFile(index);
            });

            fileList.appendChild(li);
        });
    }

    // Drag and drop handlers for reordering
    function handleDragStart(e) {
        draggedElement = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const afterElement = getDragAfterElement(fileList, e.clientY);
        if (afterElement == null) {
            fileList.appendChild(draggedElement);
        } else {
            fileList.insertBefore(draggedElement, afterElement);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Reorder the files array based on DOM order
        const newOrder = [];
        const items = fileList.querySelectorAll('.file-item');
        items.forEach(item => {
            const index = parseInt(item.dataset.index);
            newOrder.push(filesArray[index]);
        });
        filesArray = newOrder;
        updateFileList();
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.file-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Remove file from list
    function removeFile(index) {
        filesArray.splice(index, 1);
        updateFileList();
        
        if (filesArray.length === 0) {
            hideFileList();
        }
    }

    // Clear all files
    clearAllBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all files?')) {
            filesArray = [];
            fileInput.value = '';
            hideFileList();
            resetProgress();
        }
    });

    // Show/hide file list container
    function showFileList() {
        uploadArea.style.display = 'none';
        fileListContainer.style.display = 'block';
    }

    function hideFileList() {
        uploadArea.style.display = 'flex';
        fileListContainer.style.display = 'none';
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Reset progress bar
    function resetProgress() {
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
    }

    // Merge PDFs
    mergeBtn.addEventListener('click', function() {
        if (filesArray.length < 2) {
            alert('Please select at least 2 PDF files to merge');
            return;
        }

        const formData = new FormData();
        filesArray.forEach((file, index) => {
            formData.append('files', file);
        });

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);
        xhr.responseType = 'blob';

        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressBar.textContent = Math.round(percentComplete) + '%';
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                progressBar.style.width = '100%';
                progressBar.textContent = '100% - Complete!';

                // Create a link to download the file
                const blob = xhr.response;
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = 'merged.pdf';
                link.click();

                alert('PDFs successfully merged!');
                
                // Reset after successful merge
                setTimeout(() => {
                    filesArray = [];
                    fileInput.value = '';
                    hideFileList();
                    resetProgress();
                }, 2000);
            } else {
                alert('An error occurred during the merge.');
                resetProgress();
            }
        };

        xhr.onerror = function() {
            alert('An error occurred during the merge.');
            resetProgress();
        };

        xhr.send(formData);
    });
});
