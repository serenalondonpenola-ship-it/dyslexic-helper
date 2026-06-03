function getUsers() {
  const raw = localStorage.getItem('dyslexicUsers');
  return raw ? JSON.parse(raw) : {};
}

function setUsers(users) {
  localStorage.setItem('dyslexicUsers', JSON.stringify(users));
}

function getCurrentUser() {
  return localStorage.getItem('currentDyslexicUser') || '';
}

function setCurrentUser(username) {
  localStorage.setItem('currentDyslexicUser', username);
}

function clearCurrentUser() {
  localStorage.removeItem('currentDyslexicUser');
}

function createDownloadLink(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  return URL.createObjectURL(blob);
}

function transformText(text) {
  if (!text) return '';
  const replacements = {
    a: 'ɑ',
    A: 'Α',
    e: 'ɘ',
    E: 'Ǝ',
    i: 'ɪ',
    I: 'Ι',
    o: 'ɵ',
    O: 'Ο',
    s: 'ѕ',
    S: 'Ѕ',
    t: 'ţ',
    T: 'Ŧ',
    d: 'ԁ',
    D: 'Ɗ',
    r: 'ɾ',
    R: 'Ɍ',
    l: 'Ɩ',
    L: 'Ł'
  };
  return text.split('').map(char => replacements[char] || char).join('');
}

function showUserPanel(elementId) {
  const user = getCurrentUser();
  const element = document.getElementById(elementId);
  if (!element) return;
  if (user) {
    element.innerHTML = `Signed in as <strong>${user}</strong>. <button class="inline-logout" id="logout-button">Logout</button>`;
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        clearCurrentUser();
        window.location.href = 'login.html';
      });
    }
  } else {
    element.innerHTML = '<span>You are not signed in. Login to save your work to your account.</span>';
  }
}

function initLoginPage() {
  const form = document.getElementById('login-form');
  const status = document.getElementById('login-status');
  showUserPanel('login-user-panel');

  form.addEventListener('submit', event => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) {
      status.textContent = 'Please enter both username and password.';
      return;
    }

    const users = getUsers();
    if (users[username]) {
      if (users[username] === password) {
        setCurrentUser(username);
        status.textContent = 'Login successful. Redirecting to home...';
        setTimeout(() => window.location.href = 'index.html', 800);
      } else {
        status.textContent = 'Password is incorrect. Please try again.';
      }
    } else {
      users[username] = password;
      setUsers(users);
      setCurrentUser(username);
      status.textContent = 'Account created and logged in successfully. Redirecting to home...';
      setTimeout(() => window.location.href = 'index.html', 800);
    }
  });
}

function saveWriting(text) {
  const user = getCurrentUser() || 'guest';
  localStorage.setItem(`dyslexicWrite_${user}`, text);
}

function loadWriting() {
  const user = getCurrentUser() || 'guest';
  return localStorage.getItem(`dyslexicWrite_${user}`) || '';
}

function initHomePage() {
  showUserPanel('home-user-panel');
  const savedSection = document.getElementById('saved-work-content');
  if (!savedSection) return;
  const saved = loadWriting();
  if (saved) {
    const preview = saved.length > 400 ? saved.slice(0, 400) + '…' : saved;
    savedSection.innerHTML = `<p><strong>Your latest saved writing</strong></p><pre>${preview}</pre>`;
  } else {
    savedSection.innerHTML = '<p>No saved writing found yet. Sign in and write something on the Write page.</p>';
  }
}

function initUploadPage() {
  showUserPanel('upload-user-panel');
  const fileInput = document.getElementById('file-input');
  const transformButton = document.getElementById('file-transform-button');
  const output = document.getElementById('file-output');
  const status = document.getElementById('file-status');
  const downloadLink = document.getElementById('file-download');
  let fileText = '';

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!file.type && !file.name.endsWith('.txt')) {
      status.textContent = 'Please upload a plain text (.txt) file.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      fileText = reader.result;
      status.textContent = `Loaded file: ${file.name}`;
      output.value = '';
      downloadLink.hidden = true;
    };
    reader.readAsText(file);
  });

  transformButton.addEventListener('click', () => {
    const text = fileText || output.value;
    if (!text) {
      status.textContent = 'Upload a file or paste text before transforming.';
      return;
    }
    const transformed = transformText(text);
    output.value = transformed;
    downloadLink.href = createDownloadLink(transformed, 'transformed-text.txt');
    downloadLink.download = 'transformed-text.txt';
    downloadLink.hidden = false;
    status.textContent = 'Transformed text ready. You can download it or copy it.';
  });
}

function initPastePage() {
  showUserPanel('paste-user-panel');
  const input = document.getElementById('paste-input');
  const button = document.getElementById('paste-transform-button');
  const output = document.getElementById('paste-output');
  const status = document.getElementById('paste-status');
  const downloadLink = document.getElementById('paste-download');

  button.addEventListener('click', () => {
    const original = input.value.trim();
    if (!original) {
      status.textContent = 'Please paste some text to transform.';
      return;
    }
    const transformed = transformText(original);
    output.value = transformed;
    downloadLink.href = createDownloadLink(transformed, 'transformed-text.txt');
    downloadLink.download = 'transformed-text.txt';
    downloadLink.hidden = false;
    status.textContent = 'Text transformed successfully. Download if you want.';
  });
}

function initWritePage() {
  showUserPanel('write-user-panel');
  const sheet = document.getElementById('blank-sheet');
  const saveButton = document.getElementById('save-button');
  const status = document.getElementById('write-status');
  const downloadLink = document.getElementById('write-download');

  const saved = loadWriting();
  if (saved) {
    sheet.textContent = saved;
  }

  saveButton.addEventListener('click', () => {
    const text = sheet.textContent.trim();
    if (!text) {
      status.textContent = 'Write something on the sheet before saving.';
      return;
    }
    saveWriting(text);
    const filename = getCurrentUser() ? `${getCurrentUser()}-writing.txt` : 'guest-writing.txt';
    downloadLink.href = createDownloadLink(text, filename);
    downloadLink.download = filename;
    downloadLink.hidden = false;
    status.textContent = 'Your work is saved in the app and ready to download.';
  });
}

function initPage() {
  const page = document.body.dataset.page || '';
  if (document.getElementById('login-form')) {
    initLoginPage();
  }
  if (document.getElementById('home-saved-section')) {
    initHomePage();
  }
  if (document.getElementById('file-transform-button')) {
    initUploadPage();
  }
  if (document.getElementById('paste-transform-button')) {
    initPastePage();
  }
  if (document.getElementById('save-button')) {
    initWritePage();
  }
}

window.addEventListener('DOMContentLoaded', initPage);
