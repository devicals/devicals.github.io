document.addEventListener('DOMContentLoaded', function() {
  const profileButton = document.getElementById('radix-:r0:-trigger-about');
  const blogButton = document.getElementById('radix-:r0:-trigger-blog');
  const profileContent = document.getElementById('radix-:r0:-content-about');
  const blogContent = document.getElementById('radix-:r0:-content-blog');
  const showProfile = () => {
    profileButton.setAttribute('aria-selected', 'true');
    profileButton.setAttribute('data-state', 'active');
    blogButton.setAttribute('aria-selected', 'false');
    blogButton.setAttribute('data-state', 'inactive');
    profileContent.setAttribute('data-state', 'active');
    profileContent.removeAttribute('hidden');
    blogContent.setAttribute('data-state', 'inactive');
    blogContent.setAttribute('hidden', '');
    profileButton.classList.add('data-[state=active]:bg-background', 'data-[state=active]:text-foreground', 'data-[state=active]:shadow');
    blogButton.classList.remove('data-[state=active]:bg-background', 'data-[state=active]:text-foreground', 'data-[state=active]:shadow');
  };
  const showBlog = () => {
    profileButton.setAttribute('aria-selected', 'false');
    profileButton.setAttribute('data-state', 'inactive');
    blogButton.setAttribute('aria-selected', 'true');
    blogButton.setAttribute('data-state', 'active');
    profileContent.setAttribute('data-state', 'inactive');
    profileContent.setAttribute('hidden', '');
    blogContent.setAttribute('data-state', 'active');
    blogContent.removeAttribute('hidden');
    profileButton.classList.remove('data-[state=active]:bg-background', 'data-[state=active]:text-foreground', 'data-[state=active]:shadow');
    blogButton.classList.add('data-[state=active]:bg-background', 'data-[state=active]:text-foreground', 'data-[state=active]:shadow');
  };
  profileButton.addEventListener('click', showProfile);
  blogButton.addEventListener('click', showBlog);
});