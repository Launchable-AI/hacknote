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
      enableGlow: true,
      themeMode: 'cyber' // 'cyber' or 'professional'
    };

    // State
    this.contextMenuTarget = null;
    this.editingCard = null;
    this.draggedCard = null;

    // Modal state
    this.renameCallback = null;
    this.confirmCallback = null;

    // Initialize
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.renderSidebar();
    this.updateStats();
    this.applySettings();

    console.log('%c[HACKNOTE] System initialized', 'color: #00ff9d');
  }

  // ============================================
  // DATA PERSISTENCE
  // ============================================

  async loadData() {
    try {
      const response = await fetch('/api/data');
      if (response.ok) {
        const data = await response.json();
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
    const data = {
      workspaces: this.workspaces,
      pages: this.pages,
      settings: this.settings,
      savedAt: Date.now()
    };

    // Debounce saves to avoid excessive API calls
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }
    this._saveTimeout = setTimeout(() => {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(err => {
        console.error('[HACKNOTE] Failed to save data:', err);
      });
    }, 300);
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

    // Theme toggle buttons
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.themeMode = btn.dataset.theme;
        this.applyTheme(true); // true = switching themes, apply default colors
        this.saveData();
      });
    });

    // Professional color options
    document.querySelectorAll('.pro-colors .color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.settings.accentColor = btn.dataset.color;
        this.applySettings();
        this.saveData();
      });
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

    // Rename modal events
    const renameInput = document.getElementById('renameInput');
    const renamePreview = document.getElementById('renamePreview');

    renameInput.addEventListener('input', (e) => {
      renamePreview.textContent = e.target.value || '---';
    });

    renameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.confirmRename();
      }
    });

    document.getElementById('renameCancelBtn').addEventListener('click', () => {
      this.hideModal('renameModal');
      this.renameCallback = null;
    });

    document.getElementById('renameConfirmBtn').addEventListener('click', () => {
      this.confirmRename();
    });

    // Confirm modal events
    document.getElementById('confirmCancelBtn').addEventListener('click', () => {
      this.hideModal('confirmModal');
      this.confirmCallback = null;
    });

    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
      this.executeConfirm();
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
    document.getElementById('canvasView').classList.toggle('hidden', type !== 'canvas');

    // Update page icon
    const icons = {
      notes: '\u270E',
      todo: '\u2611',
      board: '\u25A6',
      canvas: '\u2B21'
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
      case 'canvas':
        this.initCanvasEditor();
        break;
    }
  }

  deletePage(id, skipConfirm = false) {
    const doDelete = () => {
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
    };

    if (skipConfirm) {
      doDelete();
    } else {
      const page = this.pages.find(p => p.id === id);
      const pageName = page ? page.title : 'this page';

      this.showConfirmModal(
        'DELETE PAGE',
        `Delete "${pageName}"?`,
        doDelete
      );
    }
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

    const cardTitle = this.editingCard.title || 'this card';
    const cardId = this.editingCard.id;

    this.showConfirmModal(
      'DELETE CARD',
      `Delete "${cardTitle}"?`,
      () => {
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
    );
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
        let currentName = '';
        let modalTitle = 'RENAME';

        if (type === 'workspace') {
          const ws = this.workspaces.find(w => w.id === id);
          currentName = ws ? ws.name : '';
          modalTitle = 'RENAME WORKSPACE';
        } else {
          const page = this.pages.find(p => p.id === id);
          currentName = page ? page.title : '';
          modalTitle = 'RENAME PAGE';
        }

        this.showRenameModal(modalTitle, currentName, (newName) => {
          if (type === 'workspace') {
            const ws = this.workspaces.find(w => w.id === id);
            if (ws) ws.name = newName;
          } else {
            const page = this.pages.find(p => p.id === id);
            if (page) page.title = newName;
          }
          this.saveData();
          this.renderSidebar();
        });
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
          const ws = this.workspaces.find(w => w.id === id);
          const wsName = ws ? ws.name : 'this workspace';

          this.showConfirmModal(
            'DELETE WORKSPACE',
            `Delete "${wsName}" and all its pages?`,
            () => {
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
          );
        } else if (type === 'page') {
          const page = this.pages.find(p => p.id === id);
          const pageName = page ? page.title : 'this page';

          this.showConfirmModal(
            'DELETE PAGE',
            `Delete "${pageName}"?`,
            () => {
              this.deletePage(id, true);
            }
          );
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
    this.renameCallback = null;
    this.confirmCallback = null;
  }

  // ============================================
  // RENAME MODAL
  // ============================================

  showRenameModal(title, currentValue, callback) {
    document.getElementById('renameModalTitle').textContent = title;
    const input = document.getElementById('renameInput');
    const preview = document.getElementById('renamePreview');

    input.value = currentValue;
    preview.textContent = currentValue || '---';
    this.renameCallback = callback;

    this.showModal('renameModal');

    // Focus input after animation
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);
  }

  confirmRename() {
    const input = document.getElementById('renameInput');
    const value = input.value.trim();

    if (value && this.renameCallback) {
      this.renameCallback(value);
    }

    this.hideModal('renameModal');
    this.renameCallback = null;
  }

  // ============================================
  // CONFIRM MODAL
  // ============================================

  showConfirmModal(title, message, callback) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    this.confirmCallback = callback;

    this.showModal('confirmModal');
  }

  executeConfirm() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }

    this.hideModal('confirmModal');
    this.confirmCallback = null;
  }

  // ============================================
  // SETTINGS
  // ============================================

  applySettings() {
    // Apply theme mode first
    this.applyTheme();

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

  applyTheme(switchingTheme = false) {
    const themeMode = this.settings.themeMode;
    const isProfessional = themeMode === 'professional' || themeMode === 'professional-dark';

    // Remove all theme classes first
    document.body.classList.remove('theme-professional', 'theme-professional-dark');

    // Add appropriate theme class
    if (themeMode === 'professional') {
      document.body.classList.add('theme-professional');
    } else if (themeMode === 'professional-dark') {
      document.body.classList.add('theme-professional-dark');
    }

    // Update theme toggle buttons
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeMode);
    });

    // Show/hide appropriate color options
    const cyberColors = document.querySelector('.color-options:not(.pro-colors)');
    const proColors = document.querySelector('.pro-colors');

    if (isProfessional) {
      cyberColors.classList.add('hidden');
      proColors.classList.remove('hidden');

      // Only set default accent when actually switching themes, not on every apply
      if (switchingTheme) {
        const cyberAccents = ['#00ff9d', '#00ffff', '#ff00ff', '#ff6b00', '#ffff00'];
        if (cyberAccents.includes(this.settings.accentColor)) {
          this.settings.accentColor = '#2563eb';
        }
      }
    } else {
      cyberColors.classList.remove('hidden');
      proColors.classList.add('hidden');

      // Only set default accent when actually switching themes
      if (switchingTheme) {
        const proAccents = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#0891b2'];
        if (proAccents.includes(this.settings.accentColor)) {
          this.settings.accentColor = '#00ff9d';
        }
      }
    }

    // Apply accent color to CSS variables
    document.documentElement.style.setProperty('--accent', this.settings.accentColor);
    document.documentElement.style.setProperty('--accent-dim', this.settings.accentColor + '40');

    if (isProfessional) {
      document.documentElement.style.setProperty('--accent-glow', 'none');
    } else {
      document.documentElement.style.setProperty('--accent-glow',
        `0 0 10px ${this.settings.accentColor}, 0 0 20px ${this.settings.accentColor}40`);
    }

    // Update color buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === this.settings.accentColor);
    });
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

        this.showConfirmModal(
          'IMPORT DATA',
          'This will replace all existing data. Continue?',
          () => {
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
        );
      } catch (err) {
        console.error('Failed to import:', err);
        this.showConfirmModal(
          'IMPORT ERROR',
          'Failed to import data. Invalid file format.',
          () => {}
        );
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
  // CANVAS EDITOR
  // ============================================

  initCanvasEditor() {
    if (!this.canvasEditor) {
      this.canvasEditor = new CanvasEditor(this);
    }
    this.canvasEditor.loadFromPage(this.currentPage);
  }

  saveCanvasData() {
    if (this.currentPage && this.canvasEditor) {
      this.currentPage.canvasData = this.canvasEditor.getObjects();
      this.saveData();
    }
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

// ============================================
// CANVAS EDITOR CLASS
// ============================================

class CanvasEditor {
  constructor(app) {
    this.app = app;
    this.canvas = document.getElementById('drawingCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById('canvasContainer');

    // State
    this.objects = [];
    this.selectedObjects = [];
    this.currentTool = 'select';
    this.isDrawing = false;
    this.isPanning = false;
    this.isDragging = false;
    this.isResizing = false;

    // Transform state
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.minScale = 0.1;
    this.maxScale = 5;

    // Drawing state
    this.currentPath = [];
    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;

    // History for undo/redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;

    // Properties
    this.strokeColor = '#00ff9d';
    this.fillColor = '#0a0a0f';
    this.fillEnabled = false;
    this.strokeWidth = 2;
    this.fontSize = 24;
    this.opacity = 100;

    // Object ID counter
    this.objectIdCounter = 0;

    // Connector state
    this.connectingFrom = null;
    this.connectingPreview = null;

    // Text editing state
    this.editingTextObject = null;

    // Resize state
    this.resizeHandle = null;
    this.resizeObject = null;
    this.resizeStart = null;

    // Initialize
    this.init();
  }

  init() {
    this.setupCanvas();
    this.bindEvents();
    this.bindToolbar();
    this.bindProperties();
  }

  setupCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height - 40; // Account for status bar
    this.render();
  }

  loadFromPage(page) {
    if (page && page.canvasData) {
      this.objects = page.canvasData.map(obj => {
        if (obj.type === 'image' && obj.src) {
          const img = new Image();
          img.onload = () => this.render();
          img.src = obj.src;
          obj.imageElement = img;
        }
        return obj;
      });
      // Update ID counter
      this.objectIdCounter = Math.max(...this.objects.map(o => o.id || 0), 0);
    } else {
      this.objects = [];
      this.objectIdCounter = 0;
    }
    this.selectedObjects = [];
    this.history = [];
    this.historyIndex = -1;
    this.saveState();
    this.updateStatus();
    this.resizeCanvas();
    this.render();
  }

  getObjects() {
    return this.objects.map(obj => {
      const clone = { ...obj };
      if (clone.type === 'image') {
        delete clone.imageElement;
      }
      if (clone.type === 'path') {
        clone.points = [...obj.points];
      }
      return clone;
    });
  }

  // Coordinate transformations
  screenToCanvas(x, y) {
    return {
      x: (x - this.offsetX) / this.scale,
      y: (y - this.offsetY) / this.scale
    };
  }

  canvasToScreen(x, y) {
    return {
      x: x * this.scale + this.offsetX,
      y: y * this.scale + this.offsetY
    };
  }

  // Event bindings
  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    this.canvas.addEventListener('auxclick', (e) => {
      if (e.button === 1) e.preventDefault();
    });
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Text input
    const textInput = document.getElementById('canvasTextInput');
    textInput.addEventListener('blur', () => this.finalizeText());
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        textInput.style.display = 'none';
        textInput.value = '';
        textInput.classList.remove('editing-existing');
        this.editingTextObject = null;
        this.render();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.finalizeText();
        this.selectTool('select');
      }
    });

    // Image input
    document.getElementById('canvasImageInput').addEventListener('change', (e) => this.handleImageUpload(e));

    // Keyboard shortcuts (only when canvas view is active)
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('canvasView').classList.contains('hidden')) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (!e.ctrlKey && !e.metaKey) {
          switch (e.key.toLowerCase()) {
            case 's': this.selectTool('select'); break;
            case 'h': this.selectTool('pan'); break;
            case 'd': this.selectTool('draw'); break;
            case 'l': this.selectTool('line'); break;
            case 'r': this.selectTool('rect'); break;
            case 'e': this.selectTool('ellipse'); break;
            case 't': this.selectTool('text'); break;
            case 'i': this.selectTool('image'); break;
            case 'c': this.selectTool('connect'); break;
            case 'f': this.toggleFullscreen(); break;
            case 'delete':
            case 'backspace':
              this.deleteSelected();
              break;
            case 'escape':
              this.deselectAll();
              // Exit fullscreen if active
              if (document.getElementById('canvasView').classList.contains('fullscreen')) {
                this.toggleFullscreen();
              }
              break;
          }
        }

        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case 'z':
              e.preventDefault();
              if (e.shiftKey) this.redo();
              else this.undo();
              break;
            case 'y':
              e.preventDefault();
              this.redo();
              break;
            case 'a':
              e.preventDefault();
              this.selectAll();
              break;
          }
        }
      }
    });
  }

  bindToolbar() {
    // Tool buttons
    document.querySelectorAll('.canvas-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectTool(btn.dataset.tool);
      });
    });

    // Action buttons
    document.getElementById('canvasUndo').addEventListener('click', () => this.undo());
    document.getElementById('canvasRedo').addEventListener('click', () => this.redo());
    document.getElementById('canvasClear').addEventListener('click', () => this.clearAll());

    // Zoom buttons
    document.getElementById('canvasZoomIn').addEventListener('click', () => this.zoom(1.2));
    document.getElementById('canvasZoomOut').addEventListener('click', () => this.zoom(0.8));
    document.getElementById('canvasZoomReset').addEventListener('click', () => this.resetZoom());

    // Fullscreen toggle
    document.getElementById('canvasFullscreen').addEventListener('click', () => this.toggleFullscreen());
  }

  bindProperties() {
    document.getElementById('canvasStrokeColor').addEventListener('input', (e) => {
      this.strokeColor = e.target.value;
      this.updateSelectedObjects('strokeColor', this.strokeColor);
    });

    document.getElementById('canvasFillColor').addEventListener('input', (e) => {
      this.fillColor = e.target.value;
      this.updateSelectedObjects('fillColor', this.fillColor);
    });

    document.getElementById('canvasFillEnabled').addEventListener('change', (e) => {
      this.fillEnabled = e.target.checked;
      this.updateSelectedObjects('fillEnabled', this.fillEnabled);
    });

    document.getElementById('canvasStrokeWidth').addEventListener('input', (e) => {
      this.strokeWidth = parseInt(e.target.value) || 2;
      this.updateSelectedObjects('strokeWidth', this.strokeWidth);
    });
  }

  selectTool(tool) {
    document.querySelectorAll('.canvas-tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    this.currentTool = tool;
    this.updateStatus();

    if (tool === 'image') {
      document.getElementById('canvasImageInput').click();
    }
  }

  // Mouse handlers
  onMouseDown(e) {
    const textInput = document.getElementById('canvasTextInput');
    if (textInput.style.display === 'block') {
      this.finalizeText();
      if (this.currentTool !== 'text') return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x, y } = this.screenToCanvas(screenX, screenY);

    this.startX = x;
    this.startY = y;
    this.lastX = screenX;
    this.lastY = screenY;

    if (e.button === 1) {
      e.preventDefault();
      this.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    switch (this.currentTool) {
      case 'select':
        this.handleSelectDown(x, y, e);
        break;
      case 'pan':
        this.isPanning = true;
        this.canvas.style.cursor = 'grabbing';
        break;
      case 'draw':
        this.isDrawing = true;
        this.currentPath = [{ x, y }];
        break;
      case 'line':
      case 'rect':
      case 'ellipse':
        this.isDrawing = true;
        break;
      case 'text':
        this.showTextInput(screenX, screenY, x, y);
        break;
      case 'connect':
        this.handleConnectDown(x, y);
        break;
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x, y } = this.screenToCanvas(screenX, screenY);

    document.getElementById('canvasMouseX').textContent = `X: ${Math.round(x)}`;
    document.getElementById('canvasMouseY').textContent = `Y: ${Math.round(y)}`;

    if (this.isPanning) {
      const dx = screenX - this.lastX;
      const dy = screenY - this.lastY;
      this.offsetX += dx;
      this.offsetY += dy;
      this.lastX = screenX;
      this.lastY = screenY;
      this.render();
      return;
    }

    if (this.isResizing && this.resizeObject) {
      this.handleResize(x, y);
      return;
    }

    if (this.isDragging && this.selectedObjects.length > 0) {
      const dx = x - this.startX;
      const dy = y - this.startY;

      this.selectedObjects.forEach(obj => {
        obj.x = (obj._dragStartX || obj.x) + dx;
        obj.y = (obj._dragStartY || obj.y) + dy;
      });

      this.render();
      return;
    }

    if (this.isDrawing) {
      if (this.currentTool === 'draw') {
        this.currentPath.push({ x, y });
      }
      this.render();
      this.drawPreview(x, y);
    }

    if (this.connectingFrom) {
      this.connectingPreview = { x, y };
      this.render();
      this.drawConnectorPreview(x, y);
    }
  }

  onMouseUp(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x, y } = this.screenToCanvas(screenX, screenY);

    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'crosshair';
      return;
    }

    if (this.connectingFrom) {
      this.handleConnectUp(x, y);
      return;
    }

    if (this.isResizing) {
      this.finalizeResize();
      return;
    }

    if (this.isDragging) {
      this.isDragging = false;
      this.selectedObjects.forEach(obj => {
        delete obj._dragStartX;
        delete obj._dragStartY;
      });
      this.saveState();
      this.render();
      return;
    }

    if (this.isDrawing) {
      this.isDrawing = false;

      switch (this.currentTool) {
        case 'draw':
          if (this.currentPath.length > 1) {
            this.addObject({
              type: 'path',
              points: [...this.currentPath],
              strokeColor: this.strokeColor,
              strokeWidth: this.strokeWidth,
              opacity: this.opacity
            });
          }
          this.currentPath = [];
          break;

        case 'line':
          if (Math.abs(x - this.startX) > 2 || Math.abs(y - this.startY) > 2) {
            this.addObject({
              type: 'line',
              x: this.startX,
              y: this.startY,
              x2: x,
              y2: y,
              strokeColor: this.strokeColor,
              strokeWidth: this.strokeWidth,
              opacity: this.opacity
            });
          }
          break;

        case 'rect':
          const rw = x - this.startX;
          const rh = y - this.startY;
          if (Math.abs(rw) > 2 && Math.abs(rh) > 2) {
            this.addObject({
              type: 'rect',
              x: rw > 0 ? this.startX : x,
              y: rh > 0 ? this.startY : y,
              width: Math.abs(rw),
              height: Math.abs(rh),
              strokeColor: this.strokeColor,
              fillColor: this.fillColor,
              fillEnabled: this.fillEnabled,
              strokeWidth: this.strokeWidth,
              opacity: this.opacity
            });
          }
          break;

        case 'ellipse':
          const ew = x - this.startX;
          const eh = y - this.startY;
          if (Math.abs(ew) > 2 && Math.abs(eh) > 2) {
            this.addObject({
              type: 'ellipse',
              x: this.startX + ew / 2,
              y: this.startY + eh / 2,
              radiusX: Math.abs(ew / 2),
              radiusY: Math.abs(eh / 2),
              strokeColor: this.strokeColor,
              fillColor: this.fillColor,
              fillEnabled: this.fillEnabled,
              strokeWidth: this.strokeWidth,
              opacity: this.opacity
            });
          }
          break;
      }

      this.render();
    }
  }

  onWheel(e) {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);

    const scaleDiff = newScale / this.scale;
    this.offsetX = mouseX - (mouseX - this.offsetX) * scaleDiff;
    this.offsetY = mouseY - (mouseY - this.offsetY) * scaleDiff;
    this.scale = newScale;

    this.updateZoomDisplay();
    this.render();
  }

  onDoubleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x, y } = this.screenToCanvas(screenX, screenY);

    const clickedObject = this.findObjectAt(x, y);
    if (clickedObject && clickedObject.type === 'text') {
      this.editTextObject(clickedObject, screenX, screenY);
    }
  }

  // Selection
  handleSelectDown(x, y, e) {
    const handleHit = this.findResizeHandle(x, y);
    if (handleHit) {
      this.isResizing = true;
      this.resizeHandle = handleHit.handle;
      this.resizeObject = handleHit.object;
      const bounds = this.getObjectBounds(handleHit.object);
      this.resizeStart = {
        x: handleHit.object.x,
        y: handleHit.object.y,
        width: bounds.width,
        height: bounds.height,
        mouseX: x,
        mouseY: y,
        fontSize: handleHit.object.fontSize || null
      };
      return;
    }

    const clickedObject = this.findObjectAt(x, y);

    if (clickedObject) {
      if (!e.shiftKey && !this.selectedObjects.includes(clickedObject)) {
        this.deselectAll();
      }

      if (!this.selectedObjects.includes(clickedObject)) {
        this.selectedObjects.push(clickedObject);
      }

      this.isDragging = true;
      this.selectedObjects.forEach(obj => {
        obj._dragStartX = obj.x;
        obj._dragStartY = obj.y;
      });
    } else {
      if (!e.shiftKey) {
        this.deselectAll();
      }
    }

    this.updateStatus();
    this.render();
  }

  findResizeHandle(x, y) {
    const handleSize = 12 / this.scale;

    for (const obj of this.selectedObjects) {
      if (!this.isResizable(obj)) continue;

      const bounds = this.getObjectBounds(obj);
      const padding = 5 / this.scale;

      const handles = {
        'nw': { x: bounds.x - padding, y: bounds.y - padding },
        'ne': { x: bounds.x + bounds.width + padding, y: bounds.y - padding },
        'sw': { x: bounds.x - padding, y: bounds.y + bounds.height + padding },
        'se': { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding }
      };

      for (const [handle, pos] of Object.entries(handles)) {
        if (Math.abs(x - pos.x) < handleSize / 2 && Math.abs(y - pos.y) < handleSize / 2) {
          return { handle, object: obj };
        }
      }
    }
    return null;
  }

  isResizable(obj) {
    return ['rect', 'image', 'ellipse', 'text'].includes(obj.type);
  }

  handleResize(x, y) {
    const obj = this.resizeObject;
    const start = this.resizeStart;
    const dx = x - start.mouseX;
    const dy = y - start.mouseY;
    const minSize = 20;

    if (obj.type === 'ellipse') {
      const startRadiusX = start.width / 2;
      const startRadiusY = start.height / 2;

      switch (this.resizeHandle) {
        case 'se':
          obj.radiusX = Math.max(10, startRadiusX + dx / 2);
          obj.radiusY = Math.max(10, startRadiusY + dy / 2);
          break;
        case 'sw':
          obj.radiusX = Math.max(10, startRadiusX - dx / 2);
          obj.radiusY = Math.max(10, startRadiusY + dy / 2);
          break;
        case 'ne':
          obj.radiusX = Math.max(10, startRadiusX + dx / 2);
          obj.radiusY = Math.max(10, startRadiusY - dy / 2);
          break;
        case 'nw':
          obj.radiusX = Math.max(10, startRadiusX - dx / 2);
          obj.radiusY = Math.max(10, startRadiusY - dy / 2);
          break;
      }
    } else if (obj.type === 'text') {
      let scale;
      switch (this.resizeHandle) {
        case 'se': scale = Math.max(1 + dx / start.width, 1 + dy / start.height); break;
        case 'sw': scale = Math.max(1 - dx / start.width, 1 + dy / start.height); break;
        case 'ne': scale = Math.max(1 + dx / start.width, 1 - dy / start.height); break;
        case 'nw': scale = Math.max(1 - dx / start.width, 1 - dy / start.height); break;
      }
      obj.fontSize = Math.max(8, Math.min(200, Math.round(start.fontSize * scale)));
    } else {
      switch (this.resizeHandle) {
        case 'se':
          obj.width = Math.max(minSize, start.width + dx);
          obj.height = Math.max(minSize, start.height + dy);
          break;
        case 'sw':
          const newWidthSW = Math.max(minSize, start.width - dx);
          obj.x = start.x + (start.width - newWidthSW);
          obj.width = newWidthSW;
          obj.height = Math.max(minSize, start.height + dy);
          break;
        case 'ne':
          obj.width = Math.max(minSize, start.width + dx);
          const newHeightNE = Math.max(minSize, start.height - dy);
          obj.y = start.y + (start.height - newHeightNE);
          obj.height = newHeightNE;
          break;
        case 'nw':
          const newWidthNW = Math.max(minSize, start.width - dx);
          const newHeightNW = Math.max(minSize, start.height - dy);
          obj.x = start.x + (start.width - newWidthNW);
          obj.y = start.y + (start.height - newHeightNW);
          obj.width = newWidthNW;
          obj.height = newHeightNW;
          break;
      }
    }

    this.render();
  }

  finalizeResize() {
    this.isResizing = false;
    this.resizeHandle = null;
    this.resizeObject = null;
    this.resizeStart = null;
    this.saveState();
    this.render();
  }

  findObjectAt(x, y) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      if (this.isPointInObject(x, y, obj)) {
        return obj;
      }
    }
    return null;
  }

  isPointInObject(x, y, obj) {
    const margin = 10 / this.scale;

    switch (obj.type) {
      case 'rect':
        return x >= obj.x - margin && x <= obj.x + obj.width + margin &&
               y >= obj.y - margin && y <= obj.y + obj.height + margin;

      case 'ellipse':
        const dx = (x - obj.x) / obj.radiusX;
        const dy = (y - obj.y) / obj.radiusY;
        return (dx * dx + dy * dy) <= 1.5;

      case 'line':
        return this.pointToLineDistance(x, y, obj.x, obj.y, obj.x2, obj.y2) < margin;

      case 'path':
        for (let i = 1; i < obj.points.length; i++) {
          const p1 = obj.points[i - 1];
          const p2 = obj.points[i];
          if (this.pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y) < margin) {
            return true;
          }
        }
        return false;

      case 'text':
        const lines = obj.text.split('\n');
        const maxLineLength = Math.max(...lines.map(l => l.length));
        const textWidth = maxLineLength * obj.fontSize * 0.6;
        const textHeight = lines.length * obj.fontSize * 1.2;
        return x >= obj.x - margin && x <= obj.x + textWidth + margin &&
               y >= obj.y - margin && y <= obj.y + textHeight + margin;

      case 'image':
        return x >= obj.x - margin && x <= obj.x + obj.width + margin &&
               y >= obj.y - margin && y <= obj.y + obj.height + margin;

      case 'connector': {
        const connFrom = this.objects.find(o => o.id === obj.fromId);
        const connTo = this.objects.find(o => o.id === obj.toId);
        if (!connFrom || !connTo) return false;

        const fromBounds = this.getObjectBounds(connFrom);
        const toBounds = this.getObjectBounds(connTo);
        const anchors = this.calculateConnectorAnchors(fromBounds, toBounds);

        return this.pointToLineDistance(x, y, anchors.from.x, anchors.from.y, anchors.to.x, anchors.to.y) < margin;
      }

      default:
        return false;
    }
  }

  pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = lenSq !== 0 ? dot / lenSq : -1;

    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }

    return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
  }

  selectAll() {
    this.selectedObjects = [...this.objects];
    this.updateStatus();
    this.render();
  }

  deselectAll() {
    this.selectedObjects = [];
    this.updateStatus();
    this.render();
  }

  deleteSelected() {
    if (this.selectedObjects.length === 0) return;

    const deletedIds = this.selectedObjects.map(obj => obj.id);
    this.objects = this.objects.filter(obj => !this.selectedObjects.includes(obj));
    this.objects = this.objects.filter(obj => {
      if (obj.type === 'connector') {
        return !deletedIds.includes(obj.fromId) && !deletedIds.includes(obj.toId);
      }
      return true;
    });

    this.selectedObjects = [];
    this.saveState();
    this.updateStatus();
    this.render();
  }

  updateSelectedObjects(property, value) {
    this.selectedObjects.forEach(obj => {
      obj[property] = value;
    });
    if (this.selectedObjects.length > 0) {
      this.saveState();
    }
    this.render();
  }

  // Object management
  addObject(obj) {
    obj.id = ++this.objectIdCounter;
    this.objects.push(obj);
    this.saveState();
    this.updateStatus();
  }

  // Text tool
  showTextInput(screenX, screenY, canvasX, canvasY) {
    const textInput = document.getElementById('canvasTextInput');

    textInput.style.display = 'block';
    textInput.style.left = (screenX) + 'px';
    textInput.style.top = (screenY) + 'px';
    textInput.style.fontSize = (this.fontSize * this.scale) + 'px';
    textInput.style.color = this.strokeColor;
    textInput.value = '';
    textInput.dataset.canvasX = canvasX;
    textInput.dataset.canvasY = canvasY;
    this.editingTextObject = null;

    setTimeout(() => textInput.focus(), 10);
  }

  editTextObject(obj, screenX, screenY) {
    const textInput = document.getElementById('canvasTextInput');
    const screenPos = this.canvasToScreen(obj.x, obj.y);

    textInput.style.display = 'block';
    textInput.style.left = screenPos.x + 'px';
    textInput.style.top = screenPos.y + 'px';
    textInput.style.fontSize = (obj.fontSize * this.scale) + 'px';
    textInput.style.color = obj.strokeColor;
    textInput.value = obj.text;
    textInput.dataset.canvasX = obj.x;
    textInput.dataset.canvasY = obj.y;
    textInput.classList.add('editing-existing');

    this.editingTextObject = obj;
    this.render();

    setTimeout(() => {
      textInput.focus();
      textInput.selectionStart = textInput.selectionEnd = textInput.value.length;
    }, 10);
  }

  finalizeText() {
    const textInput = document.getElementById('canvasTextInput');
    const text = textInput.value.trim();

    if (this.editingTextObject) {
      if (text) {
        this.editingTextObject.text = text;
        this.saveState();
      } else {
        this.objects = this.objects.filter(obj => obj !== this.editingTextObject);
        this.selectedObjects = this.selectedObjects.filter(obj => obj !== this.editingTextObject);
        this.saveState();
      }
      this.editingTextObject = null;
      this.render();
    } else if (text) {
      this.addObject({
        type: 'text',
        x: parseFloat(textInput.dataset.canvasX),
        y: parseFloat(textInput.dataset.canvasY),
        text: text,
        fontSize: this.fontSize,
        strokeColor: this.strokeColor,
        opacity: this.opacity
      });
      this.render();
    }

    textInput.style.display = 'none';
    textInput.value = '';
    textInput.classList.remove('editing-existing');
  }

  // Connector tool
  handleConnectDown(x, y) {
    const sourceObj = this.findObjectAt(x, y);
    if (sourceObj && sourceObj.type !== 'connector') {
      this.connectingFrom = sourceObj;
      this.connectingPreview = { x, y };
    }
  }

  handleConnectUp(x, y) {
    if (!this.connectingFrom) return;

    const targetObj = this.findObjectAt(x, y);

    if (targetObj && targetObj !== this.connectingFrom && targetObj.type !== 'connector') {
      this.addObject({
        type: 'connector',
        fromId: this.connectingFrom.id,
        toId: targetObj.id,
        strokeColor: this.strokeColor,
        strokeWidth: this.strokeWidth,
        opacity: this.opacity
      });
    }

    this.connectingFrom = null;
    this.connectingPreview = null;
    this.render();
  }

  drawConnectorPreview(toX, toY) {
    if (!this.connectingFrom) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    const fromBounds = this.getObjectBounds(this.connectingFrom);
    const anchors = this.calculateConnectorAnchors(fromBounds, { x: toX, y: toY, width: 0, height: 0 });

    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([5, 5]);

    this.drawArrowLine(ctx, anchors.from.x, anchors.from.y, toX, toY);

    ctx.restore();
  }

  calculateConnectorAnchors(fromBounds, toBounds) {
    const fromCenter = {
      x: fromBounds.x + fromBounds.width / 2,
      y: fromBounds.y + fromBounds.height / 2
    };
    const toCenter = {
      x: toBounds.x + toBounds.width / 2,
      y: toBounds.y + toBounds.height / 2
    };

    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;

    let fromAnchor, toAnchor;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        fromAnchor = { x: fromBounds.x + fromBounds.width, y: fromCenter.y };
        toAnchor = { x: toBounds.x, y: toCenter.y };
      } else {
        fromAnchor = { x: fromBounds.x, y: fromCenter.y };
        toAnchor = { x: toBounds.x + toBounds.width, y: toCenter.y };
      }
    } else {
      if (dy > 0) {
        fromAnchor = { x: fromCenter.x, y: fromBounds.y + fromBounds.height };
        toAnchor = { x: toCenter.x, y: toBounds.y };
      } else {
        fromAnchor = { x: fromCenter.x, y: fromBounds.y };
        toAnchor = { x: toCenter.x, y: toBounds.y + toBounds.height };
      }
    }

    return { from: fromAnchor, to: toAnchor };
  }

  drawArrowLine(ctx, x1, y1, x2, y2) {
    const headLength = 12;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  // Image handling
  handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.app.showConfirmModal(
        'IMAGE TOO LARGE',
        'Image exceeds maximum size of 10MB. Please choose a smaller image.',
        () => {}
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      this.loadImage(event.target.result);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  }

  loadImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
      const centerX = (this.canvas.width / 2 - this.offsetX) / this.scale;
      const centerY = (this.canvas.height / 2 - this.offsetY) / this.scale;

      let width = img.width;
      let height = img.height;
      const maxSize = 400;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width *= ratio;
        height *= ratio;
      }

      this.addObject({
        type: 'image',
        x: centerX - width / 2,
        y: centerY - height / 2,
        width: width,
        height: height,
        src: dataUrl,
        imageElement: img,
        opacity: this.opacity
      });

      this.render();
    };
    img.src = dataUrl;
  }

  // Rendering
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.objects.forEach(obj => this.drawObject(obj));
    this.selectedObjects.forEach(obj => this.drawSelectionIndicator(obj));

    ctx.restore();
  }

  drawObject(obj) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = (obj.opacity || 100) / 100;

    switch (obj.type) {
      case 'path': this.drawPath(obj); break;
      case 'line': this.drawLine(obj); break;
      case 'rect': this.drawRect(obj); break;
      case 'ellipse': this.drawEllipse(obj); break;
      case 'text': this.drawText(obj); break;
      case 'image': this.drawImage(obj); break;
      case 'connector': this.drawConnector(obj); break;
    }

    ctx.restore();
  }

  drawPath(obj) {
    const ctx = this.ctx;
    if (obj.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(obj.points[0].x, obj.points[0].y);

    for (let i = 1; i < obj.points.length; i++) {
      ctx.lineTo(obj.points[i].x, obj.points[i].y);
    }

    ctx.strokeStyle = obj.strokeColor;
    ctx.lineWidth = obj.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  drawLine(obj) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(obj.x, obj.y);
    ctx.lineTo(obj.x2, obj.y2);
    ctx.strokeStyle = obj.strokeColor;
    ctx.lineWidth = obj.strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  drawRect(obj) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.rect(obj.x, obj.y, obj.width, obj.height);

    if (obj.fillEnabled) {
      ctx.fillStyle = obj.fillColor;
      ctx.fill();
    }

    ctx.strokeStyle = obj.strokeColor;
    ctx.lineWidth = obj.strokeWidth;
    ctx.stroke();
  }

  drawEllipse(obj) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.ellipse(obj.x, obj.y, obj.radiusX, obj.radiusY, 0, 0, Math.PI * 2);

    if (obj.fillEnabled) {
      ctx.fillStyle = obj.fillColor;
      ctx.fill();
    }

    ctx.strokeStyle = obj.strokeColor;
    ctx.lineWidth = obj.strokeWidth;
    ctx.stroke();
  }

  drawText(obj) {
    if (this.editingTextObject === obj) return;

    const ctx = this.ctx;
    ctx.font = `${obj.fontSize}px 'Share Tech Mono', monospace`;
    ctx.fillStyle = obj.strokeColor;
    ctx.textBaseline = 'top';

    ctx.shadowColor = obj.strokeColor;
    ctx.shadowBlur = 4;

    const lines = obj.text.split('\n');
    const lineHeight = obj.fontSize * 1.2;
    lines.forEach((line, index) => {
      ctx.fillText(line, obj.x, obj.y + index * lineHeight);
    });

    ctx.shadowBlur = 0;
  }

  drawImage(obj) {
    const ctx = this.ctx;
    if (obj.imageElement) {
      ctx.drawImage(obj.imageElement, obj.x, obj.y, obj.width, obj.height);
    }
  }

  drawConnector(obj) {
    const fromObj = this.objects.find(o => o.id === obj.fromId);
    const toObj = this.objects.find(o => o.id === obj.toId);

    if (!fromObj || !toObj) return;

    const ctx = this.ctx;
    const fromBounds = this.getObjectBounds(fromObj);
    const toBounds = this.getObjectBounds(toObj);
    const anchors = this.calculateConnectorAnchors(fromBounds, toBounds);

    ctx.strokeStyle = obj.strokeColor;
    ctx.lineWidth = obj.strokeWidth;
    ctx.lineCap = 'round';

    this.drawArrowLine(ctx, anchors.from.x, anchors.from.y, anchors.to.x, anchors.to.y);
  }

  drawSelectionIndicator(obj) {
    if (this.editingTextObject === obj) return;

    const ctx = this.ctx;
    ctx.save();

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2 / this.scale;
    ctx.setLineDash([5 / this.scale, 5 / this.scale]);

    const bounds = this.getObjectBounds(obj);
    const padding = 5 / this.scale;

    ctx.strokeRect(bounds.x - padding, bounds.y - padding, bounds.width + padding * 2, bounds.height + padding * 2);

    ctx.setLineDash([]);
    ctx.fillStyle = '#00ff9d';
    const handleSize = 8 / this.scale;

    const handles = [
      { x: bounds.x - padding, y: bounds.y - padding },
      { x: bounds.x + bounds.width + padding, y: bounds.y - padding },
      { x: bounds.x - padding, y: bounds.y + bounds.height + padding },
      { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding }
    ];

    handles.forEach(h => {
      ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    });

    ctx.restore();
  }

  getObjectBounds(obj) {
    switch (obj.type) {
      case 'rect':
        return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };

      case 'ellipse':
        return { x: obj.x - obj.radiusX, y: obj.y - obj.radiusY, width: obj.radiusX * 2, height: obj.radiusY * 2 };

      case 'line':
        return { x: Math.min(obj.x, obj.x2), y: Math.min(obj.y, obj.y2), width: Math.abs(obj.x2 - obj.x), height: Math.abs(obj.y2 - obj.y) };

      case 'path':
        if (obj.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        obj.points.forEach(p => {
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

      case 'text':
        const textLines = obj.text.split('\n');
        const maxLen = Math.max(...textLines.map(l => l.length));
        const tWidth = maxLen * obj.fontSize * 0.6;
        const tHeight = textLines.length * obj.fontSize * 1.2;
        return { x: obj.x, y: obj.y, width: tWidth, height: tHeight };

      case 'image':
        return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };

      case 'connector': {
        const connFromObj = this.objects.find(o => o.id === obj.fromId);
        const connToObj = this.objects.find(o => o.id === obj.toId);
        if (!connFromObj || !connToObj) return { x: 0, y: 0, width: 0, height: 0 };

        const connFromBounds = this.getObjectBounds(connFromObj);
        const connToBounds = this.getObjectBounds(connToObj);
        const connAnchors = this.calculateConnectorAnchors(connFromBounds, connToBounds);

        const connMinX = Math.min(connAnchors.from.x, connAnchors.to.x);
        const connMinY = Math.min(connAnchors.from.y, connAnchors.to.y);
        const connMaxX = Math.max(connAnchors.from.x, connAnchors.to.x);
        const connMaxY = Math.max(connAnchors.from.y, connAnchors.to.y);

        return { x: connMinX, y: connMinY, width: connMaxX - connMinX || 10, height: connMaxY - connMinY || 10 };
      }

      default:
        return { x: obj.x || 0, y: obj.y || 0, width: 100, height: 100 };
    }
  }

  drawPreview(x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.setLineDash([5, 5]);
    ctx.globalAlpha = 0.6;

    switch (this.currentTool) {
      case 'draw':
        if (this.currentPath.length > 1) {
          ctx.beginPath();
          ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
          for (let i = 1; i < this.currentPath.length; i++) {
            ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
          }
          ctx.stroke();
        }
        break;

      case 'line':
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(x, y);
        ctx.stroke();
        break;

      case 'rect':
        ctx.strokeRect(this.startX, this.startY, x - this.startX, y - this.startY);
        break;

      case 'ellipse':
        const rx = Math.abs(x - this.startX) / 2;
        const ry = Math.abs(y - this.startY) / 2;
        const cx = this.startX + (x - this.startX) / 2;
        const cy = this.startY + (y - this.startY) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  // Zoom
  zoom(factor) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const newScale = Math.min(Math.max(this.scale * factor, this.minScale), this.maxScale);
    const scaleDiff = newScale / this.scale;

    this.offsetX = centerX - (centerX - this.offsetX) * scaleDiff;
    this.offsetY = centerY - (centerY - this.offsetY) * scaleDiff;
    this.scale = newScale;

    this.updateZoomDisplay();
    this.render();
  }

  resetZoom() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.updateZoomDisplay();
    this.render();
  }

  updateZoomDisplay() {
    document.getElementById('canvasZoomLevel').textContent = Math.round(this.scale * 100) + '%';
  }

  // Fullscreen
  toggleFullscreen() {
    const canvasView = document.getElementById('canvasView');
    const expandIcon = document.querySelector('.fullscreen-icon.expand');
    const collapseIcon = document.querySelector('.fullscreen-icon.collapse');

    canvasView.classList.toggle('fullscreen');
    const isFullscreen = canvasView.classList.contains('fullscreen');

    // Toggle icons
    expandIcon.classList.toggle('hidden', isFullscreen);
    collapseIcon.classList.toggle('hidden', !isFullscreen);

    // Resize canvas after toggle
    setTimeout(() => {
      this.resizeCanvas();
      this.render();
    }, 50);
  }

  // History (Undo/Redo)
  saveState() {
    this.history = this.history.slice(0, this.historyIndex + 1);

    const state = this.objects.map(obj => {
      const clone = { ...obj };
      if (clone.type === 'image') delete clone.imageElement;
      if (clone.type === 'path') clone.points = [...obj.points];
      return clone;
    });

    this.history.push(JSON.stringify(state));
    this.historyIndex++;

    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.historyIndex--;
    }

    // Save to page
    this.app.saveCanvasData();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreState();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreState();
    }
  }

  restoreState() {
    const state = JSON.parse(this.history[this.historyIndex]);

    this.objects = state.map(obj => {
      if (obj.type === 'image' && obj.src) {
        const img = new Image();
        img.src = obj.src;
        obj.imageElement = img;
      }
      return obj;
    });

    this.selectedObjects = [];
    this.updateStatus();
    this.render();

    // Save to page
    this.app.saveCanvasData();
  }

  clearAll() {
    if (this.objects.length === 0) return;

    this.app.showConfirmModal(
      'CLEAR CANVAS',
      `Clear all ${this.objects.length} objects from canvas?`,
      () => {
        this.objects = [];
        this.selectedObjects = [];
        this.saveState();
        this.updateStatus();
        this.render();
      }
    );
  }

  // UI Updates
  updateStatus() {
    document.getElementById('canvasStatusTool').textContent = `TOOL: ${this.currentTool.toUpperCase()}`;
    document.getElementById('canvasStatusObjects').textContent = `OBJECTS: ${this.objects.length}`;
    document.getElementById('canvasStatusSelected').textContent = `SELECTED: ${this.selectedObjects.length}`;
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new HackNote();
});
