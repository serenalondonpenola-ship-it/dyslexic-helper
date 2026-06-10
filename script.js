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

function getCurrentWorkTitle() {
  const user = getCurrentUser() || 'guest';
  return localStorage.getItem(`dyslexicWorkTitle_${user}`) || '';
}

function setCurrentWorkTitle(title) {
  const user = getCurrentUser() || 'guest';
  localStorage.setItem(`dyslexicWorkTitle_${user}`, title);
}

function createDownloadLink(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  return URL.createObjectURL(blob);
}

function transformText(text) {
  if (!text) return '';
  const replacements = {
    a: 'ɑ',
    e: 'ɘ',
    i: 'ɪ',
    o: 'ɵ',
    s: 'ѕ',
    t: 'ţ',
    d: 'ԁ',
    r: 'ɾ',
    l: 'Ɩ'
  };
  return text.split('').map(char => replacements[char] || char).join('');
}

function cleanupText(text) {
  if (!text) return '';
  return text
    .replace(/\*|_/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function formatTextFor100Chars(text) {
  if (!text) return '';
  const maxLineLength = 100;
  const lines = [];
  const words = text.split(/(\s+)/);
  let currentLine = '';
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    if (word === '') continue;
    
    if (/^\s+$/.test(word)) {
      if (currentLine && !currentLine.endsWith(' ')) {
        currentLine += ' ';
      }
    } else {
      if (currentLine.length === 0) {
        currentLine = word;
      } else if (currentLine.length + word.length <= maxLineLength) {
        currentLine += word;
      } else {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = word;
      }
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines.join('\n');
}

function breakUpLargeBlocks(text) {
  if (!text) return '';
  return text
    .split(/\n{2,}/)
    .map(paragraph => {
      if (paragraph.length <= 240) return paragraph.trim();
      const sentences = paragraph.match(/[^\.\!\?]+[\.\!\?]+(?:\s|$)/g) || [paragraph];
      const groups = [];
      let current = '';
      sentences.forEach(sentence => {
        const trimmed = sentence.trim();
        if (!trimmed) return;
        if (!current) {
          current = trimmed;
        } else if ((current + ' ' + trimmed).length <= 180) {
          current += ' ' + trimmed;
        } else {
          groups.push(current);
          current = trimmed;
        }
      });
      if (current) groups.push(current);
      return groups.join('\n\n');
    })
    .join('\n\n');
}

function transformAndFormatText(text) {
  if (!text) return '';
  const cleaned = cleanupText(text);
  const broken = breakUpLargeBlocks(cleaned);
  const transformed = transformText(broken);
  return formatTextFor100Chars(transformed);
}

function getSavedFiles() {
  const user = getCurrentUser() || 'guest';
  const raw = localStorage.getItem(`dyslexicSavedFiles_${user}`);
  return raw ? JSON.parse(raw) : [];
}

function setSavedFiles(files) {
  const user = getCurrentUser() || 'guest';
  localStorage.setItem(`dyslexicSavedFiles_${user}`, JSON.stringify(files));
}

function addSavedFile(title, content) {
  const files = getSavedFiles();
  const fileTitle = title ? title.trim() : 'Untitled';
  const item = {
    id: Date.now(),
    title: fileTitle,
    content: content || '',
    savedAt: new Date().toISOString()
  };
  files.unshift(item);
  setSavedFiles(files.slice(0, 100));
  return item;
}

function renderSavedFiles() {
  const container = document.getElementById('saved-files-list');
  if (!container) return;
  const files = getSavedFiles();
  if (!files.length) {
    container.innerHTML = '<p>No saved files yet. Transform or save text on the other pages to build a list.</p>';
    return;
  }

  container.innerHTML = files.map(file => {
    const savedDate = new Date(file.savedAt).toLocaleString();
    return `
      <div class="saved-file-row">
        <div>
          <strong>${file.title}</strong>
          <div class="saved-file-meta">Saved ${savedDate}</div>
          <p class="saved-file-preview">${file.content.slice(0, 220).replace(/\n/g, ' ')}${file.content.length > 220 ? '…' : ''}</p>
        </div>
        <div class="saved-file-actions">
          <button class="edit-file-button" data-file-id="${file.id}">Edit</button>
          <a href="${createDownloadLink(file.content, `${file.title}.txt`)}" download="${file.title}.txt" class="download-button">Download</a>
        </div>
      </div>
    `;
  }).join('');
}

function openEditFileModal(fileId) {
  const files = getSavedFiles();
  const file = files.find(item => item.id === fileId);
  const modal = document.getElementById('edit-file-modal');
  const titleInput = document.getElementById('edit-file-title');
  const contentInput = document.getElementById('edit-file-content');
  const status = document.getElementById('edit-file-status');
  if (!file || !modal || !titleInput || !contentInput || !status) return;

  modal.dataset.editingId = fileId;
  titleInput.value = file.title;
  contentInput.value = file.content;
  status.textContent = '';
  modal.classList.add('show');
  titleInput.focus();
}

function saveEditedFile() {
  const modal = document.getElementById('edit-file-modal');
  const titleInput = document.getElementById('edit-file-title');
  const contentInput = document.getElementById('edit-file-content');
  const status = document.getElementById('edit-file-status');
  if (!modal || !titleInput || !contentInput || !status) return;

  const fileId = Number(modal.dataset.editingId);
  const newTitle = titleInput.value.trim() || 'Untitled';
  const newContent = contentInput.value.trim();

  if (!newContent) {
    status.textContent = 'Please enter content for the saved file.';
    return;
  }

  const files = getSavedFiles();
  const fileIndex = files.findIndex(item => item.id === fileId);
  if (fileIndex === -1) {
    status.textContent = 'Could not find the file to save.';
    return;
  }

  files[fileIndex].title = newTitle;
  files[fileIndex].content = newContent;
  files[fileIndex].savedAt = new Date().toISOString();
  setSavedFiles(files);
  renderSavedFiles();
  modal.classList.remove('show');
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

function initTitleModal() {
  const titleButton = document.getElementById('title-work-button');
  const titleModal = document.getElementById('title-modal');
  const titleInput = document.getElementById('title-input');
  const titleSaveButton = document.getElementById('title-save-button');
  const titleCancelButton = document.getElementById('title-cancel-button');
  const titleStatus = document.getElementById('title-status');

  if (!titleButton || !titleModal) return;

  titleButton.addEventListener('click', () => {
    titleInput.value = getCurrentWorkTitle();
    titleStatus.textContent = '';
    titleModal.classList.add('show');
    titleInput.focus();
  });

  titleCancelButton.addEventListener('click', () => {
    titleModal.classList.remove('show');
  });

  titleModal.addEventListener('click', (e) => {
    if (e.target === titleModal) {
      titleModal.classList.remove('show');
    }
  });

  titleSaveButton.addEventListener('click', () => {
    const title = titleInput.value.trim();
    if (!title) {
      titleStatus.textContent = 'Please enter a title.';
      return;
    }
    setCurrentWorkTitle(title);
    titleStatus.textContent = 'Title saved successfully!';
    setTimeout(() => {
      titleModal.classList.remove('show');
      titleStatus.textContent = '';
    }, 1000);
  });

  titleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      titleSaveButton.click();
    }
  });
}

function getVisualSettings() {
  const raw = localStorage.getItem('dyslexicVisualSettings');
  return raw ? JSON.parse(raw) : {
    font: 'Arial',
    letterSpacing: 0.14,
    wordSpacing: 0.17,
    bgColor: '#f7f4ef',
    textColor: '#1f1f1f',
    accentColor: '#418383'
  };
}

function setVisualSettings(settings) {
  localStorage.setItem('dyslexicVisualSettings', JSON.stringify(settings));
}

function applyVisualSettings(settings) {
  const root = document.documentElement.style;
  root.setProperty('--app-font', settings.font || 'Arial');
  root.setProperty('--letter-spacing', `${settings.letterSpacing}em`);
  root.setProperty('--word-spacing', `${settings.wordSpacing}em`);
  root.setProperty('--app-background', settings.bgColor || '#f7f4ef');
  root.setProperty('--app-foreground', settings.textColor || '#1f1f1f');
  root.setProperty('--accent-color', settings.accentColor || '#418383');
  root.setProperty('--button-background', settings.accentColor || '#476a6a');
  root.setProperty('--button-foreground', '#ffffff');
}

function initVisuals() {
  const changeButton = document.getElementById('change-visuals-button');
  const modal = document.getElementById('change-visuals-modal');
  if (!changeButton || !modal) return;

  const fontSelect = document.getElementById('visual-font-select');
  const letterInput = document.getElementById('visual-letter-spacing');
  const wordInput = document.getElementById('visual-word-spacing');
  const bgInput = document.getElementById('visual-bg-color');
  const textInput = document.getElementById('visual-text-color');
  const accentInput = document.getElementById('visual-accent-color');
  const saveButton = document.getElementById('visual-save-button');
  const cancelButton = document.getElementById('visual-cancel-button');
  const letterValue = document.getElementById('letter-spacing-value');
  const wordValue = document.getElementById('word-spacing-value');

  let settings = getVisualSettings();
  applyVisualSettings(settings);

  function updateFields(values) {
    fontSelect.value = values.font;
    letterInput.value = values.letterSpacing;
    wordInput.value = values.wordSpacing;
    bgInput.value = values.bgColor;
    textInput.value = values.textColor;
    accentInput.value = values.accentColor;
    letterValue.textContent = `${values.letterSpacing}em`;
    wordValue.textContent = `${values.wordSpacing}em`;
  }

  function updatePreview() {
    const previewSettings = {
      font: fontSelect.value,
      letterSpacing: parseFloat(letterInput.value),
      wordSpacing: parseFloat(wordInput.value),
      bgColor: bgInput.value,
      textColor: textInput.value,
      accentColor: accentInput.value
    };
    applyVisualSettings(previewSettings);
    letterValue.textContent = `${previewSettings.letterSpacing.toFixed(2)}em`;
    wordValue.textContent = `${previewSettings.wordSpacing.toFixed(2)}em`;
  }

  changeButton.addEventListener('click', () => {
    updateFields(settings);
    modal.classList.add('show');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
      applyVisualSettings(settings);
    }
  });

  [fontSelect, letterInput, wordInput, bgInput, textInput, accentInput].forEach(element => {
    element.addEventListener('input', updatePreview);
  });

  saveButton.addEventListener('click', () => {
    const newSettings = {
      font: fontSelect.value,
      letterSpacing: parseFloat(letterInput.value),
      wordSpacing: parseFloat(wordInput.value),
      bgColor: bgInput.value,
      textColor: textInput.value,
      accentColor: accentInput.value
    };
    settings = newSettings;
    setVisualSettings(newSettings);
    modal.classList.remove('show');
  });

  cancelButton.addEventListener('click', () => {
    modal.classList.remove('show');
    applyVisualSettings(settings);
  });
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
  initTitleModal();
  const dropZone = document.getElementById('file-drop-zone');
  const fileInput = document.getElementById('file-input');
  const output = document.getElementById('file-output');
  const status = document.getElementById('file-status');
  const downloadLink = document.getElementById('file-download');

  function handleFile(file) {
    if (!file.type && !file.name.endsWith('.txt')) {
      status.textContent = 'Please use a plain text (.txt) file.';
      downloadLink.hidden = true;
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const fileText = reader.result;
      const formatted = transformAndFormatText(fileText);
      output.value = formatted;
      output.classList.add('transformed-output');
      const title = getCurrentWorkTitle();
      const filename = title ? `${title}.txt` : 'transformed-text.txt';
      downloadLink.href = createDownloadLink(formatted, filename);
      downloadLink.download = filename;
      downloadLink.hidden = false;
      status.textContent = `File loaded and transformed: ${file.name}`;
      if (formatted) {
        addSavedFile(title, formatted);
      }
    };
    reader.onerror = () => {
      status.textContent = 'Error reading file. Please try again.';
    };
    reader.readAsText(file);
  }

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });
}

function initPastePage() {
  showUserPanel('paste-user-panel');
  initTitleModal();
  const input = document.getElementById('paste-input');
  const status = document.getElementById('paste-status');
  const downloadLink = document.getElementById('paste-download');
  let transformTimeout;

  function applyTransform() {
    const original = input.value;
    if (!original.trim()) {
      downloadLink.hidden = true;
      return;
    }
    const formatted = transformAndFormatText(original);
    input.value = formatted;
    input.classList.add('formatted-paste-text');
    input.style.cssText = `
      font-family: 'Aria', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      letter-spacing: 0.15em;
      word-spacing: 0.19em;
      text-align: left;
    `;
    const title = getCurrentWorkTitle();
    const filename = title ? `${title}.txt` : 'transformed-text.txt';
    downloadLink.href = createDownloadLink(formatted, filename);
    downloadLink.download = filename;
    downloadLink.hidden = false;
    status.textContent = 'Text is being formatted for readability.';
    setTimeout(() => { status.textContent = ''; }, 2000);
  }

  input.addEventListener('input', () => {
    clearTimeout(transformTimeout);
    transformTimeout = setTimeout(applyTransform, 800);
  });

  input.addEventListener('paste', () => {
    clearTimeout(transformTimeout);
    setTimeout(applyTransform, 50);
  });
}

function getCurrentFont() {
  const user = getCurrentUser() || 'guest';
  return localStorage.getItem(`dyslexicFont_${user}`) || 'Arial';
}

function setCurrentFont(fontName) {
  const user = getCurrentUser() || 'guest';
  localStorage.setItem(`dyslexicFont_${user}`, fontName);
}

function initWritePage() {
  showUserPanel('write-user-panel');
  // show simple signed-in name in the left controls (if present)
  const writeNameEl = document.getElementById('write-username');
  if (writeNameEl) writeNameEl.textContent = getCurrentUser() || 'Guest';
  initTitleModal();
  const sheet = document.getElementById('blank-sheet');
  const saveButton = document.getElementById('save-button');
  const status = document.getElementById('write-status');
  const downloadLink = document.getElementById('write-download');
  const changeFontButton = document.getElementById('change-font-button');
  const fontSelectorModal = document.getElementById('font-selector-modal');

  const saved = loadWriting();
  if (saved) {
    sheet.textContent = saved;
  }

  const currentFont = getCurrentFont();
  sheet.style.fontFamily = currentFont;

  changeFontButton.addEventListener('click', () => {
    fontSelectorModal.classList.add('show');
  });

  fontSelectorModal.addEventListener('click', (e) => {
    if (e.target === fontSelectorModal) {
      fontSelectorModal.classList.remove('show');
    }
  });

  const fontOptions = document.querySelectorAll('.font-option');
  fontOptions.forEach(option => {
    const optionFont = option.getAttribute('data-font');
    if (optionFont === currentFont) {
      option.classList.add('active');
    }
    option.addEventListener('click', () => {
      fontOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      sheet.style.fontFamily = optionFont;
      setCurrentFont(optionFont);
      fontSelectorModal.classList.remove('show');
      status.textContent = `Font changed to ${option.textContent}`;
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
  });

  saveButton.addEventListener('click', () => {
    const text = sheet.textContent.trim();
    if (!text) {
      status.textContent = 'Write something on the sheet before saving.';
      return;
    }
    saveWriting(text);
    const title = getCurrentWorkTitle();
    const filename = title ? `${title}.txt` : (getCurrentUser() ? `${getCurrentUser()}-writing.txt` : 'guest-writing.txt');
    downloadLink.href = createDownloadLink(text, filename);
    downloadLink.download = filename;
    downloadLink.hidden = false;
    addSavedFile(title, text);
    status.textContent = 'Your work is saved in the app and ready to download.';
  });
}

function initSavedFilesPage() {
  showUserPanel('saved-user-panel');
  initTitleModal();
  renderSavedFiles();

  const editModal = document.getElementById('edit-file-modal');
  const editSaveButton = document.getElementById('edit-file-save-button');
  const editCancelButton = document.getElementById('edit-file-cancel-button');
  const editTitle = document.getElementById('edit-file-title');
  const editContent = document.getElementById('edit-file-content');

  if (editSaveButton) {
    editSaveButton.addEventListener('click', saveEditedFile);
  }

  if (editCancelButton && editModal) {
    editCancelButton.addEventListener('click', () => editModal.classList.remove('show'));
    editModal.addEventListener('click', event => {
      if (event.target === editModal) {
        editModal.classList.remove('show');
      }
    });
  }

  document.getElementById('saved-files-list')?.addEventListener('click', event => {
    const target = event.target;
    if (target instanceof HTMLElement && target.matches('.edit-file-button')) {
      const fileId = Number(target.dataset.fileId);
      openEditFileModal(fileId);
    }
  });

  if (editTitle) {
    editTitle.addEventListener('keypress', event => {
      if (event.key === 'Enter') {
        saveEditedFile();
      }
    });
  }
}

function initPage() {
  const page = document.body.dataset.page || '';
  if (document.getElementById('login-form')) {
    initLoginPage();
  }
  if (document.getElementById('change-visuals-button')) {
    initVisuals();
  }
  if (document.getElementById('home-saved-section')) {
    initHomePage();
  }
  if (document.getElementById('file-drop-zone')) {
    initUploadPage();
  }
  if (document.getElementById('paste-input')) {
    initPastePage();
  }
  if (document.getElementById('saved-files-list')) {
    initSavedFilesPage();
  }
  if (document.getElementById('save-button')) {
    initWritePage();
  }
}

window.addEventListener('DOMContentLoaded', initPage);
