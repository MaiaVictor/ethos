// map r :w!<cr>:!clear; npm run build; npm start<cr>

const electron = require('electron');
const app = electron.app; // Module to control application life.
const BrowserWindow = electron.BrowserWindow; // Module to create native browser window.

const path = require('path')
const url = require('url')
const EthNode = require("./src/ethNode");
const route = require("./src/route")(true);

let mainWindow, gethProcess;

const createWindow = () => {
  // Create the browser window.
  var mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false
  });

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'app', 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    var mainWindow = null
  })
}

app.on('ready', () => {
  createWindow();
  EthNode.local({binPath: route.ethBin, dataDir: route.ethData, testnet: true})
    .then(process => {
      gethProcess = process;
      console.log("Started Geth.")
    })
    .catch(e => console.log("Couldn't start Geth:", e));
});

app.on('window-all-closed', function () {
  console.log("Closing Geth.");
  EthNode.stopProcess(gethProcess).then(() => {
    console.log("Closed Geth. Quitting...");
    app.quit()
  });
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
});
