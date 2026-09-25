const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'APPB API Node Server',
  script: path.join(__dirname, 'index.js')
});

svc.on('uninstall', function() {
  console.log('Servicio desinstalado correctamente. Ya no se iniciar con Windows.');
  console.log('El servicio existe: ', svc.exists);
});

svc.uninstall();
