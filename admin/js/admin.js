/**
 * Bazar Dor Admin Panel JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Toggle sidebar on mobile
    const toggleSidebarBtn = document.querySelector('.toggle-sidebar-btn');
    const adminSidebar = document.querySelector('.admin-sidebar');
    
    if (toggleSidebarBtn && adminSidebar) {
        toggleSidebarBtn.addEventListener('click', function() {
            adminSidebar.classList.toggle('active');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            const isClickInside = adminSidebar.contains(event.target) || 
                                 toggleSidebarBtn.contains(event.target);
            
            if (!isClickInside && window.innerWidth < 992 && 
                adminSidebar.classList.contains('active')) {
                adminSidebar.classList.remove('active');
            }
        });
    }
    
    // Admin dropdown toggle functionality
    const adminDropdownToggle = document.querySelector('.admin-dropdown-toggle');
    if (adminDropdownToggle) {
        adminDropdownToggle.addEventListener('click', function() {
            const dropdownContent = document.createElement('div');
            dropdownContent.className = 'admin-dropdown-content';
            
            // Check if dropdown is already open
            const existingDropdown = document.querySelector('.admin-dropdown-content');
            if (existingDropdown) {
                existingDropdown.remove();
                return;
            }
            
            // Create dropdown content
            dropdownContent.innerHTML = `
                <ul>
                    <li><a href="profile.html"><i class="bi bi-person"></i> Profile</a></li>
                    <li><a href="settings.html"><i class="bi bi-gear"></i> Settings</a></li>
                    <li><a href="../../index.html"><i class="bi bi-box-arrow-right"></i> Logout</a></li>
                </ul>
            `;
            
            // Position and show dropdown
            const adminDropdown = document.querySelector('.admin-dropdown');
            adminDropdown.appendChild(dropdownContent);
            
            // Add styles for dropdown
            const dropdownStyles = `
                .admin-dropdown {
                    position: relative;
                }
                .admin-dropdown-content {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background-color: white;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                    border-radius: 5px;
                    width: 180px;
                    z-index: 1000;
                    margin-top: 5px;
                }
                .admin-dropdown-content ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .admin-dropdown-content li {
                    border-bottom: 1px solid #f0f0f0;
                }
                .admin-dropdown-content li:last-child {
                    border-bottom: none;
                }
                .admin-dropdown-content a {
                    display: flex;
                    align-items: center;
                    padding: 10px 15px;
                    color: #333;
                    text-decoration: none;
                    transition: background-color 0.2s;
                }
                .admin-dropdown-content a:hover {
                    background-color: #f8f9fa;
                }
                .admin-dropdown-content i {
                    margin-right: 10px;
                    font-size: 1rem;
                }
            `;
            
            // Add styles to document if not already added
            if (!document.getElementById('admin-dropdown-styles')) {
                const styleElement = document.createElement('style');
                styleElement.id = 'admin-dropdown-styles';
                styleElement.textContent = dropdownStyles;
                document.head.appendChild(styleElement);
            }
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function closeDropdown(e) {
                if (!adminDropdown.contains(e.target)) {
                    const dropdownContent = document.querySelector('.admin-dropdown-content');
                    if (dropdownContent) {
                        dropdownContent.remove();
                    }
                    document.removeEventListener('click', closeDropdown);
                }
            });
        });
    }
    
    // Initialize tooltips if Bootstrap is loaded
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function(tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    // Handle responsive behavior
    function handleResponsive() {
        if (window.innerWidth < 992) {
            adminSidebar.classList.remove('active');
        }
    }
    
    window.addEventListener('resize', handleResponsive);
    
    // Notification badge behavior
    const notificationLink = document.querySelector('.admin-notification');
    if (notificationLink) {
        notificationLink.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Notifications feature coming soon!');
        });
    }
    
    // Add animation to stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100);
        }, index * 100);
    });
}); 