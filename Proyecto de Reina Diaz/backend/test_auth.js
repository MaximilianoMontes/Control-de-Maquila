const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/inventario', {
      modelo: 'test-' + Date.now(),
      color: '[]',
      piezas_en_proceso: 5
    });
    console.log('Success without token:', res.data);
  } catch (e) {
    console.log('Fails as expected without token:', e.response?.status, e.response?.data);
  }
}

test();
