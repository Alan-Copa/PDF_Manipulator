document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('form');
    const progressBar = document.getElementById('progress-bar');
    const button_chose_files = document.getElementById('files');

    button_chose_files.addEventListener('click', function () {
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const formData = new FormData(form);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);
        xhr.responseType = 'blob';  // Ensure response type is set to blob

        xhr.upload.onprogress = function (event) {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressBar.textContent = Math.round(percentComplete) + '%';
            }
        };

        xhr.onload = function () {
            if (xhr.status === 200) {
                progressBar.style.width = '100%';
                progressBar.textContent = '100%';

                // Create a link to download the file
                const blob = xhr.response;
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = 'merged.pdf';
                link.click();

                alert('Files successfully uploaded and merged!');
            } else {
                alert('An error occurred during the upload.');
            }
        };

        xhr.onerror = function () {
            alert('An error occurred during the upload.');
        };

        xhr.send(formData);
    });
});
