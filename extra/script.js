document.addEventListener('DOMContentLoaded', function() {
  // Get the tab buttons
  const profileButton = document.getElementById('radix-:r0:-trigger-about');
  const blogButton = document.getElementById('radix-:r0:-trigger-blog');
  
  // Get the content sections
  const profileContent = document.getElementById('radix-:r0:-content-about');
  const blogContent = document.getElementById('radix-:r0:-content-blog');
  
  // Function to show Profile tab
  const showProfile = () => {
    // Update button states
    profileButton.setAttribute('aria-selected', 'true');
    profileButton.setAttribute('data-state', 'active');
    blogButton.setAttribute('aria-selected', 'false');
    blogButton.setAttribute('data-state', 'inactive');
    
    // Update content visibility
    profileContent.setAttribute('data-state', 'active');
    profileContent.removeAttribute('hidden');
    blogContent.setAttribute('data-state', 'inactive');
    blogContent.setAttribute('hidden', '');
    
    // Update button styling
    profileButton.classList.add('data-[state=active]:bg-background', 'data-[state=active]:text-foreground', 'data-[state=active]:shadow');
    blogButton.classList.remove('data-[state=active]:bg-background', 'data-[state=active]:text-foreground', 'data-[state=active]:shadow');
  };
  
  // Function to show Blog tab
  const showBlog = () => {
    // Update button states
    profileButton.setAttribute('aria-selected', 'false');
    profileButton.setAttribute('data-state', 'inactive');
    blogButton.setAttribute('aria-selected', 'true');
    blogButton.setAttribute('data-state', 'active');
    
    // Update content visibility
    profileContent.setAttribute('data-state', 'inactive');
    profileContent.setAttribute('hidden', '');
    blogContent.setAttribute('data-state', 'active');
    blogContent.removeAttribute('hidden');
    
    // Update button styling
    profileButton.classList.remove('data-[state=active]:bg-background', 'data-[state=active]:text-foreground', 'data-[state=active]:shadow');
    blogButton.classList.add('data-[state=active]:bg-background', 'data-[state=active]:text-foreground', 'data-[state=active]:shadow');
  };
  
  // Add click event listeners
  profileButton.addEventListener('click', showProfile);
  blogButton.addEventListener('click', showBlog);
});
