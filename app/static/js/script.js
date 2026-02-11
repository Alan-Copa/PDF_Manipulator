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

    // Convert Section JavaScript
    const convertFileInput = document.getElementById('convert-file-input');
    const convertUploadArea = document.getElementById('convert-upload-area');
    const convertSubmitBtn = document.getElementById('convert-submit-btn');
    const convertProgressWrapper = document.getElementById('convert-progress-wrapper');
    const convertProgressBar = document.getElementById('convert-progress-bar');
    const convertForm = document.getElementById('convert-form');

    // File input change for convert
    if (convertFileInput) {
        convertFileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                const fileCount = e.target.files.length;
                const fileNames = Array.from(e.target.files).map(f => f.name).join(', ');
                
                // Update upload area to show selected files
                convertUploadArea.innerHTML = `
                    <div class="upload-icon">✓</div>
                    <p><strong>${fileCount} image${fileCount > 1 ? 's' : ''} selected</strong></p>
                    <p class="format-hint">${fileNames.length > 50 ? fileNames.substring(0, 50) + '...' : fileNames}</p>
                    <label for="convert-file-input" class="file-select-btn">Change Files</label>
                `;
                
                // Show the convert button
                convertSubmitBtn.style.display = 'block';
            }
        });

        // Make upload area clickable
        convertUploadArea.addEventListener('click', function(e) {
            if (!e.target.classList.contains('file-select-btn') && e.target.tagName !== 'LABEL') {
                convertFileInput.click();
            }
        });

        // Handle form submission with progress
        convertForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(convertForm);
            const xhr = new XMLHttpRequest();

            // Show progress wrapper
            convertProgressWrapper.style.display = 'block';
            convertSubmitBtn.disabled = true;
            convertSubmitBtn.textContent = '🔄 Converting...';

            // Upload progress
            xhr.upload.addEventListener('progress', function(e) {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    convertProgressBar.style.width = percentComplete + '%';
                    convertProgressBar.textContent = percentComplete + '%';
                }
            });

            xhr.onload = function() {
                if (xhr.status === 200 || xhr.status === 302) {
                    convertProgressBar.style.width = '100%';
                    convertProgressBar.textContent = '100% - Complete!';
                    
                    // Redirect to download
                    setTimeout(() => {
                        window.location.href = xhr.responseURL;
                    }, 500);
                } else {
                    alert('An error occurred during conversion: ' + xhr.responseText);
                    resetConvertForm();
                }
            };

            xhr.onerror = function() {
                alert('An error occurred during conversion.');
                resetConvertForm();
            };

            xhr.open('POST', '/convert');
            xhr.send(formData);
        });

        function resetConvertForm() {
            convertSubmitBtn.disabled = false;
            convertSubmitBtn.textContent = '🔄 Convert to PDF';
            convertProgressWrapper.style.display = 'none';
            convertProgressBar.style.width = '0%';
            convertProgressBar.textContent = '0%';
        }
    }

    // ==================== SPLIT PDF FUNCTIONALITY ====================
    
    let currentSplitFile = null;
    let currentSplitFilename = null;
    
    // DOM Elements for Split
    const splitUploadArea = document.getElementById('split-upload-area');
    const splitFileInput = document.getElementById('split-file-input');
    const splitConfigContainer = document.getElementById('split-config-container');
    const splitFilename = document.getElementById('split-filename');
    const splitTotalPages = document.getElementById('split-total-pages');
    const changeSplitFileBtn = document.getElementById('change-split-file');
    const cancelSplitBtn = document.getElementById('cancel-split-btn');
    const executeSplitBtn = document.getElementById('execute-split-btn');
    const splitProgressBar = document.getElementById('split-progress-bar');
    const splitProgressWrapper = document.getElementById('split-progress-wrapper');
    
    // Split mode inputs
    const splitModeRadios = document.querySelectorAll('input[name="split-mode"]');
    const customPagesInput = document.getElementById('custom-pages-input');
    const intervalInput = document.getElementById('interval-input');
    const pagesInputField = document.getElementById('pages-input');
    const intervalValueField = document.getElementById('interval-value');
    
    if (splitFileInput) {
        // Split file selection
        splitFileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                handleSplitFile(e.target.files[0]);
            }
        });
        
        // Click to upload
        splitUploadArea.addEventListener('click', function() {
            splitFileInput.click();
        });
        
        // Change file button
        changeSplitFileBtn.addEventListener('click', function() {
            splitFileInput.click();
        });
        
        // Cancel split
        cancelSplitBtn.addEventListener('click', function() {
            resetSplitForm();
        });
        
        // Split mode change
        splitModeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                // Hide all input containers
                customPagesInput.style.display = 'none';
                intervalInput.style.display = 'none';
                
                // Show relevant input based on mode
                if (this.value === 'custom') {
                    customPagesInput.style.display = 'block';
                } else if (this.value === 'interval') {
                    intervalInput.style.display = 'block';
                }
            });
        });
        
        // Handle split file upload
        function handleSplitFile(file) {
            if (file.type !== 'application/pdf') {
                alert('Please select a PDF file');
                return;
            }
            
            currentSplitFile = file;
            
            // Upload file to get info
            const formData = new FormData();
            formData.append('file', file);
            
            fetch('/split/info', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }
                
                currentSplitFilename = data.temp_path;
                splitFilename.textContent = data.filename;
                splitTotalPages.textContent = data.pages;
                
                // Show config container
                splitUploadArea.style.display = 'none';
                splitConfigContainer.style.display = 'block';
            })
            .catch(error => {
                alert('Error uploading file: ' + error);
            });
        }
        
        // Execute split
        executeSplitBtn.addEventListener('click', function() {
            const selectedMode = document.querySelector('input[name="split-mode"]:checked').value;
            
            const requestData = {
                filename: currentSplitFilename,
                mode: selectedMode
            };
            
            // Add mode-specific data
            if (selectedMode === 'custom') {
                const pages = pagesInputField.value.trim();
                if (!pages) {
                    alert('Please enter pages to extract');
                    return;
                }
                requestData.pages = pages;
            } else if (selectedMode === 'interval') {
                const interval = parseInt(intervalValueField.value);
                if (!interval || interval < 1) {
                    alert('Please enter a valid interval');
                    return;
                }
                requestData.interval = interval;
            }
            
            // Show progress
            splitProgressWrapper.style.display = 'block';
            splitProgressBar.style.width = '50%';
            splitProgressBar.textContent = '50% - Processing...';
            executeSplitBtn.disabled = true;
            
            // Execute split
            fetch('/split/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Error: ' + data.error);
                    resetSplitProgress();
                    return;
                }
                
                // Success!
                splitProgressBar.style.width = '100%';
                splitProgressBar.textContent = '100% - Complete!';
                
                // Download files
                if (data.files.length === 1) {
                    // Single file - download directly
                    window.location.href = `/split/download/${data.files[0]}`;
                } else {
                    // Multiple files - offer to download as zip
                    if (confirm(`Split successful! ${data.count} files created. Download all as ZIP?`)) {
                        downloadAllSplitFiles(data.files);
                    } else {
                        alert(`Files are ready. You can download them from the split folder.`);
                    }
                }
                
                // Reset form after delay
                setTimeout(() => {
                    resetSplitForm();
                }, 2000);
            })
            .catch(error => {
                alert('Error splitting PDF: ' + error);
                resetSplitProgress();
            });
        });
        
        // Download all split files as zip
        function downloadAllSplitFiles(files) {
            fetch('/split/download_all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ files: files })
            })
            .then(response => response.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'split_pdfs.zip';
                link.click();
            })
            .catch(error => {
                alert('Error downloading files: ' + error);
            });
        }
        
        // Reset split form
        function resetSplitForm() {
            currentSplitFile = null;
            currentSplitFilename = null;
            splitFileInput.value = '';
            pagesInputField.value = '';
            intervalValueField.value = '1';
            
            // Reset radio to first option
            document.querySelector('input[name="split-mode"][value="all"]').checked = true;
            customPagesInput.style.display = 'none';
            intervalInput.style.display = 'none';
            
            // Hide config, show upload
            splitConfigContainer.style.display = 'none';
            splitUploadArea.style.display = 'flex';
            
            resetSplitProgress();
        }
        
        // Reset split progress
        function resetSplitProgress() {
            splitProgressWrapper.style.display = 'none';
            splitProgressBar.style.width = '0%';
            splitProgressBar.textContent = '0%';
            executeSplitBtn.disabled = false;
        }
    }

    // ==================== PDF CENSORING FUNCTIONALITY ====================
    const censorSection = document.querySelector('.censor-container');
    if (censorSection) {
        // DOM Elements
        const censorFileInput = document.getElementById('censor-file-input');
        const censorUploadArea = document.getElementById('censor-upload-area');
        const censorWorkspace = document.getElementById('censor-workspace');
        const censorResult = document.getElementById('censor-result');
        const censorFilename = document.getElementById('censor-filename');
        const currentPageNum = document.getElementById('current-page-num');
        const totalPagesNum = document.getElementById('total-pages-num');
        const canvas = document.getElementById('censor-canvas');
        const ctx = canvas ? canvas.getContext('2d') : null;
        const canvasOverlay = document.getElementById('canvas-overlay');
        
        // Buttons
        const changeCensorFileBtn = document.getElementById('change-censor-file');
        const drawRectangleBtn = document.getElementById('draw-rectangle-btn');
        const selectToolBtn = document.getElementById('select-tool-btn');
        const clearSelectionBtn = document.getElementById('clear-selection-btn');
        const searchAndMarkBtn = document.getElementById('search-and-mark-btn');
        const prevPageBtn = document.getElementById('prev-page-btn');
        const nextPageBtn = document.getElementById('next-page-btn');
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        const zoomFitBtn = document.getElementById('zoom-fit-btn');
        const previewRedactionBtn = document.getElementById('preview-redaction-btn');
        const executeCensorBtn = document.getElementById('execute-censor-btn');
        const cancelCensorBtn = document.getElementById('cancel-censor-btn');
        const censorAnotherBtn = document.getElementById('censor-another-btn');
        
        // State variables
        let currentCensorFile = null;
        let currentCensorFilename = null;
        let totalPages = 0;
        let currentPage = 1;
        let pdfPagesInfo = [];
        let redactionZones = [];  // Array of {page, x, y, width, height}
        let currentTool = 'rectangle';
        let isDrawing = false;
        let startX = 0;
        let startY = 0;
        let currentZoom = 1.0;
        let canvasScale = 1.0;
        
        // File input handler
        if (censorFileInput) {
            censorFileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && file.type === 'application/pdf') {
                    uploadCensorFile(file);
                } else {
                    alert('Please select a valid PDF file');
                }
            });
        }
        
        // Upload PDF for censoring
        function uploadCensorFile(file) {
            const formData = new FormData();
            formData.append('file', file);
            
            showCensorProgress('Uploading PDF...');
            
            fetch('/censor/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                hideCensorProgress();
                
                if (data.error) {
                    alert('Error: ' + data.error);
                    return;
                }
                
                currentCensorFilename = data.filename;
                totalPages = data.total_pages;
                pdfPagesInfo = data.pages_info;
                currentPage = 1;
                redactionZones = [];
                
                // Update UI
                censorFilename.textContent = data.filename;
                totalPagesNum.textContent = totalPages;
                currentPageNum.textContent = currentPage;
                
                // Show workspace
                censorUploadArea.style.display = 'none';
                censorWorkspace.style.display = 'block';
                
                // Load first page
                loadCensorPage(currentPage);
                updateRedactionCount();
            })
            .catch(error => {
                hideCensorProgress();
                alert('Error uploading file: ' + error);
            });
        }
        
        // Load specific page on canvas
        function loadCensorPage(pageNum) {
            if (!currentCensorFilename) return;
            
            showCensorProgress('Loading page...');
            
            const img = new Image();
            img.onload = function() {
                // Set canvas size
                canvas.width = img.width;
                canvas.height = img.height;
                canvasScale = img.width / (pdfPagesInfo[pageNum - 1].width);
                
                // Draw image
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                // Draw existing redaction zones for this page
                drawRedactionZones();
                
                // Update navigation buttons
                prevPageBtn.disabled = (pageNum === 1);
                nextPageBtn.disabled = (pageNum === totalPages);
                currentPageNum.textContent = pageNum;
                
                hideCensorProgress();
            };
            
            img.onerror = function() {
                hideCensorProgress();
                alert('Error loading page');
            };
            
            img.src = `/censor/render_page/${currentCensorFilename}/${pageNum}`;
        }
        
        // Draw redaction zones on canvas
        function drawRedactionZones() {
            // Redraw the zones for current page
            const zonesOnPage = redactionZones.filter(z => z.page === currentPage);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            
            zonesOnPage.forEach(zone => {
                const x = zone.x * canvasScale;
                const y = zone.y * canvasScale;
                const w = zone.width * canvasScale;
                const h = zone.height * canvasScale;
                
                ctx.fillRect(x, y, w, h);
                ctx.strokeRect(x, y, w, h);
            });
        }
        
        // Canvas drawing handlers
        if (canvas) {
            canvas.addEventListener('mousedown', function(e) {
                if (currentTool !== 'rectangle') return;
                
                const rect = canvas.getBoundingClientRect();
                startX = e.clientX - rect.left;
                startY = e.clientY - rect.top;
                isDrawing = true;
            });
            
            canvas.addEventListener('mousemove', function(e) {
                if (!isDrawing || currentTool !== 'rectangle') return;
                
                const rect = canvas.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
                
                // Reload page image
                loadCensorPage(currentPage);
                
                // Draw temporary rectangle
                const width = currentX - startX;
                const height = currentY - startY;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.fillRect(startX, startY, width, height);
                ctx.strokeRect(startX, startY, width, height);
            });
            
            canvas.addEventListener('mouseup', function(e) {
                if (!isDrawing || currentTool !== 'rectangle') return;
                
                const rect = canvas.getBoundingClientRect();
                const endX = e.clientX - rect.left;
                const endY = e.clientY - rect.top;
                
                const width = endX - startX;
                const height = endY - startY;
                
                // Only add if rectangle has meaningful size
                if (Math.abs(width) > 5 && Math.abs(height) > 5) {
                    // Convert canvas coordinates to PDF coordinates
                    const pdfX = Math.min(startX, endX) / canvasScale;
                    const pdfY = Math.min(startY, endY) / canvasScale;
                    const pdfWidth = Math.abs(width) / canvasScale;
                    const pdfHeight = Math.abs(height) / canvasScale;
                    
                    redactionZones.push({
                        page: currentPage,
                        x: pdfX,
                        y: pdfY,
                        width: pdfWidth,
                        height: pdfHeight
                    });
                    
                    updateRedactionCount();
                }
                
                isDrawing = false;
                loadCensorPage(currentPage);
            });
        }
        
        // Tool selection
        if (drawRectangleBtn) {
            drawRectangleBtn.addEventListener('click', function() {
                currentTool = 'rectangle';
                drawRectangleBtn.classList.add('active');
                selectToolBtn.classList.remove('active');
            });
        }
        
        if (selectToolBtn) {
            selectToolBtn.addEventListener('click', function() {
                currentTool = 'select';
                selectToolBtn.classList.add('active');
                drawRectangleBtn.classList.remove('active');
            });
        }
        
        // Clear all redactions
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', function() {
                if (confirm('Clear all redaction zones on all pages?')) {
                    redactionZones = [];
                    updateRedactionCount();
                    loadCensorPage(currentPage);
                }
            });
        }
        
        // Text search and mark
        if (searchAndMarkBtn) {
            searchAndMarkBtn.addEventListener('click', function() {
                const searchTerm = document.getElementById('censor-search-input').value.trim();
                
                if (!searchTerm) {
                    alert('Please enter text to search');
                    return;
                }
                
                showCensorProgress('Searching...');
                
                fetch('/censor/search_text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: currentCensorFilename,
                        search_term: searchTerm
                    })
                })
                .then(response => response.json())
                .then(data => {
                    hideCensorProgress();
                    
                    if (data.error) {
                        alert('Error: ' + data.error);
                        return;
                    }
                    
                    // Add search results to redaction zones
                    data.results.forEach(result => {
                        redactionZones.push({
                            page: result.page,
                            x: result.x,
                            y: result.y,
                            width: result.width,
                            height: result.height
                        });
                    });
                    
                    document.getElementById('search-result-count').textContent = 
                        `Found ${data.count} instance(s)`;
                    
                    updateRedactionCount();
                    loadCensorPage(currentPage);
                })
                .catch(error => {
                    hideCensorProgress();
                    alert('Error searching: ' + error);
                });
            });
        }
        
        // Page navigation
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    loadCensorPage(currentPage);
                }
            });
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', function() {
                if (currentPage < totalPages) {
                    currentPage++;
                    loadCensorPage(currentPage);
                }
            });
        }
        
        // Zoom controls (simplified)
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', function() {
                currentZoom = Math.min(currentZoom + 0.2, 3.0);
                document.getElementById('zoom-level').textContent = 
                    Math.round(currentZoom * 100) + '%';
                canvas.style.transform = `scale(${currentZoom})`;
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', function() {
                currentZoom = Math.max(currentZoom - 0.2, 0.5);
                document.getElementById('zoom-level').textContent = 
                    Math.round(currentZoom * 100) + '%';
                canvas.style.transform = `scale(${currentZoom})`;
            });
        }
        
        if (zoomFitBtn) {
            zoomFitBtn.addEventListener('click', function() {
                currentZoom = 1.0;
                document.getElementById('zoom-level').textContent = '100%';
                canvas.style.transform = 'scale(1)';
            });
        }
        
        // Execute censoring
        if (executeCensorBtn) {
            executeCensorBtn.addEventListener('click', function() {
                if (redactionZones.length === 0) {
                    alert('Please mark at least one area to censor');
                    return;
                }
                
                if (!confirm(`Apply permanent censoring to ${redactionZones.length} area(s)? This cannot be undone!`)) {
                    return;
                }
                
                const removeMetadata = document.getElementById('remove-metadata-checkbox').checked;
                const colorSelect = document.getElementById('redaction-color-select').value;
                const color = colorSelect.split(',').map(c => parseInt(c) / 255);
                
                showCensorProgress('Applying permanent redactions...');
                
                fetch('/censor/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: currentCensorFilename,
                        redaction_zones: redactionZones,
                        remove_metadata: removeMetadata,
                        redaction_color: color
                    })
                })
                .then(response => response.json())
                .then(data => {
                    hideCensorProgress();
                    
                    if (data.error) {
                        alert('Error: ' + data.error);
                        return;
                    }
                    
                    // Show result
                    document.getElementById('result-redaction-count').textContent = 
                        data.redacted_areas;
                    
                    const downloadLink = document.getElementById('download-censored-link');
                    downloadLink.href = `/censor/download/${data.filename}`;
                    downloadLink.download = data.filename;
                    
                    censorWorkspace.style.display = 'none';
                    censorResult.style.display = 'block';
                })
                .catch(error => {
                    hideCensorProgress();
                    alert('Error censoring: ' + error);
                });
            });
        }
        
        // Cancel/Reset buttons
        if (cancelCensorBtn) {
            cancelCensorBtn.addEventListener('click', resetCensorForm);
        }
        
        if (changeCensorFileBtn) {
            changeCensorFileBtn.addEventListener('click', resetCensorForm);
        }
        
        if (censorAnotherBtn) {
            censorAnotherBtn.addEventListener('click', resetCensorForm);
        }
        
        // Helper functions
        function updateRedactionCount() {
            document.getElementById('redaction-count').textContent = redactionZones.length;
        }
        
        function showCensorProgress(message) {
            const progressWrapper = document.getElementById('censor-progress-wrapper');
            const progressBar = document.getElementById('censor-progress-bar');
            if (progressWrapper && progressBar) {
                progressWrapper.style.display = 'block';
                progressBar.textContent = message;
            }
        }
        
        function hideCensorProgress() {
            const progressWrapper = document.getElementById('censor-progress-wrapper');
            if (progressWrapper) {
                progressWrapper.style.display = 'none';
            }
        }
        
        function resetCensorForm() {
            currentCensorFile = null;
            currentCensorFilename = null;
            totalPages = 0;
            currentPage = 1;
            pdfPagesInfo = [];
            redactionZones = [];
            currentZoom = 1.0;
            
            if (censorFileInput) censorFileInput.value = '';
            if (canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.style.transform = 'scale(1)';
            }
            
            document.getElementById('censor-search-input').value = '';
            document.getElementById('search-result-count').textContent = '';
            document.getElementById('zoom-level').textContent = '100%';
            
            censorWorkspace.style.display = 'none';
            censorResult.style.display = 'none';
            censorUploadArea.style.display = 'flex';
            
            updateRedactionCount();
        }
    }
});
