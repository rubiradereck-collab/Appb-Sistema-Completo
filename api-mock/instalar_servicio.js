const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'APPB API Node Server',
  description: 'Servidor Backend de Node.js para la aplicacin mvil APPB',
  script: path.join(__dirname, 'index.js'),
  env: [{
    name: "NODE_ENV",
    value: "production"
  }]
});

svc.on('install', function() {
  console.log('Servicio instalado correctamente. Iniciando en segundo plano...');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('El servicio ya estaba instalado.');
});

svc.on('start', function() {
  console.log('Servicio APPB iniciado con xito. Ya puedes cerrar esta ventana.');
});

svc.install();
