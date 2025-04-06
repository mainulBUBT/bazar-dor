/**
 * Standardized Toast Notification System for Bazar Dor
 * 
 * This file provides a unified toast notification system that can be included across
 * all pages in the application to ensure a consistent user feedback experience.
 *
 * Usage:
 * 1. Include this script in your HTML after Bootstrap:
 *    <script src="js/toast.js"></script>
 *
 * 2. Call the global showToast function:
 *    showToast(message, type);
 *
 * Parameters:
 * - message: String - The message to display in the toast
 * - type: String - Optional - The type of toast: 'success', 'warning', 'error', or 'info'
 *   Defaults to 'success' if not specified
 *
 * Examples:
 * showToast('Item added to cart', 'success');
 * showToast('Please check your internet connection', 'warning');
 * showToast('Unable to complete request', 'error');
 * showToast('New update available', 'info');
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if toast container already exists
    let toastContainer = document.querySelector('.toast-container');
    
    // If no toast container exists, create one and append to body
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3 toast-container';
        
        // Create toast element
        const toastEl = document.createElement('div');
        toastEl.id = 'toast';
        toastEl.className = 'toast align-items-center text-white border-0';
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        // Create toast content
        const toastContent = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-check-circle me-2"></i>
                    <span id="toastMessage">Notification message</span>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastEl.innerHTML = toastContent;
        toastContainer.appendChild(toastEl);
        document.body.appendChild(toastContainer);
    }
    
    // Initialize toast
    const toast = new bootstrap.Toast(document.getElementById('toast'), {
        delay: 3000
    });
    
    /**
     * Shows a toast notification with the specified message and type
     * @param {string} message - The message to display
     * @param {string} type - The toast type: 'success', 'warning', 'error', or 'info'
     */
    window.showToast = function(message, type = 'success') {
        const toastEl = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        // Remove any existing color classes
        toastEl.classList.remove('bg-success', 'bg-warning', 'bg-danger', 'bg-primary');
        
        // Set the appropriate class based on the type
        switch(type) {
            case 'success':
                toastEl.classList.add('bg-success');
                // Ensure text is white for success
                if (toastEl.classList.contains('text-dark')) {
                    toastEl.classList.remove('text-dark');
                    toastEl.classList.add('text-white');
                }
                break;
            case 'warning':
                toastEl.classList.add('bg-warning');
                // Special handling for warning which may need dark text
                if (toastEl.classList.contains('text-white')) {
                    toastEl.classList.remove('text-white');
                    toastEl.classList.add('text-dark');
                }
                break;
            case 'error':
                toastEl.classList.add('bg-danger');
                // Ensure text is white for error
                if (toastEl.classList.contains('text-dark')) {
                    toastEl.classList.remove('text-dark');
                    toastEl.classList.add('text-white');
                }
                break;
            case 'info':
                toastEl.classList.add('bg-primary');
                // Ensure text is white for info
                if (toastEl.classList.contains('text-dark')) {
                    toastEl.classList.remove('text-dark');
                    toastEl.classList.add('text-white');
                }
                break;
            default:
                toastEl.classList.add('bg-success');
                // Ensure text is white for default
                if (toastEl.classList.contains('text-dark')) {
                    toastEl.classList.remove('text-dark');
                    toastEl.classList.add('text-white');
                }
        }
        
        // Set the message
        toastMessage.textContent = message;
        
        // Show the toast
        toast.show();
    };
}); 