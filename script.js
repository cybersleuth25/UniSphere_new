const AUTH_KEY = 'unisphere_auth';
let currentUser = { username: null, email: null, role: null, avatarSeed: null, avatar_path: null };
const imagePreviewModal = document.getElementById('imagePreviewModal');
const fullSizeImage = document.getElementById('fullSizeImage');

function getAuthInfo() {
  try {
    const authInfo = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
    return {
      username: authInfo.username || null, email: authInfo.email || null,
      role: authInfo.role || null, avatarSeed: authInfo.avatarSeed || authInfo.username,
      avatar_path: authInfo.avatar_path || null
    };
  } catch (e) { return { username: null, email: null, role: null, avatarSeed: null, avatar_path: null }; }
}

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

function generateAvatarUrl(username, seed) {
    const seedValue = seed || username;
    return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(seedValue)}`;
}
function getAvatarDisplayUrl(user) {
    if (user.avatar_path) return `${user.avatar_path}?t=${new Date().getTime()}`;
    return generateAvatarUrl(user.username, user.avatarSeed);
}
const tabs = document.querySelectorAll('.tab');
const contentArea = document.getElementById('contentArea');
const searchInput = document.getElementById('searchInput');

function setActiveTab(tabName) {
  if (!tabs) return;
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  fetchPostsAndRender(tabName);
}

function fetchPostsAndRender(tab) {
  if (!contentArea) return;
  let skeletonHTML = '';
  for (let i = 0; i < 4; i++) {
      skeletonHTML += `<div class="skeleton-card"><div class="skeleton-thumb"></div><div style="flex:1;"><div class="skeleton-text"></div><div class="skeleton-text short"></div></div></div>`;
  }
  contentArea.innerHTML = `<div class="cards">${skeletonHTML}</div>`;
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const url = `api.php?postType=${tab}${query ? '&search=' + encodeURIComponent(query) : ''}`;

  setTimeout(() => {
    fetch(url)
      .then(response => response.json())
      .then(allPosts => {
        if (allPosts.length === 0) {
          contentArea.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No posts found.</p>';
          return;
        }
        const cardsHTML = allPosts.map(x => {
            const isAuthor = currentUser.email && x.author === currentUser.email;
            const isAdmin = currentUser.role === 'admin';
            const showEditDelete = isAdmin || isAuthor;
            const imageHtml = x.image ? `<div class="thumb image" style="background-image: url('${x.image}')"></div>` : `<div class="thumb">${x.postType.slice(0, 3).toUpperCase()}</div>`;
            const descriptionHtml = marked.parse(x.description);

            return `<article class="card ${x.postType}" data-post-id="${x.id}" data-post-raw='${JSON.stringify(x)}'>
                ${imageHtml}
                <div class="card-content">
                    <h3>${x.title}</h3>
                    <div class="description-wrapper">
                        <div class="card-description">${descriptionHtml}</div>
                        <button class="read-more-btn">Read More</button>
                    </div>
                    <div class="post-meta">
                        <button class="like-btn" data-post-id="${x.id}"><i class="fas fa-thumbs-up"></i> <span class="like-count">${x.likes || 0}</span></button>
                    </div>
                    ${showEditDelete ? `<div class="actions"><button class="btn secondary edit-btn">Edit</button><button class="btn secondary delete-btn">Delete</button></div>` : ''}
                </div>
            </article>`;
        }).join('');
        contentArea.innerHTML = `<div class="cards">${cardsHTML}</div>`;

        document.querySelectorAll('.card').forEach(card => {
            const description = card.querySelector('.card-description');
            const readMoreBtn = card.querySelector('.read-more-btn');

            if (description.scrollHeight > description.clientHeight) {
                readMoreBtn.style.display = 'block';
            }

            readMoreBtn.addEventListener('click', () => {
                description.classList.toggle('expanded');
                if (description.classList.contains('expanded')) {
                    readMoreBtn.textContent = 'Read Less';
                } else {
                    readMoreBtn.textContent = 'Read More';
                }
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditClick));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClick));
        document.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', handleLikeClick));
        document.querySelectorAll('.thumb.image').forEach(thumb => {
          thumb.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            const postData = JSON.parse(card.dataset.postRaw);
            if (postData.image && imagePreviewModal) {
              fullSizeImage.src = postData.image;
              imagePreviewModal.classList.add('show');
            }
          });
        });
      });
  }, 500);
}

function handleLikeClick(e) {
    const btn = e.currentTarget;
    const postId = btn.dataset.postId;
    const formData = new FormData();
    formData.append('likePostId', postId);
    fetch('api.php', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                btn.querySelector('.like-count').textContent = data.likes;
            }
        });
}


const postModal = document.getElementById('postModal');
function handleEditClick(e) {
    const card = e.target.closest('.card'); const postData = JSON.parse(card.dataset.postRaw);
    document.getElementById('postId').value = postData.id; document.getElementById('postType').value = postData.postType;
    document.getElementById('postTitle').value = postData.title; document.getElementById('postDesc').value = postData.description;
    document.querySelector('#postModal h2').textContent = 'Edit Post'; if(postModal) postModal.classList.add('show');
}
function handleDeleteClick(e) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    const card = e.target.closest('.card'); const postId = card.dataset.postId;
    fetch(`api.php?id=${postId}`, { method: 'DELETE' }).then(res => res.json()).then(data => {
        if (data.success) { const activeTab = document.querySelector('.tab.active')?.dataset.tab; if (activeTab) fetchPostsAndRender(activeTab); }
        else { alert(data.message || 'Failed to delete post.'); }
    });
}
if (postModal) {
    const postForm = document.getElementById('postForm');
    postForm.addEventListener('submit', e => {
        e.preventDefault(); const postId = document.getElementById('postId').value; const isUpdate = !!postId;
        if (!isUpdate) {
            const formData = new FormData(postForm);
            fetch('api.php', { method: 'POST', body: formData }).then(res => res.json()).then(data => {
                if (data.success) { postModal.classList.remove('show'); const activeTab = document.querySelector('.tab.active')?.dataset.tab || formData.get('postType'); fetchPostsAndRender(activeTab); }
                else { alert(data.message || 'An error occurred.'); }
            });
        } else {
            const postData = { id: postId, title: document.getElementById('postTitle').value, description: document.getElementById('postDesc').value };
            fetch('api.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postData) }).then(res => res.json()).then(data => {
                if (data.success) { postModal.classList.remove('show'); const activeTab = document.querySelector('.tab.active')?.dataset.tab; if (activeTab) fetchPostsAndRender(activeTab); }
                else { alert(data.message || 'An error occurred.'); }
            });
        }
    });
    document.querySelector('.close-btn')?.addEventListener('click', () => postModal.classList.remove('show'));
}
if (imagePreviewModal) {
    imagePreviewModal.querySelector('.close-btn').addEventListener('click', () => imagePreviewModal.classList.remove('show'));
    imagePreviewModal.addEventListener('click', (e) => {
        if (e.target === imagePreviewModal) {
            imagePreviewModal.classList.remove('show');
        }
    });
}
const themeToggleCheckbox = document.getElementById('checkbox');
const body = document.body;
function toggleTheme() {
  body.classList.toggle('light-theme'); const isLight = body.classList.contains('light-theme');
  localStorage.setItem('unisphere_theme', isLight ? 'light' : 'dark');
  if (window.pJSDom && window.pJSDom.length > 0) {
    window.pJSDom[0].pJS.fn.vendors.destroypJS();
    window.pJSDom = [];
  }
  loadParticles();
}
if (themeToggleCheckbox) themeToggleCheckbox.addEventListener('change', toggleTheme);
const savedTheme = localStorage.getItem('unisphere_theme');
if (savedTheme === 'light') { body.classList.add('light-theme'); if (themeToggleCheckbox) themeToggleCheckbox.checked = true; }

function checkLoginStatus() {
  currentUser = getAuthInfo(); const isLoggedIn = !!currentUser.username;
  const authButtonsContainer = document.getElementById('auth-buttons');
  const addPostBtn = document.getElementById('addPostBtn');
  const sidebarButtons = document.querySelectorAll('.sidebar .student-post, .sidebar .admin-only-post');
  const welcomeMessage = document.getElementById('welcomeMessage');

  if (authButtonsContainer) {
    if (isLoggedIn) {
        const avatarUrl = getAvatarDisplayUrl(currentUser);
        authButtonsContainer.innerHTML = `<button id="profileBtn" class="profile-btn-icon" title="Profile"><img src="${avatarUrl}" alt="Profile"></button>`;
        document.getElementById('profileBtn').addEventListener('click', () => window.location.href = 'profile.php');
        if (addPostBtn) addPostBtn.style.display = 'block';
        if (welcomeMessage) welcomeMessage.textContent = `Hello, ${currentUser.username}!`;
        sidebarButtons.forEach(btn => {
            if (currentUser.role === 'admin') btn.style.display = 'block';
            else { if (btn.classList.contains('admin-only-post')) btn.style.display = 'none'; else btn.style.display = 'block'; }
        });
    } else {
        authButtonsContainer.innerHTML = `<button id="loginBtn" class="btn secondary">Login</button><a href="signup.html" class="btn">Sign Up</a>`;
        const loginBtn = document.getElementById('loginBtn'); if (loginBtn) loginBtn.addEventListener('click', () => window.location.href = 'login.html');
        if (addPostBtn) addPostBtn.style.display = 'none';
        if (welcomeMessage) welcomeMessage.textContent = 'Welcome to UniSphere';
        sidebarButtons.forEach(btn => btn.style.display = 'none');
    }
  }
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); const formData = new FormData(loginForm);
    fetch('login.php', { method: 'POST', body: formData }).then(response => response.json()).then(data => {
        if (data.success) { 
            localStorage.setItem(AUTH_KEY, JSON.stringify(data.user)); 
            showToast(data.message);
            setTimeout(() => {
                window.location.href = 'index.html'; 
            }, 1000);
        }
        else { alert(data.message); }
    });
  });
}

const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault(); const formData = new FormData(signupForm);
    fetch('signup.php', { method: 'POST', body: formData }).then(response => response.json()).then(data => {
        if (data.success) { localStorage.setItem(AUTH_KEY, JSON.stringify(data.user)); showToast(data.message); setTimeout(() => { window.location.href = 'index.html'; }, 1000); }
        else { alert(data.message); }
    });
  });
}
function loadParticles() {
  const isLight = document.body.classList.contains('light-theme');
  const config = isLight ? 'particles-config-light.js' : 'particles-config.js';
  let particlesContainer = document.getElementById('particles-js');
  if (!particlesContainer) {
    particlesContainer = document.createElement('div');
    particlesContainer.id = 'particles-js';
    document.body.prepend(particlesContainer);
  }
  const particleScript = document.createElement('script');
  particleScript.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
  particleScript.onload = () => {
    const configScript = document.createElement('script');
    configScript.src = config;
    document.body.appendChild(configScript);
  };
  document.body.appendChild(particleScript);
}
function loadFooter() {
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (footerPlaceholder) {
    fetch('footer.php')
      .then(response => response.text())
      .then(data => {
        footerPlaceholder.innerHTML = data;
      });
  }
}

function renderGlobalSearchResults(data) {
    let resultsHTML = '<h2>Search Results</h2>';
    if (data.posts.length > 0) {
        resultsHTML += '<h3>Posts</h3><div class="cards">';
        data.posts.forEach(post => {
            resultsHTML += `<article class="card"><div class="card-content"><h3>${post.title}</h3><p class="card-description">${post.description}</p></div></article>`;
        });
        resultsHTML += '</div>';
    }
    if (data.users.length > 0) {
        resultsHTML += '<h3>Users</h3><div class="cards">';
        data.users.forEach(user => {
            const avatarUrl = user.avatar_path ? user.avatar_path : generateAvatarUrl(user.username);
            resultsHTML += `<article class="card"><div class="thumb image" style="background-image: url('${avatarUrl}')"></div><div class="card-content"><h3><a href="profile.php?username=${user.username}">${user.username}</a></h3><p class="card-description">${user.bio || ''}</p></div></article>`;
        });
        resultsHTML += '</div>';
    }
    if (data.posts.length === 0 && data.users.length === 0) {
        resultsHTML += '<p>No results found.</p>';
    }
    contentArea.innerHTML = resultsHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    loadFooter();
    checkLoginStatus();
    loadParticles();
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === '' || currentPage === 'index.html') {
        setActiveTab('announcements');
        if (tabs) tabs.forEach(t => t.addEventListener('click', () => setActiveTab(t.dataset.tab)));
        if (searchInput) { 
            const debouncedSearch = debounce(() => {
                const query = searchInput.value.trim();
                if (query.length > 2) {
                    fetch(`api.php?globalSearch=${encodeURIComponent(query)}`)
                        .then(response => response.json())
                        .then(data => renderGlobalSearchResults(data));
                } else {
                    const activeTab = document.querySelector('.tab.active')?.dataset.tab;
                    if (activeTab) fetchPostsAndRender(activeTab);
                }
            }, 300);
            searchInput.addEventListener('input', debouncedSearch);
        }
        
        const addPostBtn = document.getElementById('addPostBtn');
        if(addPostBtn) {
            addPostBtn.addEventListener('click', () => {
                const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'announcements';
                document.getElementById('postForm').reset();
                document.getElementById('postId').value = '';
                document.getElementById('postType').value = activeTab;
                document.querySelector('#postModal h2').textContent = `Create New ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`;
                if(postModal) postModal.classList.add('show');
            });
        }
        
        const sidebarBtns = document.querySelectorAll('.sidebar .btn.secondary');
        sidebarBtns.forEach(button => {
            button.addEventListener('click', (e) => {
                const postType = e.target.dataset.postType;
                document.getElementById('postForm').reset(); document.getElementById('postId').value = '';
                document.getElementById('postType').value = postType;
                document.querySelector('#postModal h2').textContent = `Create New ${postType.charAt(0).toUpperCase() + postType.slice(1)}`;
                if (postModal) postModal.classList.add('show');
            });
        });
    }

    if (currentPage === 'profile.php' && typeof serverData !== 'undefined') {
        const avatarImg = document.getElementById('profileAvatarImg');
        const uploadBtn = document.getElementById('uploadAvatarBtn');
        const changeBtn = document.getElementById('changeAvatarBtn');
        const fileInput = document.getElementById('avatarUploadInput');
        const editProfileBtn = document.getElementById('editProfileBtn');
        const editProfileModal = document.getElementById('editProfileModal');
        const editProfileForm = document.getElementById('editProfileForm');
        
        const user = serverData.user;
        avatarImg.src = getAvatarDisplayUrl(user);

        if(serverData.isOwnProfile) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', () => {
                const file = fileInput.files[0]; if (!file) return;
                const formData = new FormData(); formData.append('avatar', file);
                fetch('upload-avatar.php', { method: 'POST', body: formData }).then(res => res.json()).then(data => {
                    if (data.success) {
                        let authUser = getAuthInfo(); 
                        authUser.avatar_path = data.filepath;
                        localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
                        avatarImg.src = getAvatarDisplayUrl(authUser);
                    } else { alert(data.message); }
                });
            });

            changeBtn.addEventListener('click', () => {
                let authUser = getAuthInfo(); const newSeed = Date.now().toString();
                authUser.avatarSeed = newSeed; authUser.avatar_path = null;
                localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
                avatarImg.src = generateAvatarUrl(authUser.username, newSeed);
            });

            editProfileBtn.addEventListener('click', () => {
                const authUser = getAuthInfo();
                editProfileForm.querySelector('#username').value = authUser.username;
                editProfileForm.querySelector('#email').value = authUser.email;
                editProfileForm.querySelector('#bio').value = authUser.bio || '';
                editProfileModal.classList.add('show');
            });

            editProfileModal.querySelector('.close-btn').addEventListener('click', () => editProfileModal.classList.remove('show'));

            editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault(); const formData = new FormData(editProfileForm);
                fetch('update-profile.php', { method: 'POST', body: formData }).then(res => res.json()).then(data => {
                    if (data.success) {
                        localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
                        document.getElementById('welcomeHeading').textContent = data.user.username;
                        document.getElementById('emailSubheading').textContent = data.user.email;
                        editProfileModal.classList.remove('show');
                        showToast(data.message);
                    } else { alert(data.message); }
                });
            });
        }
    }
});

window.addEventListener('storage', (event) => {
    if (event.key === AUTH_KEY) {
        checkLoginStatus();
    }
});

const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(forgotPasswordForm);
    fetch('forgot-password.php', { method: 'POST', body: formData })
      .then(response => response.json())
      .then(data => {
        alert(data.message);
      })
      .catch(error => {
        alert("An error occurred. Please try again.");
      });
  });
}