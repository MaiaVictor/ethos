const os = require("os");
const spawn = require("child_process").spawn;
const files = require("swarm-js/src/files");

const archives = {
  "darwin-amd64": {
    "archive": "geth-darwin-amd64-1.6.0",
    "binaryMD5": "93c8e1812a8389ae3f626aaaa9c96ecc",
    "archiveMD5": "7358d5174e3975b1c60f225ca559f6b4",
    "archiveSize": 6901512
  }
}

// String -> Promise String
//   Downloads the Ethereum Node binaries.
//   Returns a promise with the binary path.
const downloadBinary = binPath => {
  var downloadUrl = "http://maiavictor.com/";
  var system = os.platform().replace("win32", "windows") + "-" + (os.arch() === "x64" ? "amd64" : "386");
  var archive = archives[system];
  var archiveUrl = downloadUrl + archive.archive + ".tar.gz";
  var archiveMD5 = archive.archiveMD5;
  var binaryMD5 = archive.binaryMD5;
  return files.safeDownloadArchived(archiveUrl)(archiveMD5)(binaryMD5)(binPath);
};

// EthNodeOpts -> Promise Process
//   Starts the Ethereum Node process.
const startProcess = options => new Promise((resolve, reject) => {
  const process = spawn(options.binPath, [].concat.call(
    options.testnet ? ["--testnet"] : [],
    options.dataDir ? ["--datadir",options.dataDir] : []));
  const timeout = setTimeout(reject, 12000);
  const onData = data => {
    const line = data.toString();
    if (/IPC endpoint opened/.test(line)) {
      resolve(process);
      clearTimeout(timeout);
    }
  }
  process.stdout.on('data', onData);
  process.stderr.on('data', onData);
});

// Process ~> Promise ()
//   Stops the Swarm process.
const stopProcess = process => {
  return new Promise((resolve, reject) => {
    process.stderr.removeAllListeners('data');
    process.stdout.removeAllListeners('data');
    process.stdin.removeAllListeners('error');
    process.removeAllListeners('error');
    process.removeAllListeners('exit');
    process.kill('SIGINT');
    var killTimeout = setTimeout(() => process.kill('SIGKILL'), 8000);
    process.once('close', () => {
      clearTimeout(killTimeout);
      resolve();
    });
  });
};

// EthNodeOpts -> Promise Process
//   Downloads binaries and starts the Ethereum node Process.
const local = options =>
  downloadBinary(options.binPath)
    .then(() => startProcess(options));

module.exports = {
  local,
  downloadBinary,
  startProcess,
  stopProcess
}
