#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const port = '4173';
const url = `http://127.0.0.1:${port}/`;
let browserOpened = false;

function openBrowser() {
  const commands = {
    darwin: { command: 'open', args: [url] },
    win32: { command: 'cmd', args: ['/c', 'start', '', url] },
    linux: { command: 'xdg-open', args: [url] }
  };
  const openerConfig = commands[process.platform];
  if (!openerConfig) return;

  const opener = spawn(openerConfig.command, openerConfig.args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  opener.on('error', () => {});
  opener.unref();
}

const server = spawn(
  process.execPath,
  [viteBin, '--host', '127.0.0.1', '--port', port, '--strictPort'],
  {
    cwd: projectRoot,
    stdio: ['inherit', 'pipe', 'pipe']
  }
);

function printAndOpen(data, stream) {
  const output = data.toString();
  stream.write(output);
  if (!browserOpened && output.includes('Local:')) {
    browserOpened = true;
    openBrowser();
  }
}

server.stdout.on('data', (data) => printAndOpen(data, process.stdout));
server.stderr.on('data', (data) => printAndOpen(data, process.stderr));

server.on('error', (error) => {
  console.error(`No se pudo iniciar Tablero Interno: ${error.message}`);
  process.exitCode = 1;
});

server.on('exit', (code, signal) => {
  if (signal) return;
  process.exitCode = code ?? 0;
});

function stop() {
  if (!server.killed) server.kill('SIGINT');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
