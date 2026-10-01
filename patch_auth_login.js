const fs = require('fs');
let content = fs.readFileSync('pwa-client/src/AuthContext.jsx', 'utf8');
content = content.replace(/const login = async \([\s\S]*?return false;\s*\}/, `const login = async (username, password) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('appb_user', JSON.stringify(res.data.user));
        localStorage.setItem('appb_token', res.data.token);
        return { success: true };
      }
      return { success: false, message: 'Credenciales incorrectas' };
    } catch (error) {
      console.error('Error logging in', error);
      const msg = error.response?.data?.message || 'Servidor no disponible';
      return { success: false, message: msg };
    }`);
fs.writeFileSync('pwa-client/src/AuthContext.jsx', content, 'utf8');

let loginCode = fs.readFileSync('pwa-client/src/pages/Login.jsx', 'utf8');
loginCode = loginCode.replace(/const success = await login\(username, password\);\s*setLoading\(false\);\s*if \(success\) navigate\('\/'\);\s*else setErrorMsg\('Credenciales incorrectas'\);/, `const result = await login(username, password);
    setLoading(false);
    if (result.success) navigate('/');
    else setErrorMsg(result.message);`);

// also fix handleForgotPassword error handling
loginCode = loginCode.replace(/catch \(error\) \{\s*setForgotLoading\(false\);\s*setForgotMsg\(\{ text: 'Error al solicitar recuperaci\\u00f3n', type: 'error' \}\);\s*\}/, `catch (error) {
      setForgotLoading(false);
      const msg = error.response?.data?.message || 'Error al solicitar recuperación';
      setForgotMsg({ text: msg, type: 'error' });
    }`);

fs.writeFileSync('pwa-client/src/pages/Login.jsx', loginCode, 'utf8');
