// ============================================
// HACKNOTE - Project Management System
// ============================================

class HackNote {
  constructor() {
    // Data
    this.workspaces = [];
    this.pages = [];
    this.currentWorkspace = null;
    this.currentPage = null;

    // Settings
    this.settings = {
      accentColor: '#00ff9d',
      enableGlow: true
    };

    // State
    this.contextMenuTarget = null;
    this.editingCard = null;
    this.draggedCard = null;

    // Initialize
    this.init();
  }

  init() {
    this.loadData();
    this.bindEvents();
    this.renderSidebar();
    this.updateStats();
    this.applySettings();

    console.log('%c[HACKNOTE] System initialized', 'color: #00ff9d');
  }

  // ============================================
  // DATA PERSISTENCE
  // ============================================

  loadData() {
    try {
      const saved = localStorage.getItem('hacknote_data');
      if (saved) {
        const data = JSON.parse(saved);
        this.workspaces = data.workspaces || [];
        this.pages = data.pages || [];
        this.settings = { ...this.settings, ...data.settings };
      }

      // Create default workspace if none exists
      if (this.workspaces.length === 0) {
        this.workspaces.push({
          id: this.generateId(),
          name: 'My Workspace',
          icon: '\u2B21',
          createdAt: Date.now()
        });
        this.saveData();
      }

      this.currentWorkspace = this.workspaces[0];
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  saveData() {
    try {
      const data = {
        workspaces: this.workspaces,
        pages: this.pages,
        settings: this.settings,
        savedAt: Date.now()
      };
      const jsonData = JSON.stringify(data);

      // Check if data is too large (localStorage limit is typically 5-10MB)
      const sizeInMB = (jsonData.length * 2) / (1024 * 1024); // Rough estimate (UTF-16)
      if (sizeInMB > 4) {
        console.warn(`[HACKNOTE] Data size: ${sizeInMB.toFixed(2)}MB - approaching storage limit`);
      }

      localStorage.setItem('hacknote_data', jsonData);
    } catch (err) {
      console.error('[HACKNOTE] Failed to save data:', err);
      if (err.name === 'QuotaExceededError') {
        alert('Storage limit exceeded! Consider removing some images or exporting your data.');
      }
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ============================================
  // EVENT BINDINGS
  // ============================================

  bindEvents() {
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // Add workspace
    document.getElementById('addWorkspace').addEventListener('click', () => {
      this.createWorkspace();
    });

    // Add page
    document.getElementById('addPage').addEventListener('click', () => {
      this.createPage();
    });

    // Welcome new page button
    document.getElementById('welcomeNewPage').addEventListener('click', () => {
      this.createPage();
    });

    // Page type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.currentPage) {
          this.setPageType(btn.dataset.type);
        }
      });
    });

    // Page title
    document.getElementById('pageTitle').addEventListener('input', (e) => {
      if (this.currentPage) {
        this.currentPage.title = e.target.value;
        this.saveData();
        this.renderSidebar();
      }
    });

    // Delete page
    document.getElementById('deletePageBtn').addEventListener('click', () => {
      if (this.currentPage) {
        this.deletePage(this.currentPage.id);
      }
    });

    // Rich text editor content
    document.getElementById('notesContent').addEventListener('input', (e) => {
      if (this.currentPage) {
        this.currentPage.content = e.target.innerHTML;
        this.saveData();
      }
    });

    // Markdown editor content
    document.getElementById('markdownContent').addEventListener('input', (e) => {
      if (this.currentPage) {
        this.currentPage.markdownContent = e.target.value;
        this.saveData();
      }
    });

    // Toolbar buttons
    document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.executeCommand(btn.dataset.command, btn.dataset.value);
      });
    });

    // Markdown toggle
    document.getElementById('markdownToggle').addEventListener('click', () => {
      this.toggleMarkdownMode();
    });

    // Image upload
    document.getElementById('insertImageBtn').addEventListener('click', () => {
      document.getElementById('imageUpload').click();
    });

    document.getElementById('imageUpload').addEventListener('change', (e) => {
      this.handleImageUpload(e);
    });

    // Support drag and drop images into notes
    document.getElementById('notesContent').addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        this.insertImage(files[0]);
      }
    });

    document.getElementById('notesContent').addEventListener('dragover', (e) => {
      e.preventDefault();
      e.target.closest('.notes-editor')?.classList.add('drag-over');
    });

    document.getElementById('notesContent').addEventListener('dragleave', (e) => {
      e.target.closest('.notes-editor')?.classList.remove('drag-over');
    });

    document.getElementById('notesContent').addEventListener('drop', (e) => {
      e.target.closest('.notes-editor')?.classList.remove('drag-over');
    }, true);

    // Support paste images into notes
    document.getElementById('notesContent').addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let item of items) {
          if (item.type.startsWith('image/')) {
            e.preventDefault();
            const file = item.getAsFile();
            this.insertImage(file);
            break;
          }
        }
      }
    });

    // Keyboard shortcuts for formatting
    document.getElementById('notesContent').addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            this.executeCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            this.executeCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            this.executeCommand('underline');
            break;
        }
      }
    });

    // Todo input
    document.getElementById('todoInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        this.addTodo(e.target.value.trim());
        e.target.value = '';
      }
    });

    document.getElementById('todoAddBtn').addEventListener('click', () => {
      const input = document.getElementById('todoInput');
      if (input.value.trim()) {
        this.addTodo(input.value.trim());
        input.value = '';
      }
    });

    // Todo filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderTodos();
      });
    });

    // Clear completed
    document.getElementById('clearCompleted').addEventListener('click', () => {
      if (this.currentPage && this.currentPage.todos) {
        this.currentPage.todos = this.currentPage.todos.filter(t => !t.completed);
        this.saveData();
        this.renderTodos();
      }
    });

    // Add card buttons
    document.querySelectorAll('.add-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.createCard(btn.dataset.status);
      });
    });

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showModal('settingsModal');
    });

    // Color options
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.accentColor = btn.dataset.color;
        this.applySettings();
        this.saveData();
      });
    });

    // Glow toggle
    document.getElementById('enableGlow').addEventListener('change', (e) => {
      this.settings.enableGlow = e.target.checked;
      this.applySettings();
      this.saveData();
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportData();
    });

    // Import
    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('importInput').click();
    });

    document.getElementById('importInput').addEventListener('change', (e) => {
      this.importData(e);
    });

    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideModal(btn.dataset.close);
      });
    });

    // Modal overlay click to close
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') {
        this.hideAllModals();
      }
    });

    // Card modal buttons
    document.getElementById('saveCardBtn').addEventListener('click', () => {
      this.saveCard();
    });

    document.getElementById('deleteCardBtn').addEventListener('click', () => {
      this.deleteCard();
    });

    // Priority buttons
    document.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Context menu
    document.addEventListener('contextmenu', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem) {
        e.preventDefault();
        this.showContextMenu(e.clientX, e.clientY, navItem);
      }
    });

    document.addEventListener('click', () => {
      this.hideContextMenu();
    });

    document.querySelectorAll('.context-item').forEach(item => {
      item.addEventListener('click', () => {
        this.handleContextAction(item.dataset.action);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideAllModals();
        this.hideContextMenu();
      }

      // Ctrl/Cmd + N: New page
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.createPage();
      }

      // Ctrl/Cmd + S: Save (prevents default)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveData();
      }
    });
  }

  // ============================================
  // WORKSPACE MANAGEMENT
  // ============================================

  createWorkspace() {
    const workspace = {
      id: this.generateId(),
      name: 'New Workspace',
      icon: '\u2B21',
      createdAt: Date.now()
    };

    this.workspaces.push(workspace);
    this.currentWorkspace = workspace;
    this.saveData();
    this.renderSidebar();
  }

  selectWorkspace(id) {
    this.currentWorkspace = this.workspaces.find(w => w.id === id);
    this.currentPage = null;
    this.renderSidebar();
    this.showWelcome();
  }

  // ============================================
  // PAGE MANAGEMENT
  // ============================================

  createPage() {
    if (!this.currentWorkspace) return;

    const page = {
      id: this.generateId(),
      workspaceId: this.currentWorkspace.id,
      title: 'Untitled',
      type: 'notes',
      icon: '\u25A2',
      content: '',
      todos: [],
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.pages.push(page);
    this.saveData();
    this.renderSidebar();
    this.selectPage(page.id);
  }

  selectPage(id) {
    this.currentPage = this.pages.find(p => p.id === id);
    if (!this.currentPage) return;

    // Update sidebar selection
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === id);
    });

    // Update breadcrumb
    document.getElementById('breadcrumb').innerHTML = `
      <span class="breadcrumb-item">${this.currentWorkspace?.name || 'HACKNOTE'}</span>
      <span class="breadcrumb-item">${this.currentPage.title}</span>
    `;

    // Show editor
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('page-editor').classList.remove('hidden');

    // Set page title
    document.getElementById('pageTitle').value = this.currentPage.title;
    document.getElementById('pageIcon').textContent = this.currentPage.icon;

    // Set page type
    this.setPageType(this.currentPage.type, false);

    // Load content
    this.loadPageContent();
  }

  setPageType(type, save = true) {
    if (!this.currentPage) return;

    // Update type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    // Show correct view
    document.getElementById('notesView').classList.toggle('hidden', type !== 'notes');
    document.getElementById('todoView').classList.toggle('hidden', type !== 'todo');
    document.getElementById('boardView').classList.toggle('hidden', type !== 'board');

    // Update page icon
    const icons = {
      notes: '\u270E',
      todo: '\u2611',
      board: '\u25A6'
    };
    this.currentPage.icon = icons[type] || '\u25A2';
    document.getElementById('pageIcon').textContent = this.currentPage.icon;

    if (save) {
      this.currentPage.type = type;
      this.saveData();
      this.renderSidebar();
    }

    // Load content for the view
    this.loadPageContent();
  }

  loadPageContent() {
    if (!this.currentPage) return;

    switch (this.currentPage.type) {
      case 'notes':
        const notesContent = document.getElementById('notesContent');
        const markdownContent = document.getElementById('markdownContent');
        const markdownToggle = document.getElementById('markdownToggle');

        // Check if we're in markdown mode
        if (this.currentPage.markdownMode) {
          notesContent.classList.add('hidden');
          markdownContent.classList.remove('hidden');
          markdownToggle.classList.add('active');
          markdownContent.value = this.currentPage.markdownContent || '';
        } else {
          notesContent.classList.remove('hidden');
          markdownContent.classList.add('hidden');
          markdownToggle.classList.remove('active');
          notesContent.innerHTML = this.currentPage.content || '';
        }
        break;
      case 'todo':
        this.renderTodos();
        break;
      case 'board':
        this.renderBoard();
        break;
    }
  }

  deletePage(id) {
    if (!confirm('Delete this page?')) return;

    // Add deletion animation to nav item
    const navItem = document.querySelector(`.nav-item[data-id="${id}"]`);
    if (navItem) {
      navItem.classList.add('deleting');
    }

    setTimeout(() => {
      this.pages = this.pages.filter(p => p.id !== id);
      this.saveData();

      if (this.currentPage?.id === id) {
        this.currentPage = null;
        this.showWelcome();
      }

      this.renderSidebar();
      this.updateStats();
    }, navItem ? 500 : 0);
  }

  showWelcome() {
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.getElementById('page-editor').classList.add('hidden');
    document.getElementById('breadcrumb').innerHTML = '<span class="breadcrumb-item">HACKNOTE</span>';
    this.updateStats();
  }

  // ============================================
  // TODO MANAGEMENT
  // ============================================

  addTodo(text) {
    if (!this.currentPage) return;

    if (!this.currentPage.todos) {
      this.currentPage.todos = [];
    }

    this.currentPage.todos.push({
      id: this.generateId(),
      text: text,
      completed: false,
      createdAt: Date.now()
    });

    this.saveData();
    this.renderTodos();
    this.updateStats();
  }

  toggleTodo(id) {
    if (!this.currentPage?.todos) return;

    const todo = this.currentPage.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.saveData();
      this.renderTodos();
      this.updateStats();
    }
  }

  deleteTodo(id) {
    if (!this.currentPage?.todos) return;

    // Add deletion animation
    const todoEl = document.querySelector(`.todo-item[data-id="${id}"]`);
    if (todoEl) {
      todoEl.classList.add('deleting');
      setTimeout(() => {
        this.currentPage.todos = this.currentPage.todos.filter(t => t.id !== id);
        this.saveData();
        this.renderTodos();
        this.updateStats();
      }, 400);
    } else {
      this.currentPage.todos = this.currentPage.todos.filter(t => t.id !== id);
      this.saveData();
      this.renderTodos();
      this.updateStats();
    }
  }

  updateTodoText(id, text) {
    if (!this.currentPage?.todos) return;

    const todo = this.currentPage.todos.find(t => t.id === id);
    if (todo) {
      todo.text = text;
      this.saveData();
    }
  }

  renderTodos() {
    if (!this.currentPage) return;

    const todos = this.currentPage.todos || [];
    const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    const list = document.getElementById('todoList');

    let filtered = todos;
    if (filter === 'active') {
      filtered = todos.filter(t => !t.completed);
    } else if (filter === 'completed') {
      filtered = todos.filter(t => t.completed);
    }

    if (filtered.length === 0) {
      list.innerHTML = '<div class="todo-empty">No tasks yet. Add one above!</div>';
    } else {
      list.innerHTML = filtered.map(todo => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
          <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-id="${todo.id}"></div>
          <input type="text" class="todo-text-input" value="${this.escapeHtml(todo.text)}" data-id="${todo.id}">
          <button class="todo-delete" data-id="${todo.id}">\u2715</button>
        </div>
      `).join('');

      // Bind events
      list.querySelectorAll('.todo-checkbox').forEach(cb => {
        cb.addEventListener('click', () => this.toggleTodo(cb.dataset.id));
      });

      list.querySelectorAll('.todo-delete').forEach(btn => {
        btn.addEventListener('click', () => this.deleteTodo(btn.dataset.id));
      });

      list.querySelectorAll('.todo-text-input').forEach(input => {
        input.addEventListener('blur', () => this.updateTodoText(input.dataset.id, input.value));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            input.blur();
          }
        });
      });
    }

    // Update count
    const activeCount = todos.filter(t => !t.completed).length;
    document.getElementById('todoCount').textContent = `${activeCount} task${activeCount !== 1 ? 's' : ''} remaining`;
  }

  // ============================================
  // BOARD (KANBAN) MANAGEMENT
  // ============================================

  createCard(status) {
    if (!this.currentPage) return;

    if (!this.currentPage.cards) {
      this.currentPage.cards = [];
    }

    const card = {
      id: this.generateId(),
      title: 'New Card',
      description: '',
      status: status,
      priority: 'medium',
      createdAt: Date.now()
    };

    this.currentPage.cards.push(card);
    this.saveData();
    this.renderBoard();

    // Open card for editing
    this.editCard(card.id);
  }

  editCard(id) {
    if (!this.currentPage?.cards) return;

    const card = this.currentPage.cards.find(c => c.id === id);
    if (!card) return;

    this.editingCard = card;

    document.getElementById('cardTitle').value = card.title;
    document.getElementById('cardDescription').value = card.description || '';

    document.querySelectorAll('.priority-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.priority === card.priority);
    });

    this.showModal('cardModal');
  }

  saveCard() {
    if (!this.editingCard) return;

    this.editingCard.title = document.getElementById('cardTitle').value || 'Untitled';
    this.editingCard.description = document.getElementById('cardDescription').value;
    this.editingCard.priority = document.querySelector('.priority-btn.active')?.dataset.priority || 'medium';

    this.saveData();
    this.renderBoard();
    this.hideModal('cardModal');
    this.editingCard = null;
  }

  deleteCard() {
    if (!this.editingCard || !this.currentPage?.cards) return;

    if (!confirm('Delete this card?')) return;

    const cardId = this.editingCard.id;
    this.hideModal('cardModal');

    // Add deletion animation
    const cardEl = document.querySelector(`.board-card[data-id="${cardId}"]`);
    if (cardEl) {
      cardEl.classList.add('deleting');
      setTimeout(() => {
        this.currentPage.cards = this.currentPage.cards.filter(c => c.id !== cardId);
        this.saveData();
        this.renderBoard();
      }, 400);
    } else {
      this.currentPage.cards = this.currentPage.cards.filter(c => c.id !== cardId);
      this.saveData();
      this.renderBoard();
    }

    this.editingCard = null;
  }

  moveCard(cardId, newStatus) {
    if (!this.currentPage?.cards) return;

    const card = this.currentPage.cards.find(c => c.id === cardId);
    if (card) {
      card.status = newStatus;
      this.saveData();
      this.renderBoard();
    }
  }

  renderBoard() {
    if (!this.currentPage) return;

    const cards = this.currentPage.cards || [];
    const statuses = ['backlog', 'in-progress', 'review', 'done'];

    statuses.forEach(status => {
      const column = document.querySelector(`.column-cards[data-status="${status}"]`);
      const statusCards = cards.filter(c => c.status === status);

      // Update count
      const countEl = column.closest('.board-column').querySelector('.column-count');
      countEl.textContent = statusCards.length;

      // Render cards
      column.innerHTML = statusCards.map(card => `
        <div class="board-card" data-id="${card.id}" draggable="true">
          <div class="card-priority ${card.priority}"></div>
          <div class="card-title">${this.escapeHtml(card.title)}</div>
          ${card.description ? `<div class="card-description">${this.escapeHtml(card.description)}</div>` : ''}
        </div>
      `).join('');

      // Bind click events
      column.querySelectorAll('.board-card').forEach(cardEl => {
        cardEl.addEventListener('click', () => this.editCard(cardEl.dataset.id));

        // Drag events
        cardEl.addEventListener('dragstart', (e) => {
          this.draggedCard = cardEl.dataset.id;
          cardEl.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
        });

        cardEl.addEventListener('dragend', () => {
          cardEl.classList.remove('dragging');
          this.draggedCard = null;
        });
      });

      // Drop events on columns
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        column.classList.add('drag-over');
      });

      column.addEventListener('dragleave', () => {
        column.classList.remove('drag-over');
      });

      column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');
        if (this.draggedCard) {
          this.moveCard(this.draggedCard, status);
        }
      });
    });
  }

  // ============================================
  // SIDEBAR
  // ============================================

  renderSidebar() {
    // Render workspaces
    const workspaceList = document.getElementById('workspaceList');
    workspaceList.innerHTML = this.workspaces.map(ws => `
      <div class="nav-item ${ws.id === this.currentWorkspace?.id ? 'active' : ''}" data-id="${ws.id}" data-type="workspace">
        <span class="nav-item-icon">${ws.icon}</span>
        <span class="nav-item-text">${this.escapeHtml(ws.name)}</span>
      </div>
    `).join('');

    workspaceList.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.selectWorkspace(item.dataset.id));
    });

    // Render pages for current workspace
    const pageList = document.getElementById('pageList');
    const workspacePages = this.pages.filter(p => p.workspaceId === this.currentWorkspace?.id);

    if (workspacePages.length === 0) {
      pageList.innerHTML = '<div class="nav-item" style="opacity: 0.5; cursor: default;">No pages yet</div>';
    } else {
      pageList.innerHTML = workspacePages.map(page => `
        <div class="nav-item ${page.id === this.currentPage?.id ? 'active' : ''}" data-id="${page.id}" data-type="page">
          <span class="nav-item-icon">${page.icon}</span>
          <span class="nav-item-text">${this.escapeHtml(page.title)}</span>
          <span class="nav-item-count">${this.getPageItemCount(page)}</span>
        </div>
      `).join('');

      pageList.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => this.selectPage(item.dataset.id));
      });
    }
  }

  getPageItemCount(page) {
    switch (page.type) {
      case 'todo':
        return page.todos?.filter(t => !t.completed).length || 0;
      case 'board':
        return page.cards?.length || 0;
      default:
        return '';
    }
  }

  // ============================================
  // CONTEXT MENU
  // ============================================

  showContextMenu(x, y, target) {
    this.contextMenuTarget = target;
    const menu = document.getElementById('contextMenu');
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.remove('hidden');
  }

  hideContextMenu() {
    document.getElementById('contextMenu').classList.add('hidden');
    this.contextMenuTarget = null;
  }

  handleContextAction(action) {
    if (!this.contextMenuTarget) return;

    const id = this.contextMenuTarget.dataset.id;
    const type = this.contextMenuTarget.dataset.type;

    switch (action) {
      case 'rename':
        const name = prompt('Enter new name:');
        if (name) {
          if (type === 'workspace') {
            const ws = this.workspaces.find(w => w.id === id);
            if (ws) ws.name = name;
          } else {
            const page = this.pages.find(p => p.id === id);
            if (page) page.title = name;
          }
          this.saveData();
          this.renderSidebar();
        }
        break;

      case 'duplicate':
        if (type === 'page') {
          const page = this.pages.find(p => p.id === id);
          if (page) {
            const copy = {
              ...JSON.parse(JSON.stringify(page)),
              id: this.generateId(),
              title: page.title + ' (Copy)',
              createdAt: Date.now()
            };
            this.pages.push(copy);
            this.saveData();
            this.renderSidebar();
          }
        }
        break;

      case 'delete':
        if (type === 'workspace' && this.workspaces.length > 1) {
          if (confirm('Delete this workspace and all its pages?')) {
            this.pages = this.pages.filter(p => p.workspaceId !== id);
            this.workspaces = this.workspaces.filter(w => w.id !== id);
            if (this.currentWorkspace?.id === id) {
              this.currentWorkspace = this.workspaces[0];
              this.currentPage = null;
              this.showWelcome();
            }
            this.saveData();
            this.renderSidebar();
          }
        } else if (type === 'page') {
          this.deletePage(id);
        }
        break;
    }

    this.hideContextMenu();
  }

  // ============================================
  // MODALS
  // ============================================

  showModal(id) {
    document.getElementById('modal-overlay').classList.add('visible');
    document.getElementById(id).classList.remove('hidden');
  }

  hideModal(id) {
    document.getElementById(id).classList.add('hidden');
    if (!document.querySelector('.modal:not(.hidden)')) {
      document.getElementById('modal-overlay').classList.remove('visible');
    }
  }

  hideAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('modal-overlay').classList.remove('visible');
  }

  // ============================================
  // SETTINGS
  // ============================================

  applySettings() {
    // Apply accent color
    document.documentElement.style.setProperty('--accent', this.settings.accentColor);
    document.documentElement.style.setProperty('--accent-dim', this.settings.accentColor + '40');
    document.documentElement.style.setProperty('--accent-glow',
      `0 0 10px ${this.settings.accentColor}, 0 0 20px ${this.settings.accentColor}40`);

    // Update color button
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === this.settings.accentColor);
    });

    // Glow
    document.getElementById('enableGlow').checked = this.settings.enableGlow;
  }

  // ============================================
  // STATS
  // ============================================

  updateStats() {
    const totalPages = this.pages.length;
    let totalTasks = 0;
    let completedTasks = 0;

    this.pages.forEach(page => {
      if (page.todos) {
        totalTasks += page.todos.length;
        completedTasks += page.todos.filter(t => t.completed).length;
      }
      if (page.cards) {
        totalTasks += page.cards.length;
        completedTasks += page.cards.filter(c => c.status === 'done').length;
      }
    });

    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
  }

  // ============================================
  // IMPORT/EXPORT
  // ============================================

  exportData() {
    const data = {
      version: '1.0',
      exportedAt: Date.now(),
      workspaces: this.workspaces,
      pages: this.pages,
      settings: this.settings
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hacknote-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('%c[EXPORT] Data exported successfully', 'color: #00ff9d');
  }

  importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        if (!data.workspaces || !data.pages) {
          throw new Error('Invalid data format');
        }

        if (confirm('This will replace all existing data. Continue?')) {
          this.workspaces = data.workspaces;
          this.pages = data.pages;
          this.settings = { ...this.settings, ...data.settings };
          this.currentWorkspace = this.workspaces[0];
          this.currentPage = null;

          this.saveData();
          this.renderSidebar();
          this.showWelcome();
          this.applySettings();

          console.log('%c[IMPORT] Data imported successfully', 'color: #00ff9d');
        }
      } catch (err) {
        console.error('Failed to import:', err);
        alert('Failed to import data. Invalid file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ============================================
  // IMAGE HANDLING
  // ============================================

  handleImageUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.insertImage(file);
    }
    e.target.value = '';
  }

  insertImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = document.createElement('img');
      img.src = dataUrl;
      img.className = 'note-image';
      img.alt = file.name;

      // Create a wrapper div for the image with controls
      const wrapper = document.createElement('div');
      wrapper.className = 'image-wrapper';
      wrapper.contentEditable = 'false';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'image-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.onclick = () => {
        wrapper.classList.add('deleting');
        setTimeout(() => wrapper.remove(), 400);
        if (this.currentPage) {
          this.currentPage.content = document.getElementById('notesContent').innerHTML;
          this.saveData();
        }
      };

      wrapper.appendChild(img);
      wrapper.appendChild(deleteBtn);

      // Insert at cursor position
      const editor = document.getElementById('notesContent');
      const selection = window.getSelection();

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(wrapper);

        // Move cursor after the image
        range.setStartAfter(wrapper);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editor.appendChild(wrapper);
      }

      // Add line break after image
      const br = document.createElement('br');
      wrapper.parentNode.insertBefore(br, wrapper.nextSibling);

      // Save
      if (this.currentPage) {
        this.currentPage.content = editor.innerHTML;
        this.saveData();
      }
    };
    reader.readAsDataURL(file);
  }

  // ============================================
  // RICH TEXT EDITOR
  // ============================================

  executeCommand(command, value = null) {
    const editor = document.getElementById('notesContent');
    editor.focus();

    switch (command) {
      case 'code':
        // Wrap selection in code tag
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectedText = range.toString();
          if (selectedText) {
            const code = document.createElement('code');
            code.textContent = selectedText;
            range.deleteContents();
            range.insertNode(code);
          }
        }
        break;

      case 'codeBlock':
        // Insert a code block
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const text = range.toString() || 'code here';
          const pre = document.createElement('pre');
          const codeEl = document.createElement('code');
          codeEl.textContent = text;
          pre.appendChild(codeEl);
          range.deleteContents();
          range.insertNode(pre);
        }
        break;

      case 'highlight':
        const highlightSel = window.getSelection();
        if (highlightSel.rangeCount > 0) {
          const range = highlightSel.getRangeAt(0);
          const selectedText = range.toString();
          if (selectedText) {
            const mark = document.createElement('mark');
            mark.textContent = selectedText;
            range.deleteContents();
            range.insertNode(mark);
          }
        }
        break;

      case 'createLink':
        const url = prompt('Enter URL:');
        if (url) {
          document.execCommand('createLink', false, url);
        }
        break;

      case 'formatBlock':
        document.execCommand('formatBlock', false, `<${value}>`);
        break;

      default:
        document.execCommand(command, false, value);
    }

    // Save after command
    if (this.currentPage) {
      this.currentPage.content = editor.innerHTML;
      this.saveData();
    }
  }

  toggleMarkdownMode() {
    if (!this.currentPage) return;

    const notesContent = document.getElementById('notesContent');
    const markdownContent = document.getElementById('markdownContent');
    const markdownToggle = document.getElementById('markdownToggle');

    this.currentPage.markdownMode = !this.currentPage.markdownMode;

    if (this.currentPage.markdownMode) {
      // Switch to markdown mode - convert HTML to markdown
      notesContent.classList.add('hidden');
      markdownContent.classList.remove('hidden');
      markdownToggle.classList.add('active');
      markdownContent.value = this.currentPage.markdownContent || this.htmlToMarkdown(notesContent.innerHTML);
    } else {
      // Switch to rich text mode - convert markdown to HTML
      notesContent.classList.remove('hidden');
      markdownContent.classList.add('hidden');
      markdownToggle.classList.remove('active');
      const html = this.markdownToHtml(markdownContent.value);
      notesContent.innerHTML = html;
      this.currentPage.content = html;
    }

    this.saveData();
  }

  markdownToHtml(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Code blocks (must be first to avoid conflicts)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');

    // Unordered lists
    html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Line breaks (preserve double newlines as paragraphs)
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }

    return html;
  }

  htmlToMarkdown(html) {
    if (!html) return '';

    let markdown = html;

    // Remove extra whitespace
    markdown = markdown.replace(/\s+/g, ' ').trim();

    // Code blocks
    markdown = markdown.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```');

    // Inline code
    markdown = markdown.replace(/<code>([^<]+)<\/code>/gi, '`$1`');

    // Headers
    markdown = markdown.replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '# $1\n');
    markdown = markdown.replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '## $1\n');
    markdown = markdown.replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '### $1\n');

    // Bold and italic
    markdown = markdown.replace(/<strong><em>([^<]+)<\/em><\/strong>/gi, '***$1***');
    markdown = markdown.replace(/<strong>([^<]+)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<em>([^<]+)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<b>([^<]+)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<i>([^<]+)<\/i>/gi, '*$1*');

    // Underline (no markdown equivalent, use HTML)
    markdown = markdown.replace(/<u>([^<]+)<\/u>/gi, '<u>$1</u>');

    // Strikethrough
    markdown = markdown.replace(/<s>([^<]+)<\/s>/gi, '~~$1~~');
    markdown = markdown.replace(/<strike>([^<]+)<\/strike>/gi, '~~$1~~');

    // Blockquotes
    markdown = markdown.replace(/<blockquote>([^<]+)<\/blockquote>/gi, '> $1\n');

    // Lists
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      return content.replace(/<li>([^<]+)<\/li>/gi, '- $1\n');
    });
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      let i = 1;
      return content.replace(/<li>([^<]+)<\/li>/gi, () => `${i++}. $1\n`);
    });

    // Links
    markdown = markdown.replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '[$2]($1)');

    // Horizontal rule
    markdown = markdown.replace(/<hr\s*\/?>/gi, '\n---\n');

    // Mark/highlight
    markdown = markdown.replace(/<mark>([^<]+)<\/mark>/gi, '==$1==');

    // Line breaks and paragraphs
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    markdown = markdown.replace(/<\/p><p>/gi, '\n\n');
    markdown = markdown.replace(/<\/?p>/gi, '');

    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = markdown;
    markdown = textarea.value;

    return markdown.trim();
  }

  // ============================================
  // UTILITIES
  // ============================================

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new HackNote();
});
