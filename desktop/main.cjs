const { app, BrowserWindow, dialog } = require('electron')

const devServerUrl = 'http://localhost:5173'
const devServerOrigin = new URL(devServerUrl).origin
let mainWindow

const isFirebaseAuthPopup = (url) => {
  try {
    const destination = new URL(url)
    return (
      destination.protocol === 'https:' &&
      destination.pathname.startsWith('/__/auth/') &&
      (destination.hostname.endsWith('.firebaseapp.com') ||
        destination.hostname.endsWith('.web.app'))
    )
  } catch {
    return false
  }
}

const waitForDevServer = async () => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(devServerUrl, { signal: AbortSignal.timeout(1000) })
      if (response.ok) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
      continue
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`The Antral UI did not start at ${devServerUrl}.`)
}

const createWindow = async () => {
  await waitForDevServer()
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 800,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isFirebaseAuthPopup(url)) return { action: 'deny' }
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      },
    }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== devServerOrigin) event.preventDefault()
  })
  mainWindow.webContents.on('did-create-window', (popup) => {
    popup.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    popup.webContents.on('will-navigate', (event, url) => {
      if (new URL(url).protocol !== 'https:') event.preventDefault()
    })
  })
  mainWindow.once('ready-to-show', () => mainWindow.show())
  await mainWindow.loadURL(devServerUrl)
}

app.whenReady().then(async () => {
  try {
    await createWindow()
  } catch (error) {
    dialog.showErrorBox('Unable to launch Antral', error.message)
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) => {
      dialog.showErrorBox('Unable to launch Antral', error.message)
      app.quit()
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
