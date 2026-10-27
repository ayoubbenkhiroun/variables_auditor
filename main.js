const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'Bouygues Telecom - AuditFlow Pro',
    icon: path.join(__dirname, 'img', 'app_icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true
    },
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Interdire la navigation vers des URLs externes non souhaitées dans la fenêtre principale
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      if (parsed.protocol === 'file:') return; // Autoriser la navigation locale
    } catch (e) { }
    event.preventDefault();
    if (navigationUrl.startsWith('http:') || navigationUrl.startsWith('https:')) {
      shell.openExternal(navigationUrl);
    }
  });

  // Ouvrir les liens externes dans le navigateur par défaut en refusant strictement toute autre création de fenêtre
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Refuser toutes les demandes de permissions matérielles/sensibles non nécessaires
  if (mainWindow.webContents.session) {
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(false);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Empêcher l'attachement non sollicité de balises webview
app.on('web-contents-created', (event, contents) => {
  contents.on('will-attach-webview', (webviewEvent) => {
    webviewEvent.preventDefault();
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
