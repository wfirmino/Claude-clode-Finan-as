const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'FinanceApp',
  })

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  win.webContents.on('will-navigate', (event, url) => {
    // In production all content is served from file:// — the empty array is intentional;
    // the file:// check below is the actual production guard
    const allowedOrigins = isDev ? ['http://localhost:5173'] : []
    try {
      const { origin } = new URL(url)
      if (!allowedOrigins.includes(origin) && !url.startsWith('file://')) {
        event.preventDefault()
      }
    } catch {
      event.preventDefault()
    }
  })

  Menu.setApplicationMenu(null)

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
